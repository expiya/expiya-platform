"use client";

/* eslint-disable @next/next/no-img-element -- governed media may be a transient signed URL. */

import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import type { RootStageOneClientAdapter } from "@/features/platform/rootStageOneRegistry";
import type { SecretaryResultKind } from "@/features/platform/upperSecretary";
import type { SecretaryRouteChoice } from "@/features/platform/secretaryRoutingPack";

type SecretaryResponse = { readonly kind: SecretaryResultKind; readonly message: string; readonly departmentId?: string; readonly categoryId?: string; readonly destination?: string; readonly link?: string; readonly choices?: readonly SecretaryRouteChoice[] };
type Json = Record<string, unknown>;
type Session = { readonly departmentId: string; readonly categoryId: string; readonly conversationId: string; readonly revision: number };
type Latest = { readonly message: string; readonly card?: Json; readonly consentRequired?: boolean; readonly raw?: Json };
const STORAGE_KEY = "expiya.root.xpy-stage1.v1";

const asObject = (value: unknown): Json | undefined => value && typeof value === "object" && !Array.isArray(value) ? value as Json : undefined;
const text = (value: unknown): string | undefined => typeof value === "string" && value.trim() ? value.trim() : undefined;
const number = (value: unknown): number | undefined => typeof value === "number" && Number.isFinite(value) ? value : undefined;
const formatBudget = (value: string) => { const digits = value.replace(/[^\d]/gu, "").replace(/^0+(?=\d)/u, ""); return digits ? Number(digits).toLocaleString("tr-TR") : ""; };
const sentenceParagraphs = (value: string) => value.match(/[^.!?]+(?:[.!?]+|$)/gu)?.map(item => item.trim()).filter(Boolean) ?? [value];

function normalizeOutcome(body: Json): Latest {
  const outcome = asObject(body.outcome) ?? body;
  const message = text(outcome.message) ?? text(body.message) ?? "Görüşme güncellendi.";
  const card = asObject(outcome.card) ?? asObject(body.card);
  return { message, card, consentRequired: Boolean(card), raw: outcome };
}

function TypewriterReply({ value }: { readonly value: string }) {
  const [visible, setVisible] = useState(value);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { const reducedTimer = window.setTimeout(() => setVisible(value), 0); return () => window.clearTimeout(reducedTimer); }
    let index = 0;
    const resetTimer = window.setTimeout(() => setVisible(""), 0);
    const timer = window.setInterval(() => { index += 1; setVisible(value.slice(0, index)); if (index >= value.length) window.clearInterval(timer); }, 18);
    return () => { window.clearTimeout(resetTimer); window.clearInterval(timer); };
  }, [value]);
  return <div className="space-y-3 text-[15px] leading-7 text-stone-700" aria-hidden="true">{sentenceParagraphs(visible).map((item, index) => <p key={`${index}:${item}`}>{item}</p>)}</div>;
}

function MinimalDecisionCard({ card, stageTwoHref }: { readonly card: Json; readonly stageTwoHref?: string }) {
  const identity = asObject(card.identity) ?? asObject(card.exactIdentity) ?? card;
  const brand = text(identity.brand) ?? text(card.manufacturer) ?? "Doğrulanmış ürün";
  const model = text(identity.model) ?? text(card.modelCode) ?? text(identity.name) ?? "";
  const configuration = text(identity.configuration) ?? text(card.configuration);
  const reasons = Array.isArray(card.reasons) ? card.reasons.filter((item): item is string => typeof item === "string") : Array.isArray(card.rationale) ? card.rationale.filter((item): item is string => typeof item === "string") : [];
  const media = asObject(card.currentMedia) ?? asObject(card.media); const src = text(media?.src) ?? text(media?.url);
  const title = `${brand} ${model}`.trim();
  const content = <><div className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-[#f7f7f5]">{src ? <img src={src} alt={title} className="h-full w-full object-contain"/> : <div role="img" aria-label={`${title} için doğrulanmış görsel bulunamadı`} className="text-center text-stone-400"><span className="text-3xl" aria-hidden="true">◇</span><p className="mt-2 text-xs">Doğrulanmış görsel bekleniyor</p></div>}</div><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-emerald-800">Karar kartı · Aşama 1</p><h2 className="mt-2 text-xl font-semibold text-stone-950">{title}</h2>{configuration && <p className="mt-1 text-sm text-stone-500">{configuration}</p>}{reasons[0] && <p className="mt-3 text-sm leading-6 text-stone-700">{reasons[0]}</p>}</div></>;
  return <article className="grid gap-4 rounded-2xl border border-stone-300 bg-white p-4 sm:grid-cols-[11rem_1fr]">{stageTwoHref ? <Link href={stageTwoHref} className="contents" aria-label={`${title} için Aşama 2'yi aç`}>{content}</Link> : content}</article>;
}

export function RootStageOneExperience({ suggestions, adapters }: { readonly suggestions: readonly { id: string; label: string }[]; readonly adapters: readonly RootStageOneClientAdapter[] }) {
  const [draft, setDraft] = useState(""); const [reply, setReply] = useState("Merhaba, hoş geldiniz. Ne satın almak istediğinizi anlatabilirsiniz."); const [choices, setChoices] = useState<readonly SecretaryRouteChoice[]>([]); const [session, setSession] = useState<Session | undefined>(undefined); const [latest, setLatest] = useState<Latest | undefined>(undefined); const [busy, setBusy] = useState(false); const [categoryLabel, setCategoryLabel] = useState(""); const [budgetEnabled, setBudgetEnabled] = useState(false); const [budgetDraft, setBudgetDraft] = useState(""); const [cardRevealed, setCardRevealed] = useState(false); const [stageTwoHref, setStageTwoHref] = useState<string | undefined>(undefined); const [placeholder, setPlaceholder] = useState(""); const [suggestionIndex, setSuggestionIndex] = useState(0); const messageId = useRef<string | undefined>(undefined);
  const adapterMap = useMemo(() => new Map(adapters.map(adapter => [`${adapter.departmentId}/${adapter.categoryId}`, adapter])), [adapters]);
  const activeAdapter = session ? adapterMap.get(`${session.departmentId}/${session.categoryId}`) : undefined;

  useEffect(() => { if (draft || session) return; const target = suggestions[suggestionIndex % suggestions.length]?.label ?? "Ne aradığınızı yazın"; const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; const timer = window.setTimeout(() => { if (reduced) setPlaceholder(target); else if (placeholder.length < target.length) setPlaceholder(target.slice(0, placeholder.length + 1)); else { setPlaceholder(""); setSuggestionIndex(value => (value + 1) % Math.max(1, suggestions.length)); } }, reduced ? 0 : placeholder.length < target.length ? 55 : 1200); return () => window.clearTimeout(timer); }, [draft, placeholder, session, suggestionIndex, suggestions]);
  useEffect(() => { const saved = localStorage.getItem(STORAGE_KEY); if (!saved) return; void (async () => { try { const prior = JSON.parse(saved) as Session; const adapter = adapterMap.get(`${prior.departmentId}/${prior.categoryId}`); if (!adapter) throw new Error(); setBusy(true); const response = await fetch(adapter.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "READ", conversationId: prior.conversationId }) }); const body = await response.json() as Json; if (!response.ok) throw new Error(); const revision = number(body.revision) ?? prior.revision; setSession({ ...prior, revision }); setCategoryLabel(adapter.categoryLabel); setLatest(normalizeOutcome(body)); } catch { localStorage.removeItem(STORAGE_KEY); } finally { setBusy(false); } })(); }, [adapterMap]);

  async function api(adapter: RootStageOneClientAdapter, body: Json) { const response = await fetch(adapter.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const payload = await response.json() as Json; if (!response.ok) throw new Error(text(payload.message) ?? "Görüşme güvenli biçimde ilerletilemedi."); return payload; }
  async function begin(departmentId: string, categoryId: string | undefined, originalMessage: string, legacyDestination?: string) {
    const adapter = categoryId ? adapterMap.get(`${departmentId}/${categoryId}`) : undefined; setChoices([]);
    if (!adapter) { setReply("Bu aktif kategori için root görüşme adapter’ı doğrulanamadı. Güvenliğiniz için görüşme başlatılmadı."); if (legacyDestination) setReply(value => `${value} Mevcut kategori sayfası kullanılmaya devam ediyor.`); return; }
    setBusy(true); setCategoryLabel(adapter.categoryLabel); setReply("");
    try { const conversationId = crypto.randomUUID(); const createId = crypto.randomUUID(); const created = await api(adapter, { action: "CREATE", conversationId, messageId: createId, [adapter.categoryField]: adapter.categoryId }); const revision = number(created.revision) ?? 1; const next: Session = { departmentId, categoryId: adapter.categoryId, conversationId, revision }; setSession(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); await turn(originalMessage, next, adapter); }
    catch (error) { setReply(error instanceof Error ? error.message : "Görüşme başlatılamadı."); setSession(undefined); localStorage.removeItem(STORAGE_KEY); setBusy(false); }
  }
  async function turn(value: string, current = session, adapter = activeAdapter) {
    const message = value.trim(); if (!message || !current || !adapter) return; setBusy(true); setCardRevealed(false); setStageTwoHref(undefined); messageId.current ??= crypto.randomUUID();
    try { const body = await api(adapter, { action: "TURN", conversationId: current.conversationId, messageId: messageId.current, expectedRevision: current.revision, message }); const revision = number(body.revision) ?? current.revision + 1; const next = { ...current, revision }; setSession(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); setLatest(normalizeOutcome(body)); setDraft(""); messageId.current = undefined; }
    catch (error) { setReply(error instanceof Error ? error.message : "Görüşme ilerletilemedi."); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent) { event.preventDefault(); const value = draft.trim(); if (!value || busy) return; if (session) return void turn(value); setBusy(true); setLatest(undefined); try { const response = await fetch("/api/platform/secretary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: value }) }); const body = await response.json() as SecretaryResponse; if (!response.ok) throw new Error(body.message); setReply(body.message); setChoices(body.choices ?? []); if (body.kind === "PROPOSE_NAVIGATION" && body.departmentId) await begin(body.departmentId, body.categoryId, value, body.destination); else setDraft(""); } catch (error) { setReply(error instanceof Error ? error.message : "Şu anda yardımcı olamıyorum."); } finally { setBusy(false); } }
  function clearConversation() { localStorage.removeItem(STORAGE_KEY); setSession(undefined); setLatest(undefined); setReply("Merhaba, hoş geldiniz. Ne satın almak istediğinizi anlatabilirsiniz."); setChoices([]); setDraft(""); setCategoryLabel(""); setBudgetEnabled(false); setBudgetDraft(""); setCardRevealed(false); setStageTwoHref(undefined); messageId.current = undefined; }
  async function revealCard() { setCardRevealed(true); const card = latest?.card; if (!card || !session || session.departmentId !== "APPLIANCES") return; try { const response = await fetch("/api/appliances/stage-two-handoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ISSUE", conversationId: session.conversationId, expectedRevision: session.revision }) }); const body = await response.json() as Json; const handoff = text(body.handoff); if (response.ok && handoff) setStageTwoHref(`/appliances/stage/2?handoff=${encodeURIComponent(handoff)}`); } catch { /* Card remains valid while signed continuation stays unavailable. */ } }
  function keydown(event: KeyboardEvent<HTMLTextAreaElement>) { if ((event.key === "Enter" || event.key === "NumpadEnter") && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }
  return <section aria-labelledby="secretary-title" className="mx-auto w-full max-w-4xl text-center">
    <p className="mb-4 text-xs font-bold uppercase tracking-[.22em] text-emerald-800">Expiya</p><h1 id="secretary-title" className="text-[clamp(3.25rem,8vw,6.5rem)] font-medium leading-[.86] tracking-[-.075em]">Ne satın almak istiyorsunuz?</h1>
    <div className="mx-auto mt-7 max-w-2xl text-left">{session && <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><span className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600" aria-label={`Sabit kategori: ${categoryLabel}`}>{categoryLabel}</span><button type="button" onClick={clearConversation} className="min-h-11 px-3 text-xs font-semibold text-stone-500 underline underline-offset-4">Görüşmeyi sil</button></div>}
      {!session && <div aria-live="polite" className="text-center text-sm leading-6 text-stone-600"><p>{reply}</p>{choices.length > 0 && <div className="mt-3 flex flex-wrap justify-center gap-2">{choices.map(choice => <button key={choice.destination} type="button" onClick={() => void begin(choice.departmentId, choice.categoryId, choice.label, choice.destination)} className="min-h-11 rounded-full border border-stone-300 bg-white px-4 py-2 font-medium">{choice.label}</button>)}</div>}</div>}
      {session && <div className="space-y-5"><div aria-live="polite" aria-atomic="true" className="sr-only">{busy ? "Yanıt hazırlanıyor" : latest?.message}</div>{busy ? <p role="status" className="text-sm text-stone-500">Yanıt hazırlanıyor…</p> : latest && <TypewriterReply value={latest.message}/>} {latest?.card && !cardRevealed && <div className="rounded-2xl border border-stone-200 bg-white p-4 text-left"><p className="text-sm leading-6 text-stone-700">Paylaştığınız ihtiyaçlara göre bir karar kartı hazır. Görmek ister misiniz?</p><button type="button" onClick={() => void revealCard()} className="mt-3 min-h-11 rounded-full border border-emerald-700 px-4 text-sm font-semibold text-emerald-800">Karar kartını göster</button></div>}{latest?.card && cardRevealed && <MinimalDecisionCard card={latest.card} stageTwoHref={stageTwoHref}/>}<section className="border-t border-stone-200 pt-4 text-left"><label className="flex min-h-11 items-center justify-between gap-4 text-sm font-medium"><span>Bütçeyi karar filtresi yap</span><input type="checkbox" role="switch" checked={budgetEnabled} onChange={event => setBudgetEnabled(event.target.checked)} className="h-5 w-5 accent-emerald-700"/></label>{budgetEnabled && <div className="mt-2 flex items-center gap-2"><input aria-label="Kesin bütçe üst sınırı" inputMode="numeric" value={budgetDraft} onChange={event => setBudgetDraft(formatBudget(event.target.value))} placeholder="Örn. 50.000" className="min-h-11 min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-3"/><span className="text-sm text-stone-500">TL</span><button type="button" disabled={!budgetDraft || busy} onClick={() => void turn(`Bütçemi karar filtresi olarak kullan. Kesin bütçe üst sınırım ${budgetDraft} TL.`)} className="min-h-11 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-40">Uygula</button></div>}</section></div>}
    </div>
    <form onSubmit={submit} className="relative mt-5 flex items-end gap-2 overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white p-2.5 shadow-[0_12px_45px_rgba(0,0,0,.09)]"><label className="sr-only" htmlFor="secretary-message">Ne seçmek istediğinizi anlatın</label><textarea id="secretary-message" rows={1} maxLength={1000} value={draft} disabled={busy} placeholder={placeholder} onChange={event => setDraft(event.target.value)} onKeyDown={keydown} className="min-h-14 min-w-0 flex-1 resize-none bg-transparent px-4 py-4 text-left text-base leading-6 outline-none placeholder:text-stone-400"/><button type="submit" disabled={busy || !draft.trim()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-lg text-white disabled:bg-stone-300" aria-label="Mesajı gönder">↑</button></form>
  </section>;
}
