"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { V3ConversationState, V3PublicResponse } from "@/features/decision/v3/types";
import { createRecommendationTermsAcceptance, RECOMMENDATION_TERMS_VERSION, type RecommendationTermsAcceptance } from "@/lib/legal/recommendationTerms";
import { productEvents, recordProductEventOnce } from "@/lib/analytics/productEvents";
import { FirstMessageVoiceInput } from "@/components/cars/FirstMessageVoiceInput";
import { XpyBudgetBand, XpyChoiceGroup, XpyHeader, XpyLoading, XpyStageOneFrame } from "@/components/xpy/XpyPresentation";
import { CARS_EXPERIENCE } from "@/features/xpy/visualPacks";
import { XpyDecisionCard } from "@/components/xpy/XpyDecisionCard";
import { V3_CARS_STAGE_ONE_PRESENTATION } from "@/features/xpy/carsStageOneAdapters";
import type { XpyChoiceOption, XpyChoiceSet, XpyChoiceSubmission } from "@/features/xpy/contracts";
import { clearSecretaryPendingMessage, readSecretaryPendingMessage } from "@/features/platform/secretaryClientHandoff";
import { carsWelcomeText } from "@/features/xpy/welcomeKnowledge";

type Message = { readonly id: string; readonly role: "user" | "assistant"; readonly content: string; readonly advisory?: V3PublicResponse["advisory"]; readonly choices?: XpyChoiceSet; readonly recommendations?: V3PublicResponse["recommendations"]; readonly variantCounts?: V3PublicResponse["variantCounts"]; readonly trace?: { readonly revision: number; readonly purchaseIntent: V3ConversationState["purchaseIntent"]; readonly route?: V3ConversationState["lastRoute"]; readonly lastQuestionKey?: string; readonly ledger: V3ConversationState["ledger"]; readonly offerAwaitingConsent: boolean } };
function assistantMessageParts(content: string): readonly string[] {
  if (content.length < 190) return [content];
  const sentences = content.match(/[^.!?]+[.!?]+|[^.!?]+$/gu)?.map((item) => item.trim()).filter(Boolean) ?? [content];
  if (sentences.length < 2) return [content];
  const parts: string[] = [];
  for (const sentence of sentences) { const last = parts.at(-1); if (last && last.length + sentence.length < 210) parts[parts.length - 1] = `${last} ${sentence}`; else parts.push(sentence); }
  return parts;
}

function ConversationMessage({ message, selected, interactive, termsChecked, onTermsChecked, onAcceptTerms, onDeclineTerms, onToggle, onSend, onPhase2 }: { readonly message: Message; readonly selected: readonly string[]; readonly interactive: boolean; readonly termsChecked: boolean; readonly onTermsChecked: (checked: boolean) => void; readonly onAcceptTerms: () => void; readonly onDeclineTerms: () => void; readonly onToggle: (choice: XpyChoiceOption, multiple: boolean) => void; readonly onSend: () => void; readonly onPhase2: (exactVariantId: string) => void }) {
  if (message.role === "user") return <div className="ml-auto flex max-w-[88%] items-end gap-2 sm:max-w-[78%]"><div className="rounded-2xl rounded-br-md bg-emerald-100 px-3.5 py-2.5 text-[15px] text-emerald-950 shadow-sm ring-1 ring-emerald-200 dark:bg-emerald-800 dark:text-white dark:ring-emerald-700"><p className="whitespace-pre-wrap leading-6">{message.content}</p></div></div>;
  const choiceGroup = interactive ? message.choices : undefined;
  const parts = assistantMessageParts(message.content);
  const visibleAdvisory = message.advisory && !message.content.startsWith(message.advisory.message) ? message.advisory : undefined;
  return <div className="max-w-[92%] space-y-1.5 sm:max-w-[82%]">
    {visibleAdvisory && <div className="rounded-2xl rounded-bl-md border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-[15px] text-emerald-950 shadow-sm dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"><p className="whitespace-pre-wrap leading-6">{visibleAdvisory.message}</p></div>}
    {parts.map((part, index) => <div key={`${message.id}:part:${index}`} className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[15px] text-stone-800 shadow-sm ring-1 ring-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:ring-stone-700"><p className="whitespace-pre-wrap leading-6">{part}</p></div>)}
    {choiceGroup && <XpyChoiceGroup options={choiceGroup.options} selected={selected} multiple={choiceGroup.selectionMode === "MULTIPLE"} onToggle={(choice) => onToggle(choice, choiceGroup.selectionMode === "MULTIPLE")} onSubmit={onSend}/>}
    {interactive && message.trace?.offerAwaitingConsent && <div className="rounded-2xl border border-neutral-600 bg-neutral-950 p-4 text-sm text-neutral-100">
      <p className="font-semibold">Aracı göstermeden önce</p>
      <p className="mt-2 leading-6 text-neutral-300">Öneri; beyan ettiğin tercihler ile tarihli katalog kaynaklarının yapay zekâ destekli ve kural tabanlı değerlendirilmesidir. Satış teklifi, garanti veya ekspertiz değildir.</p>
      <label className="mt-4 flex cursor-pointer items-start gap-3"><input type="checkbox" checked={termsChecked} onChange={(event) => onTermsChecked(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-500"/><span><Link href="/arac-oneri-kosullari?returnTo=%2Fcars%23asama-1" className="font-semibold underline underline-offset-4">Araç Önerisi ve Katalog Kullanım Koşulları’nı</Link> ({RECOMMENDATION_TERMS_VERSION}) okudum ve kabul ediyorum.</span></label>
      <button type="button" onClick={onAcceptTerms} disabled={!termsChecked} className="mt-4 w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40">Koşulları kabul et ve aracı göster</button>
      <button type="button" onClick={onDeclineTerms} className="mt-2 w-full rounded-xl border border-neutral-700 px-5 py-3 font-semibold">Kabul etmeden sohbete devam et</button>
      <p className="mt-3 text-xs leading-5 text-neutral-400">Kabul etmezsen araç kartı gösterilmez. KVKK aydınlatması ve diğer izinler bu kabulden ayrıdır.</p>
    </div>}
    {message.recommendations?.map((item) => <XpyDecisionCard key={item.id} card={V3_CARS_STAGE_ONE_PRESENTATION.project(item)} onActivate={() => onPhase2(item.id)} activationLabel={`${item.title} için Aşama 2'yi aç`} action={<button type="button" onClick={() => onPhase2(item.id)} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-left text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">Bu kararı beğendim, aracı daha yakından tanımak istiyorum.</button>}/>)}
  </div>;
}
  const storageKey = "expiya:cars-conversation:v3.8-pilot";

const formatBudgetTry = (value: string): string => {
  const digits = value.replace(/[^\d]/gu, "").replace(/^0+(?=\d)/u, "");
  return digits ? Number(digits).toLocaleString("tr-TR") : "";
};

export function CarsConversationV3({ initialQuery = "", minimumBudgetTry, embedded = false, secretaryEntry = false }: { readonly initialQuery?: string; readonly minimumBudgetTry: number; readonly embedded?: boolean; readonly secretaryEntry?: boolean }) {
  const router = useRouter();
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const sendLock = useRef(false);
  const [conversationId, setConversationId] = useState<string>(() => crypto.randomUUID()); const [state, setState] = useState<V3ConversationState>();
  const [messages, setMessages] = useState<Message[]>([]); const [draft, setDraft] = useState(""); const [loading, setLoading] = useState(false); const [archiving, setArchiving] = useState(false); const [archiveError, setArchiveError] = useState<string>();
  const [stateToken, setStateToken] = useState<string>();
  const [selectedChoices, setSelectedChoices] = useState<Readonly<Record<string, readonly string[]>>>({});
  const [recommendationTermsChecked, setRecommendationTermsChecked] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [budgetEditorOpen, setBudgetEditorOpen] = useState(false);
  const [secretaryQuery, setSecretaryQuery] = useState("");
  const [restored, setRestored] = useState(false);
  const budgetMode = state?.budgetMode ?? "NEEDS_ONLY";
  const budgetFilterEnabled = budgetMode === "BUDGET_AS_DECISION_FILTER" || budgetEditorOpen;
  const latestVariantCounts = [...messages].reverse().find((message) => message.variantCounts)?.variantCounts;
  const latestAssistantMessageId = [...messages].reverse().find((message) => message.role === "assistant")?.id;
  const recommendationTermsRequired = Boolean([...messages].reverse().find((message) => message.role === "assistant")?.trace?.offerAwaitingConsent);
  useEffect(() => { try { if (secretaryEntry) { const pendingMessage = readSecretaryPendingMessage(sessionStorage); clearSecretaryPendingMessage(sessionStorage); sessionStorage.removeItem(storageKey); setSecretaryQuery(pendingMessage ?? "Bir otomobil almak istiyorum."); return; } const stored = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as { state?: V3ConversationState; stateToken?: string; messages?: Message[] } | null; if (stored?.state?.version === "3.8") { setConversationId(stored.state.conversationId); setState(stored.state); setStateToken(stored.stateToken); setMessages(stored.messages ?? []); } } finally { setRestored(true); } }, [secretaryEntry]);
  useEffect(() => { if (restored) sessionStorage.setItem(storageKey, JSON.stringify({ state, stateToken, messages })); }, [messages, restored, state, stateToken]);
  function persistConversationBeforeNavigation() {
    sessionStorage.setItem(storageKey, JSON.stringify({ state, stateToken, messages }));
  }
  useEffect(() => { conversationEndRef.current?.scrollIntoView({ block: "nearest" }); }, [loading, messages]);
  async function openPhase2(exactVariantId: string) {
    if (!stateToken || !state?.recommendationTermsAcceptance) return;
    setLoading(true);
    try { const response = await fetch("/api/cars/sales-advisor/handoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: state.conversationId, stateToken, offerId: state.recommendationTermsAcceptance.offerId, selectedExactVariantId: exactVariantId }) }); const payload = await response.json() as { token?: string; error?: string }; if (!response.ok || !payload.token) throw new Error(payload.error ?? "Aşama 2 geçişi doğrulanamadı"); router.push(`/cars/variant/${encodeURIComponent(exactVariantId)}?handoff=${encodeURIComponent(payload.token)}`); } catch (error) { setArchiveError(error instanceof Error ? error.message : "Aşama 2 geçişi doğrulanamadı"); setLoading(false); }
  }
  async function send(content: string, recommendationTermsAcceptance?: RecommendationTermsAcceptance, choice?: XpyChoiceSubmission, suppressUserBubble = false) {
    if (!content.trim() || loading || sendLock.current) return; sendLock.current = true; const user: Message = { id: crypto.randomUUID(), role: "user", content: content.trim() };
    if (!suppressUserBubble) setMessages((current) => [...current, user]); setDraft(""); setLoading(true);
    try {
      const response = await fetch("/api/cars/conversation/v3", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: state?.conversationId ?? conversationId, messageId: user.id, message: user.content, expectedRevision: state?.revision ?? 0, stateToken, includePilotDiagnostics: true, recommendationTermsAcceptance, choice }) });
      const payload = await response.json() as V3PublicResponse | { message: string };
      if (!response.ok || !("state" in payload)) throw new Error(payload.message);
      recordProductEventOnce("chat-started:v3", productEvents.chatStarted("v3"));
      if (payload.recommendations?.length) recordProductEventOnce("recommendations-revealed:v3", productEvents.recommendationsRevealed("v3_recommendations", payload.recommendations.length));
      setState(payload.state); setStateToken(payload.stateToken); setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: payload.message, advisory: payload.advisory, choices: payload.choices, recommendations: payload.recommendations, variantCounts: payload.variantCounts, trace: { revision: payload.state.revision, purchaseIntent: payload.state.purchaseIntent, route: payload.state.lastRoute, lastQuestionKey: payload.state.lastQuestionKey, ledger: payload.state.ledger, offerAwaitingConsent: Boolean(payload.offerAwaitingConsent) } }]);
    } catch { setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: "Şu anda yanıt veremiyorum; mesajın tarayıcında korundu. Lütfen yeniden dene." }]); }
    finally { setLoading(false); sendLock.current = false; }
  }
  const openingQuery = secretaryQuery || initialQuery;
  useEffect(() => { if (!openingQuery.trim() || !restored || messages.length > 0) return; const timer = window.setTimeout(() => void send(openingQuery, undefined, undefined, Boolean(secretaryQuery)), 0); return () => window.clearTimeout(timer); }, [openingQuery, restored, secretaryQuery]); // eslint-disable-line react-hooks/exhaustive-deps
  function submit(event: FormEvent) { event.preventDefault(); void send(draft); }
  function toggleBudgetFilter() {
    if (loading) return;
    if (budgetFilterEnabled) {
      setBudgetEditorOpen(false); setBudgetDraft("");
      if (budgetMode === "BUDGET_AS_DECISION_FILTER") void send("Bütçeyi karardan çıkar, ihtiyaç odaklı devam.");
      return;
    }
    setBudgetEditorOpen(true);
  }
  function submitBudget(event: FormEvent) {
    event.preventDefault();
    const amount = Number(budgetDraft.replace(/[^\d]/gu, ""));
    if (!Number.isFinite(amount) || amount < minimumBudgetTry || loading) return;
    setBudgetDraft(""); setBudgetEditorOpen(false);
    void send(`Bütçemi karar filtresi olarak kullan. Kesin bütçe üst sınırım ${amount.toLocaleString("tr-TR")} TL.`);
  }
  function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) { if ((event.key === "Enter" || event.key === "NumpadEnter") && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }
  function toggleChoice(messageId: string, choice: XpyChoiceOption, multiple: boolean) {
    setSelectedChoices((current) => { const selected = current[messageId] ?? []; const next = choice.exclusive || !multiple ? [choice.value] : selected.includes(choice.value) ? selected.filter((item) => item !== choice.value) : [...selected.filter((item) => !item.startsWith("Bu seçeneklerden hiçbiri") && item !== "Yakıt türünü birlikte değerlendirelim" && item !== "Her ikisi de olabilir"), choice.value]; return { ...current, [messageId]: next }; });
  }
  function sendChoices(message: Message) { const selected = selectedChoices[message.id] ?? []; const key = message.choices?.questionKey; if (!selected.length || !key) return; const content = key.startsWith("verifiedEquipment:") && selected.length > 1 ? `${selected.join(" ve ")} benim için vazgeçilmez.` : key === "fuelType" && selected.length > 1 ? `${selected.join(" veya ")} olabilir.` : selected.join(" ve "); void send(content, undefined, { questionKey: key, values: selected }); }
  function acceptRecommendationTermsAndReveal() { if (!recommendationTermsChecked || loading) return; setRecommendationTermsChecked(false); void send("Evet, araç önerisini göster.", createRecommendationTermsAcceptance()); }
  async function archiveAndDelete() {
    if (!messages.length || loading || archiving) return; setArchiving(true); setArchiveError(undefined);
    try {
      const finalState = state ? { ...state, pendingOffer: state.pendingOffer ? { offerId: state.pendingOffer.offerId, candidateIds: state.pendingOffer.candidateIds, limit: state.pendingOffer.limit } : undefined } : undefined;
      const response = await fetch("/api/cars/conversation/v3/archive", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: state?.conversationId ?? conversationId, messages, finalState }) });
      const payload = await response.json() as { archived?: boolean; message?: string }; if (!response.ok || !payload.archived) throw new Error(payload.message);
      sessionStorage.removeItem(storageKey); setConversationId(crypto.randomUUID()); setState(undefined); setStateToken(undefined); setMessages([]); setDraft("");
    } catch { setArchiveError("Görüşme kaydedilemedi; sohbet silinmedi. Lütfen yeniden dene."); } finally { setArchiving(false); }
  }
  return <XpyStageOneFrame onInteraction={persistConversationBeforeNavigation} adapter={CARS_EXPERIENCE} embedded={embedded}>
    <XpyHeader title="Araç danışmanın" description="İhtiyacını konuşalım; seçenekleri birlikte sadeleştirip doğru araca ilerleyelim." status={latestVariantCounts ? <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800"><span><strong>{latestVariantCounts.remaining}</strong> seçenek kaldı</span><span aria-hidden="true">·</span><span>{latestVariantCounts.total} varyant</span></div> : undefined} action={<button type="button" onClick={() => void archiveAndDelete()} disabled={!messages.length || loading || archiving} className="min-h-11 shrink-0 rounded-full border border-stone-300 px-3 text-xs font-semibold text-stone-600 transition hover:border-rose-300 hover:text-rose-700 disabled:opacity-40 dark:border-stone-700 dark:text-stone-300">{archiving ? "Kaydediliyor…" : "Görüşmeyi sil"}</button>}/>
    <XpyBudgetBand id="budget-mode-title" description="İstersen kesin üst sınır belirle; kapalıyken yalnız ihtiyaçlarına odaklanırız." enabled={budgetFilterEnabled} disabled={loading} onToggle={toggleBudgetFilter} status={<>{budgetFilterEnabled && !state?.budgetMetadata && <p role="status" className="mt-2 text-xs text-amber-800 dark:text-amber-300">Üst sınır henüz uygulanmadı. Tutarı girip “Üst sınırı uygula” düğmesine bas.</p>}{state?.budgetMetadata && <p className={`mt-2 text-xs ${state.budgetMetadata.includedInDecision ? "text-emerald-700 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"}`}>{state.budgetMetadata.amountTry.toLocaleString("tr-TR")} TL bütçe {state.budgetMetadata.includedInDecision ? "karar filtresine dahil" : "kaydedildi; karar filtresine dahil edilmedi"}.</p>}</>}>
      {budgetFilterEnabled && <form onSubmit={submitBudget} className="mt-3"><div className="flex flex-wrap gap-2"><label className="min-w-56 flex-1"><span className="sr-only">Kesin bütçe üst sınırı</span><div className="flex items-center rounded-xl border border-stone-300 bg-white px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100 dark:border-stone-700 dark:bg-stone-900 dark:focus-within:ring-emerald-950"><input inputMode="numeric" autoComplete="off" value={budgetDraft} disabled={loading} onChange={(event) => setBudgetDraft(formatBudgetTry(event.target.value))} placeholder={state?.budgetMetadata ? state.budgetMetadata.amountTry.toLocaleString("tr-TR") : "Örn. 3.200.000"} className="min-w-0 flex-1 bg-transparent py-2.5 text-stone-900 outline-none dark:text-stone-100"/><span className="text-sm text-stone-500 dark:text-stone-400">TL</span></div></label><button type="submit" disabled={loading || Number(budgetDraft.replace(/[^\d]/gu, "")) < minimumBudgetTry} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Üst sınırı uygula</button></div><p className={`mt-2 text-xs ${budgetDraft && Number(budgetDraft.replace(/[^\d]/gu, "")) < minimumBudgetTry ? "text-rose-700 dark:text-rose-300" : "text-stone-500 dark:text-stone-400"}`}>Aktif katalogdaki en düşük araç fiyatı: {minimumBudgetTry.toLocaleString("tr-TR")} TL. Bunun altında bir üst sınır uygulanamaz.</p></form>}
    </XpyBudgetBand>
    {archiveError && <p role="alert" className="border-b border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{archiveError}</p>}
    <div className="flex-1 space-y-2 overflow-y-auto bg-[radial-gradient(circle_at_top,#f5f1e8_0,transparent_42%)] px-3 py-4 dark:bg-[radial-gradient(circle_at_top,#292524_0,transparent_45%)] sm:px-6" role="log" aria-live="polite" aria-relevant="additions text">{messages.length === 0 && <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[15px] leading-6 text-stone-700 shadow-sm ring-1 ring-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:ring-stone-700 sm:max-w-[82%]"><p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">X · Otomobil danışmanı</p><p className="mt-1">{carsWelcomeText()}</p></div>}{messages.map((message) => <ConversationMessage key={message.id} message={message} selected={selectedChoices[message.id] ?? []} interactive={!loading && message.id === latestAssistantMessageId} termsChecked={recommendationTermsChecked} onTermsChecked={setRecommendationTermsChecked} onAcceptTerms={acceptRecommendationTermsAndReveal} onDeclineTerms={() => void send("Şimdilik gösterme.")} onToggle={(choice, multiple) => toggleChoice(message.id, choice, multiple)} onSend={() => sendChoices(message)} onPhase2={(exactVariantId) => void openPhase2(exactVariantId)}/>)}{loading && <XpyLoading/>}<div ref={conversationEndRef}/></div>
    <form onSubmit={submit} className="border-t border-stone-200 bg-white/95 p-3 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90 sm:p-4">{messages.length === 0 && restored && !openingQuery.trim() && <FirstMessageVoiceInput disabled={loading} onTranscript={setDraft}/>}<div className="flex items-end gap-2"><textarea aria-label="Mesajınız" value={draft} disabled={recommendationTermsRequired || loading} onChange={(event) => setDraft(event.target.value)} onKeyDown={submitOnEnter} rows={1} className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-[15px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:ring-emerald-950" placeholder={recommendationTermsRequired ? "Devam etmek için yukarıdaki seçimi kullan…" : "Mesajını yaz…"}/><button disabled={loading || recommendationTermsRequired || !draft.trim()} aria-label="Mesajı gönder" className="flex min-h-12 items-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-40">Gönder <span className="ml-2" aria-hidden="true">↑</span></button></div></form>
  </XpyStageOneFrame>;
}
