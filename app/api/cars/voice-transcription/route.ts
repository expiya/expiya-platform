import { z } from "zod";

import { getOpenAIClient } from "@/lib/openai";
import { enforceRateLimit, verifySameOrigin } from "@/lib/security/requestSecurity";

const MAX_AUDIO_BYTES = 6 * 1024 * 1024;
const allowedAudioTypes = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-m4a",
]);

const transcriptSchema = z.string().trim().min(1).max(4_000);

async function hasExpectedAudioSignature(file: File, type: string): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const ascii = String.fromCharCode(...bytes);
  if (type === "audio/webm") return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
  if (type === "audio/ogg") return ascii.startsWith("OggS");
  if (type === "audio/mp4" || type === "audio/x-m4a") return ascii.slice(4, 8) === "ftyp";
  if (type === "audio/wav") return ascii.startsWith("RIFF") && ascii.slice(8, 12) === "WAVE";
  if (type === "audio/mpeg") return ascii.startsWith("ID3") || bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;
  return false;
}

export async function POST(request: Request): Promise<Response> {
  const originRejected = verifySameOrigin(request);
  if (originRejected) return originRejected;
  const limited = await enforceRateLimit(request, { scope: "cars-first-voice-message", limit: 5, windowMs: 10 * 60_000 });
  if (limited) return limited;

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > MAX_AUDIO_BYTES + 100_000) return safeError("Ses kaydı çok büyük.", 413);

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("multipart/form-data;")) return safeError("Geçersiz ses isteği.", 415);
    const form = await request.formData();
    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size < 500 || audio.size > MAX_AUDIO_BYTES) return safeError("Ses kaydı boş veya çok büyük.", 400);
    const normalizedType = audio.type.split(";")[0]?.toLowerCase();
    if (!normalizedType || !allowedAudioTypes.has(normalizedType)) return safeError("Bu ses biçimi desteklenmiyor.", 415);
    if (!await hasExpectedAudioSignature(audio, normalizedType)) return safeError("Ses dosyasının içeriği doğrulanamadı.", 415);

    const result = await getOpenAIClient().audio.transcriptions.create({
      file: audio,
      model: process.env.OPENAI_CARS_TRANSCRIPTION_MODEL?.trim() || "gpt-4o-mini-transcribe",
      language: "tr",
      prompt: "Türkiye Türkçesiyle konuşulan bir otomobil ihtiyacı mesajıdır. Marka, model, donanım, yakıt türü, gövde tipi, bütçe, sayı, para birimi ve Türkçe özel adları doğru yaz.",
      response_format: "json",
    }, { signal: request.signal, timeout: 30_000 });
    const text = transcriptSchema.parse(result.text.normalize("NFKC").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/gu, ""));
    return Response.json({ text }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return safeError("Ses şu anda metne çevrilemedi. Lütfen yeniden deneyin veya mesajınızı yazın.", 503);
  }
}

function safeError(message: string, status: number): Response {
  return Response.json({ message }, { status, headers: { "Cache-Control": "no-store" } });
}
