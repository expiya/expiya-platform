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
    <section aria-labelledby="secretary-title" className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[.3em] text-emerald-700">Expiya Sekreter</p>
      <h1 id="secretary-title" className="mt-5 text-4xl font-semibold tracking-[-.045em] sm:text-6xl">Ne seçmek istiyorsunuz?</h1>
      <p aria-live="polite" className="mx-auto mt-5 min-h-14 max-w-xl text-base leading-7 text-stone-600 sm:text-lg">{reply}</p>
      <form onSubmit={submit} className="mt-7 flex items-end gap-2 rounded-[1.75rem] border border-stone-200 bg-white p-2 shadow-[0_18px_60px_rgba(28,25,23,.08)] focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-100">
        <label className="sr-only" htmlFor="secretary-message">Ne seçmek istediğinizi anlatın</label>
        <textarea id="secretary-message" rows={1} maxLength={1000} value={draft} disabled={loading} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Örn. Ailem için güvenli bir otomobil arıyorum…" className="min-h-14 flex-1 resize-none bg-transparent px-4 py-4 text-left text-[15px] leading-6 outline-none placeholder:text-stone-400 disabled:opacity-60" />
        <button type="submit" disabled={loading || !draft.trim()} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-stone-950 text-xl text-white transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-35" aria-label="Mesajı gönder">↑</button>
      </form>
    </section>
  );
}
