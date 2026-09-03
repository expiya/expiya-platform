"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { saveSecretaryPendingMessage } from "@/features/platform/secretaryClientHandoff";

interface SecretaryResponse {
  readonly kind?: "ROUTE" | "CLARIFY" | "UNSUPPORTED" | "NON_DECISION" | "MULTI_INTENT";
  readonly message: string;
  readonly destination?: string;
}

export function UpperSecretary() {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState("Merhaba, hoş geldiniz. Ne seçmek istediğinizi anlatabilirsiniz.");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || loading) return;
    setLoading(true);
    setReply("Sizi doğru bölüme yönlendiriyorum…");
    try {
      const response = await fetch("/api/platform/secretary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      const payload = await response.json() as SecretaryResponse;
      if (!response.ok) throw new Error(payload.message);
      setReply(payload.message);
      setDraft("");
      if (payload.kind === "ROUTE" && payload.destination) {
        saveSecretaryPendingMessage(sessionStorage, message);
        window.setTimeout(() => router.push(payload.destination!), 450);
        return;
      }
    } catch (error) {
      setReply(error instanceof Error ? error.message : "Şu anda yardımcı olamıyorum. Lütfen yeniden deneyin.");
    }
    setLoading(false);
  }

  return (
    <section aria-labelledby="secretary-title" className="mx-auto w-full max-w-3xl text-center">
      <h1 id="secretary-title" className="text-4xl font-semibold tracking-[-.055em] sm:text-6xl">Ne satın almak istiyorsunuz?</h1>
      <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-neutral-500">İhtiyacınızı anlatın. Expiya Sekreter sizi doğru satın alma departmanına aktarsın.</p>
      <p aria-live="polite" className="mx-auto mt-7 min-h-7 max-w-xl text-sm leading-6 text-neutral-600">{reply}</p>
      <form onSubmit={submit} className="mt-4 flex items-end gap-2 rounded-[1.75rem] border border-neutral-200 bg-white p-2.5 shadow-[0_12px_45px_rgba(0,0,0,.09)] transition focus-within:border-neutral-400 focus-within:shadow-[0_16px_55px_rgba(0,0,0,.12)]">
        <label className="sr-only" htmlFor="secretary-message">Ne seçmek istediğinizi anlatın</label>
        <textarea id="secretary-message" rows={1} maxLength={1000} value={draft} disabled={loading} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Satın almak istediğiniz şeyi ve ihtiyacınızı yazın" className="min-h-14 flex-1 resize-none bg-transparent px-4 py-4 text-left text-base leading-6 outline-none placeholder:text-neutral-400 disabled:opacity-60" />
        <button type="submit" disabled={loading || !draft.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-lg text-white transition hover:bg-neutral-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:bg-neutral-300" aria-label="Mesajı gönder">↑</button>
      </form>
      <p className="mt-3 text-[11px] text-neutral-400">Expiya kararınızı sizin yerinize vermez; ihtiyacınıza uygun seçenekleri değerlendirmenize yardımcı olur.</p>
    </section>
  );
}
