"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveSecretaryPendingMessage } from "@/features/platform/secretaryClientHandoff";
import type { SecretaryResultKind } from "@/features/platform/upperSecretary";
import type { SecretaryRouteChoice } from "@/features/platform/secretaryRoutingPack";

interface SecretaryResponse { readonly kind: SecretaryResultKind; readonly message: string; readonly destination?: string; readonly link?: string; readonly choices?: readonly SecretaryRouteChoice[] }
interface PendingRoute { readonly destination: string; readonly originalMessage: string }
export const SECRETARY_NAVIGATION_DELAY_MS = 3_000;
interface SecretarySuggestion { readonly id: string; readonly label: string }

function greetingForHour(hour: number): string { return `${hour < 12 ? "Günaydın" : hour >= 18 ? "İyi akşamlar" : "Merhaba"}, hoş geldiniz. Ne satın almak istediğinizi anlatabilirsiniz.`; }

export function UpperSecretary({ suggestions }: { readonly suggestions: readonly SecretarySuggestion[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [reply, setReply] = useState("Merhaba, hoş geldiniz. Ne satın almak istediğinizi anlatabilirsiniz.");
  const [replyLink, setReplyLink] = useState<string>();
  const [choices, setChoices] = useState<readonly SecretaryRouteChoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [frozen, setFrozen] = useState(false);
  const [clearViolations, setClearViolations] = useState(0);
  const [pendingRoute, setPendingRoute] = useState<PendingRoute>();
  const [remainingSeconds, setRemainingSeconds] = useState(3);
  const [progressStarted, setProgressStarted] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const navigationCommitted = useRef(false);

  useEffect(() => { const timer = window.setTimeout(() => setReply(greetingForHour(new Date().getHours())), 0); return () => window.clearTimeout(timer); }, []);
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;
    const timer = window.setInterval(() => setSuggestionIndex(current => (current + 3) % suggestions.length), 6_000);
    return () => window.clearInterval(timer);
  }, [suggestions.length]);

  useEffect(() => {
    if (!pendingRoute) return;
    const frame = window.requestAnimationFrame(() => setProgressStarted(true));
    const startedAt = Date.now();
    const interval = window.setInterval(() => setRemainingSeconds(Math.max(1, Math.ceil((SECRETARY_NAVIGATION_DELAY_MS - (Date.now() - startedAt)) / 1_000))), 200);
    const timeout = window.setTimeout(() => {
      if (navigationCommitted.current) return;
      navigationCommitted.current = true;
      saveSecretaryPendingMessage(sessionStorage, pendingRoute.originalMessage);
      router.push(pendingRoute.destination);
    }, SECRETARY_NAVIGATION_DELAY_MS);
    return () => { window.cancelAnimationFrame(frame); window.clearInterval(interval); window.clearTimeout(timeout); };
  }, [pendingRoute, router]);

  function cancelNavigation(message = "Yönlendirme durduruldu. Burada devam edebilirsiniz.") { setPendingRoute(undefined); setReply(message); setReplyLink(undefined); }
  function selectChoice(choice: SecretaryRouteChoice) { setPendingRoute(undefined); setChoices([]); setReply(`${choice.label} bölümüne yönlendiriliyorsunuz.`); navigationCommitted.current = false; setRemainingSeconds(3); setProgressStarted(false); setPendingRoute({ destination: choice.destination, originalMessage: choice.label }); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const message = draft.trim(); if (!message || loading || frozen) return;
    if (pendingRoute) setPendingRoute(undefined);
    setLoading(true); setReply("İsteğinizi anlamaya çalışıyorum…"); setReplyLink(undefined); setChoices([]);
    try {
      const response = await fetch("/api/platform/secretary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, priorClearViolations: Math.min(clearViolations, 1) }) });
      const payload = await response.json() as SecretaryResponse;
      if (!response.ok) throw new Error(payload.message);
      setReply(payload.message); setReplyLink(payload.link); setChoices(payload.choices ?? []); setDraft("");
      if (payload.kind === "SAFETY_WARNING") setClearViolations(1);
      if (payload.kind === "SESSION_FROZEN") setFrozen(true);
      if (payload.kind === "PROPOSE_NAVIGATION" && payload.destination) { navigationCommitted.current = false; setRemainingSeconds(3); setProgressStarted(false); setPendingRoute({ destination: payload.destination, originalMessage: message }); }
    } catch (error) { setReply(error instanceof Error ? error.message : "Şu anda yardımcı olamıyorum. Lütfen yeniden deneyin."); }
    finally { setLoading(false); }
  }

  function startNewSession() { setFrozen(false); setClearViolations(0); setDraft(""); setPendingRoute(undefined); setChoices([]); setReply(greetingForHour(new Date().getHours())); }

  return <section aria-labelledby="secretary-title" className="mx-auto w-full max-w-4xl text-center">
    <p className="mb-4 text-xs font-bold uppercase tracking-[.22em] text-emerald-800">Expiya</p>
    <h1 id="secretary-title" className="text-[clamp(3.25rem,8vw,6.5rem)] font-medium leading-[.86] tracking-[-.075em]">Ne satın almak istiyorsunuz?</h1>
    <div aria-live="polite" aria-atomic="true" className="mx-auto mt-6 min-h-7 max-w-xl text-sm leading-6 text-stone-600">
      <p>{reply} {replyLink && <Link className="underline underline-offset-4" href={replyLink}>Daha fazla bilgi</Link>}</p>
      {choices.length > 0 && <div aria-label="Yönlendirme seçenekleri" className="mx-auto mt-3 flex max-w-xl flex-wrap justify-center gap-2">
        {choices.map(choice => <button key={choice.destination} type="button" onClick={() => selectChoice(choice)} className="min-h-11 max-w-full rounded-full border border-stone-300 bg-white px-4 py-2 font-medium text-stone-800 shadow-sm hover:border-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">{choice.label}</button>)}
      </div>}
      {pendingRoute && <div className="mx-auto mt-3 max-w-md" role="status">
        <div className="h-1.5 overflow-hidden rounded-full bg-stone-200" aria-label={`Yönlendirmeye ${remainingSeconds} saniye kaldı`}><div className="h-full bg-emerald-700 motion-reduce:transition-none" style={{ width: progressStarted ? "100%" : "0%", transitionDuration: `${SECRETARY_NAVIGATION_DELAY_MS}ms`, transitionProperty: "width", transitionTimingFunction: "linear" }} /></div>
        <button type="button" onClick={() => cancelNavigation()} className="mt-2 min-h-11 rounded-full px-4 font-medium text-emerald-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">Durdur ve burada kal</button>
      </div>}
      {frozen && <button type="button" onClick={startNewSession} className="mt-3 min-h-11 rounded-full border border-stone-300 px-4 font-medium text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">Yeni oturum başlat</button>}
    </div>
    <form onSubmit={submit} className="relative mt-4 flex items-end gap-2 overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white p-2.5 shadow-[0_12px_45px_rgba(0,0,0,.09)] transition focus-within:border-stone-400">
      <label className="sr-only" htmlFor="secretary-message">Ne seçmek istediğinizi anlatın</label>
      {!draft && !frozen && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-6 right-16 flex items-center truncate text-left text-base text-stone-400">Ne aradığınızı yazın</span>}
      <textarea id="secretary-message" rows={1} maxLength={1000} value={draft} disabled={loading || frozen} onChange={event => { if (pendingRoute) cancelNavigation("Önceki yönlendirme durduruldu; yeni isteğinizi yazabilirsiniz."); if (choices.length) setChoices([]); setDraft(event.target.value); }} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} className="relative z-10 min-h-14 min-w-0 flex-1 resize-none bg-transparent px-4 py-4 text-left text-base leading-6 outline-none disabled:opacity-60" />
      <button type="submit" disabled={loading || frozen || !draft.trim()} className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-lg text-white hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:bg-stone-300" aria-label="Mesajı gönder">↑</button>
    </form>
    {!frozen&&<div className="mx-auto mt-5 max-w-3xl" aria-label="Örnek aramalar"><div className="flex flex-wrap justify-center gap-2">{[0,1,2].map(offset=>suggestions[(suggestionIndex+offset)%suggestions.length]).map(suggestion=><button key={suggestion.id} type="button" onClick={()=>setDraft(suggestion.label)} className="min-h-11 max-w-full rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700 hover:border-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">{suggestion.label}</button>)}</div><div className="mt-3 flex items-center justify-center gap-3 text-sm"><button type="button" aria-label="Önceki örnek aramalar" onClick={()=>setSuggestionIndex(current=>(current-3+suggestions.length)%suggestions.length)} className="min-h-11 px-3 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">Önceki</button><button type="button" aria-label="Sonraki örnek aramalar" onClick={()=>setSuggestionIndex(current=>(current+3)%suggestions.length)} className="min-h-11 px-3 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">Sonraki</button><Link href="/expiya-nedir#active-areas-title" className="min-h-11 px-3 py-3 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">Tüm alanlar</Link></div></div>}
  </section>;
}
