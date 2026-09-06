"use client";

import { useEffect, useRef, useState } from "react";

const MAX_RECORDING_MS = 60_000;

type RecordingState = "idle" | "recording" | "transcribing";

export function FirstMessageVoiceInput({
  disabled,
  onTranscript,
}: {
  readonly disabled?: boolean;
  readonly onTranscript: (text: string) => void;
}) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startedAtRef = useRef(0);
  const [recordingState, setRecordingState] = useState<RecordingState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string>();

  function releaseMedia() {
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  useEffect(() => () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    releaseMedia();
  }, []);

  async function transcribe(blob: Blob) {
    setRecordingState("transcribing");
    setError(undefined);
    try {
      const extension = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
      const body = new FormData();
      body.append("audio", blob, `ilk-mesaj.${extension}`);
      const response = await fetch("/api/cars/voice-transcription", { method: "POST", body });
      const payload = await response.json() as { text?: string; message?: string };
      if (!response.ok || !payload.text) throw new Error(payload.message ?? "Ses metne çevrilemedi.");
      onTranscript(payload.text);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Ses metne çevrilemedi. Lütfen yeniden deneyin.");
    } finally {
      setRecordingState("idle");
    }
  }

  async function startRecording() {
    setError(undefined);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Bu tarayıcı ses kaydını desteklemiyor. Mesajınızı klavyeyle yazabilirsiniz.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;
      const preferredType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"].find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, preferredType ? { mimeType: preferredType } : undefined);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        releaseMedia();
        if (blob.size < 500) { setRecordingState("idle"); setError("Ses duyulamadı. Lütfen yeniden deneyin."); return; }
        void transcribe(blob);
      };
      recorder.start(250);
      startedAtRef.current = Date.now();
      setElapsedSeconds(0);
      setRecordingState("recording");
      timerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - startedAtRef.current;
        setElapsedSeconds(Math.min(60, Math.floor(elapsed / 1_000)));
        if (elapsed >= MAX_RECORDING_MS && recorder.state === "recording") recorder.stop();
      }, 250);
    } catch {
      releaseMedia();
      setRecordingState("idle");
      setError("Mikrofona erişilemedi. Tarayıcı iznini kontrol edin veya mesajınızı yazın.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  const busy = recordingState !== "idle";
  return (
    <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-left dark:border-emerald-900 dark:bg-emerald-950/30">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={disabled || recordingState === "transcribing"}
          onClick={recordingState === "recording" ? stopRecording : () => void startRecording()}
          className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold text-white shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 ${recordingState === "recording" ? "bg-rose-600 hover:bg-rose-500" : "bg-emerald-700 hover:bg-emerald-600"}`}
          aria-label={recordingState === "recording" ? "Ses kaydını bitir" : "İlk mesajı sesli anlat"}
        >
          <span aria-hidden="true">{recordingState === "recording" ? "■" : "●"}</span>
          {recordingState === "recording" ? "Kaydı bitir" : recordingState === "transcribing" ? "Türkçe metne çevriliyor…" : "İlk mesajını sesli anlat"}
        </button>
        <p className="min-w-0 flex-1 text-xs leading-5 text-stone-600 dark:text-stone-300">
          {recordingState === "recording" ? `Dinliyorum · ${elapsedSeconds}/60 saniye` : "En fazla 60 saniye konuş. Metni kontrol edip düzenledikten sonra sen gönderirsin."}
        </p>
      </div>
      {busy && <p role="status" aria-live="polite" className="mt-2 text-xs font-medium text-emerald-800 dark:text-emerald-300">{recordingState === "recording" ? "Ses kaydediliyor…" : "Ses kaydı Türkçe olarak çözümleniyor…"}</p>}
      {error && <p role="alert" className="mt-2 text-xs leading-5 text-rose-700 dark:text-rose-300">{error}</p>}
      <p className="mt-2 text-[11px] leading-4 text-stone-500 dark:text-stone-400">Ses yalnızca yazıya çevrilir; Expiya ses dosyasını kalıcı olarak saklamaz. Mikrofon kullanmak istemezsen mesajını yazabilirsin.</p>
    </div>
  );
}
