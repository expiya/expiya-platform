"use client";

/* eslint-disable @next/next/no-img-element -- governed media may be a transient signed URL. */

import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import type { RootStageOneClientAdapter } from "@/features/platform/rootStageOneRegistry";
import type { SecretaryResultKind } from "@/features/platform/upperSecretary";
import type { SecretaryRouteChoice } from "@/features/platform/secretaryRoutingPack";
import {
  rootBudgetCorrectionMessage,
  rootBudgetWarning,
  rootChoicePayload,
  paginateRootCandidateReplies,
  rootReplyDraft,
  safeRootQuestionCopy,
  toggleRootReply,
  validateRootComposerText,
  validateRootReplyReadiness,
  type RootBudgetPriceAuthority,
  type RootCandidateReply,
  type RootComposerReply,
} from "@/features/platform/rootConversationComposer";
import { createRecommendationTermsAcceptance, RECOMMENDATION_TERMS_VERSION } from "@/lib/legal/recommendationTerms";

type SecretaryResponse = { readonly kind: SecretaryResultKind; readonly message: string; readonly departmentId?: string; readonly categoryId?: string; readonly destination?: string; readonly link?: string; readonly choices?: readonly SecretaryRouteChoice[] };
type Json = Record<string, unknown>;
type Session = { readonly departmentId: string; readonly categoryId: string; readonly conversationId: string; readonly revision: number; readonly state?: Json; readonly stateToken?: string; readonly materiality?: true };
type QuickReply = RootComposerReply;
type Latest = { readonly message: string; readonly card?: Json; readonly consentRequired?: boolean; readonly quickReplies: readonly QuickReply[]; readonly candidateReplies: readonly RootCandidateReply[]; readonly raw?: Json };
type PendingRoute = { readonly departmentId: string; readonly categoryId?: string; readonly message: string; readonly destination?: string; readonly label: string };
const STORAGE_KEY = "expiya.root.xpy-stage1.v1";
export const ROOT_ROUTE_DELAY_MS = 3000;
export const ROOT_PLACEHOLDER_TYPE_MS = 55;
export const ROOT_PLACEHOLDER_HOLD_MS = 1200;
export const ROOT_PLACEHOLDER_EXIT_MS = 320;
export const ROOT_PLACEHOLDER_MAX_HEIGHT_PX = 224;
export type RootPlaceholderPhase = "TYPING" | "HOLDING" | "EXITING";
export interface RootPlaceholderState { readonly suggestionIndex: number; readonly text: string; readonly phase: RootPlaceholderPhase }

export function shouldPauseRootPlaceholder(input: { readonly focused: boolean; readonly draft: string; readonly connected: boolean }): boolean {
  return input.focused || Boolean(input.draft) || input.connected;
}

export function rootPlaceholderValue(state: RootPlaceholderState, connected: boolean): string {
  return connected ? "" : state.text;
}

export function nextRootPlaceholderState(current: RootPlaceholderState, target: string, suggestionCount: number): RootPlaceholderState {
  if (current.phase === "TYPING") return current.text.length < target.length
    ? { ...current, text: target.slice(0, current.text.length + 1) }
    : { ...current, phase: "HOLDING" };
  if (current.phase === "HOLDING") return { ...current, phase: "EXITING" };
  return { suggestionIndex: (current.suggestionIndex + 1) % Math.max(1, suggestionCount), text: "", phase: "TYPING" };
}

const asObject = (value: unknown): Json | undefined => value && typeof value === "object" && !Array.isArray(value) ? value as Json : undefined;
const text = (value: unknown): string | undefined => typeof value === "string" && value.trim() ? value.trim() : undefined;
const number = (value: unknown): number | undefined => typeof value === "number" && Number.isFinite(value) ? value : undefined;
export const formatRootBudget = (value: string) => { const digits = value.replace(/[^\d]/gu, "").replace(/^0+(?=\d)/u, ""); return digits ? Number(digits).toLocaleString("tr-TR") : ""; };
export function shouldRecoverRootConversation(navigationType: PerformanceNavigationTiming["type"] | undefined, saved: string | null, activeConversationId?: string): boolean {
  if (!saved) return false;
  if (navigationType === "reload") return true;
  // Next client navigation can retain the document-level navigation type as
  // "navigate" on a legal-link round trip. Recovery authority therefore comes
  // from the exact history/session conversation binding, not that coarse value.
  if (!activeConversationId) return false;
  try {
    const parsed = JSON.parse(saved) as { session?: Session; conversationId?: string };
    return (parsed.session?.conversationId ?? parsed.conversationId) === activeConversationId;
  } catch { return false; }
}
export const clearRootConversationReference = (storage: Pick<Storage, "removeItem">) => storage.removeItem(STORAGE_KEY);
const sentenceParagraphs = (value: string) => value.match(/[^.!?]+(?:[.!?]+|$)/gu)?.map(item => item.trim()).filter(Boolean) ?? [value];

export function rootQuickReplies(body: Json): readonly QuickReply[] {
  const outcome = asObject(body.outcome) ?? body;
  const choices = outcome.choices;
  const questionKey = text(outcome.questionKey) ?? text(asObject(choices)?.questionKey);
  const options = Array.isArray(choices) ? choices : Array.isArray(asObject(choices)?.options) ? asObject(choices)!.options as unknown[] : [];
  return options.flatMap(item => {
    const option = asObject(item); const label = text(option?.label); const value = text(option?.value) ?? label;
    return label && value && !/[A-Z]{2,}_[A-Z_]+/u.test(label) ? [{ label, value, ...(questionKey ? { questionKey } : {}) }] : [];
  });
}

export function rootCandidateReplies(body: Json): readonly RootCandidateReply[] {
  const outcome = asObject(body.outcome) ?? body;
  if (!Array.isArray(outcome.candidateSummaries)) return [];
  const seen = new Set<string>();
  const rows = outcome.candidateSummaries.flatMap(item => {
    const candidate = asObject(item), exactProductId = text(candidate?.exactProductId), manufacturer = text(candidate?.manufacturer), modelCode = text(candidate?.modelCode), explicitLabel = text(candidate?.label);
    const label = explicitLabel ?? (manufacturer && modelCode ? `${manufacturer} ${modelCode}` : undefined);
    if (!exactProductId || !label || seen.has(exactProductId) || /[A-Z]{2,}_[A-Z_]+/u.test(label) || validateRootComposerText(label)) return [];
    seen.add(exactProductId);
    return [{ exactProductId, label, value: exactProductId, questionKey: "NON_DOMINATED_SET" }];
  });
  return rows.length === outcome.candidateSummaries.length ? Object.freeze(rows) : Object.freeze([]);
}

function normalizeOutcome(body: Json): Latest {
  const outcome = asObject(body.outcome) ?? body;
  const message = safeRootQuestionCopy(text(outcome.message) ?? text(body.message) ?? "Görüşme güncellendi.");
  const recommendation = Array.isArray(body.recommendations) ? asObject(body.recommendations[0]) : undefined;
  const card = asObject(outcome.card) ?? asObject(body.card) ?? recommendation;
  const quickReplies = rootQuickReplies(body);
  return { message, card, consentRequired: Boolean(card) && !recommendation, quickReplies: validateRootReplyReadiness(quickReplies) ? [] : quickReplies, candidateReplies: rootCandidateReplies(body), raw: body };
}

function rootPriceAuthority(raw: Json | undefined): RootBudgetPriceAuthority | undefined {
  const outcome = asObject(raw?.outcome) ?? raw;
  const authority = asObject(outcome?.governedComparablePrice) ?? asObject(outcome?.priceAuthority) ?? asObject(raw?.governedComparablePrice);
  if (!authority) return undefined;
  return {
    authority: text(authority.authority),
    comparable: authority.comparable === true,
    freshness: text(authority.freshness),
    sourceKind: text(authority.sourceKind),
    minimumTry: number(authority.minimumTry),
  };
}

function TypewriterReply({ value, onComplete }: { readonly value: string; readonly onComplete: () => void }) {
  const [visible, setVisible] = useState(value);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { const reducedTimer = window.setTimeout(() => { setVisible(value); onCompleteRef.current(); }, 0); return () => window.clearTimeout(reducedTimer); }
    let index = 0;
    const resetTimer = window.setTimeout(() => setVisible(""), 0);
    const timer = window.setInterval(() => { index += 1; setVisible(value.slice(0, index)); if (index >= value.length) { window.clearInterval(timer); onCompleteRef.current(); } }, 18);
    return () => { window.clearTimeout(resetTimer); window.clearInterval(timer); };
  }, [value]);
  const paragraphs=sentenceParagraphs(visible); const complete=visible===value;
  return <div className="space-y-3 text-[15px] leading-7 text-stone-700" aria-hidden="true">{paragraphs.map((item, index) => <p className={complete&&index===paragraphs.length-1&&/[?？]$/u.test(item)?"font-semibold text-stone-950":undefined} key={`${index}:${item}`}>{item}</p>)}</div>;
}

function MinimalDecisionCard({ card, stageTwoHref, onActivate }: { readonly card: Json; readonly stageTwoHref?: string; readonly onActivate?:()=>void }) {
  const identity = asObject(card.identity) ?? asObject(card.exactIdentity) ?? card;
  const brand = text(identity.brand) ?? text(card.manufacturer) ?? text(card.title) ?? "Doğrulanmış ürün";
  const model = text(identity.model) ?? text(card.modelCode) ?? text(identity.name) ?? "";
  const configuration = text(identity.configuration) ?? text(card.configuration);
  const reasons = Array.isArray(card.reasons) ? card.reasons.filter((item): item is string => typeof item === "string") : Array.isArray(card.rationale) ? card.rationale.filter((item): item is string => typeof item === "string") : [];
  const media = asObject(card.currentMedia) ?? asObject(card.media); const src = text(media?.src) ?? text(media?.url);
  const title = `${brand} ${model}`.trim();
  const tiedCandidates = Array.isArray(card.candidates) ? card.candidates.map(asObject).filter((item): item is Json => Boolean(item)) : [];
  const content = <><div className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-[#f7f7f5]">{src ? <img src={src} alt={title} className="h-full w-full object-contain"/> : <div role="img" aria-label={`${title} için doğrulanmış görsel bulunamadı`} className="text-center text-stone-400"><span className="text-3xl" aria-hidden="true">◇</span><p className="mt-2 text-xs">Doğrulanmış görsel bekleniyor</p></div>}</div><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-emerald-800">Karar kartı · Aşama 1</p><h2 className="mt-2 text-xl font-semibold text-stone-950">{title}</h2>{configuration && <p className="mt-1 text-sm text-stone-500">{configuration}</p>}{reasons[0] && <p className="mt-3 text-sm leading-6 text-stone-700">{reasons[0]}</p>}</div></>;
  return <article className="grid gap-4 rounded-2xl border border-stone-300 bg-white p-4 sm:grid-cols-[11rem_1fr]">{stageTwoHref ? <Link href={stageTwoHref} className="contents" aria-label={`${title} için Aşama 2'yi aç`}>{content}</Link> : content}{tiedCandidates.length>0&&<ul className="space-y-2 sm:col-span-2">{tiedCandidates.map(item=><li key={text(item.id)} className="rounded-xl border border-stone-200 px-3 py-2 text-sm"><strong>{text(item.name)}</strong>{text(item.configuration)?` · ${text(item.configuration)}`:""}</li>)}</ul>}{onActivate&&<button type="button" onClick={onActivate} className="min-h-11 rounded-xl border border-emerald-700 px-4 text-sm font-semibold text-emerald-800 sm:col-span-2">Bu kararı beğendim, Aşama 2’yi aç</button>}</article>;
}

export function RootStageOneExperience({ suggestions, adapters }: { readonly suggestions: readonly { id: string; label: string }[]; readonly adapters: readonly RootStageOneClientAdapter[] }) {
  const [draft, setDraft] = useState(""); const [reply, setReply] = useState("Merhaba, hoş geldiniz. Ne satın almak istediğinizi anlatabilirsiniz."); const [choices, setChoices] = useState<readonly SecretaryRouteChoice[]>([]); const [session, setSession] = useState<Session | undefined>(undefined); const [latest, setLatest] = useState<Latest | undefined>(undefined); const [busy, setBusy] = useState(false); const [categoryLabel, setCategoryLabel] = useState(""); const [orientation,setOrientation]=useState(""); const [budgetEnabled, setBudgetEnabled] = useState(false); const [budgetApplied, setBudgetApplied] = useState(false); const [budgetAppliedValue, setBudgetAppliedValue] = useState(""); const [budgetDraft, setBudgetDraft] = useState(""); const [budgetNotice, setBudgetNotice] = useState<string | undefined>(undefined); const [cardRevealed, setCardRevealed] = useState(false); const [stageTwoHref, setStageTwoHref] = useState<string | undefined>(undefined); const [placeholderState, setPlaceholderState] = useState<RootPlaceholderState>({ suggestionIndex: 0, text: "", phase: "TYPING" }); const [messageFocused, setMessageFocused] = useState(false); const [termsChecked,setTermsChecked]=useState(false); const [pendingRoute,setPendingRoute]=useState<PendingRoute>(); const [routeProgress,setRouteProgress]=useState(0); const [selectedReplies,setSelectedReplies]=useState<readonly QuickReply[]>([]); const [selectedCandidate,setSelectedCandidate]=useState<RootCandidateReply>(); const [candidateVisibleCount,setCandidateVisibleCount]=useState(6); const [questionComplete,setQuestionComplete]=useState(false); const [composerError,setComposerError]=useState<string | undefined>(undefined); const messageId = useRef<string | undefined>(undefined); const textareaRef=useRef<HTMLTextAreaElement>(null); const routeTimer=useRef<number | undefined>(undefined);
  const adapterMap = useMemo(() => new Map(adapters.map(adapter => [`${adapter.departmentId}/${adapter.categoryId}`, adapter])), [adapters]);
  const activeAdapter = session ? (session.materiality ? { ...(adapterMap.get(`${session.departmentId}/${session.categoryId}`)!), endpoint: "/api/platform/p-materiality", categoryField: "categoryId" as const, mode: "SIGNED_CRUD" as const } : adapterMap.get(`${session.departmentId}/${session.categoryId}`)) : undefined;

  useEffect(() => {
    if (shouldPauseRootPlaceholder({ focused: messageFocused, draft, connected: Boolean(session) })) return;
    const target = suggestions[placeholderState.suggestionIndex % Math.max(1, suggestions.length)]?.label ?? "Ne aradığınızı yazın";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      if (placeholderState.text !== target || placeholderState.phase !== "HOLDING") {
        const timer = window.setTimeout(() => setPlaceholderState({ ...placeholderState, text: target, phase: "HOLDING" }), 0);
        return () => window.clearTimeout(timer);
      }
      return;
    }
    const delay = placeholderState.phase === "HOLDING" ? ROOT_PLACEHOLDER_HOLD_MS : placeholderState.phase === "EXITING" ? ROOT_PLACEHOLDER_EXIT_MS : ROOT_PLACEHOLDER_TYPE_MS;
    const timer = window.setTimeout(() => setPlaceholderState(current => nextRootPlaceholderState(current, target, suggestions.length)), delay);
    return () => window.clearTimeout(timer);
  }, [draft, messageFocused, placeholderState, session, suggestions]);
  useEffect(()=>()=>{if(routeTimer.current)window.clearTimeout(routeTimer.current);},[]);
  useEffect(() => { const saved = sessionStorage.getItem(STORAGE_KEY); const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined; const activeConversationId=asObject(history.state)?.expiyaRootConversationId as string | undefined; if (!shouldRecoverRootConversation(navigation?.type, saved, activeConversationId)) { sessionStorage.removeItem(STORAGE_KEY); return; } void (async () => { try { const parsed=JSON.parse(saved!) as {session?:Session;latest?:Latest;orientation?:string};const prior=parsed.session??parsed as Session; const baseAdapter = adapterMap.get(`${prior.departmentId}/${prior.categoryId}`); if (!baseAdapter) throw new Error(); const adapter=prior.materiality?{...baseAdapter,endpoint:"/api/platform/p-materiality",mode:"SIGNED_CRUD" as const}:baseAdapter; setBusy(true);setOrientation(parsed.orientation??baseAdapter.welcomeSummary);if(adapter.mode==="CARS_V3"){setSession(prior);setCategoryLabel(adapter.categoryLabel);const restored=parsed.latest?{...parsed.latest,quickReplies:parsed.latest.quickReplies??rootQuickReplies(parsed.latest.raw??{}),candidateReplies:parsed.latest.candidateReplies??rootCandidateReplies(parsed.latest.raw??{})}:undefined;setLatest(restored);setCardRevealed(Boolean(restored?.card));return;} const response = await fetch(adapter.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "READ", conversationId: prior.conversationId,categoryId:prior.categoryId,...(adapter.mode==="SIGNED_CRUD"?{stateToken:prior.stateToken}:{}) }) }); const body = await response.json() as Json; if (!response.ok) throw new Error(); const revision = number(body.revision) ?? prior.revision; setSession({ ...prior, revision }); setCategoryLabel(adapter.categoryLabel); setLatest(normalizeOutcome(body)); } catch { sessionStorage.removeItem(STORAGE_KEY); } finally { setBusy(false); } })(); }, [adapterMap]);

  async function api(adapter: RootStageOneClientAdapter, body: Json) { const response = await fetch(adapter.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const payload = await response.json() as Json; if (!response.ok) throw new Error(text(payload.message) ?? "Görüşme güvenli biçimde ilerletilemedi."); return payload; }
  function rememberConversation(next:Session, normalized?:Latest){history.replaceState({...asObject(history.state),expiyaRootConversationId:next.conversationId},"");sessionStorage.setItem(STORAGE_KEY,JSON.stringify({session:next,orientation,...(normalized?{latest:normalized}:{})}));}
  async function begin(departmentId: string, categoryId: string | undefined, originalMessage: string, legacyDestination?: string) {
    const baseAdapter = categoryId ? adapterMap.get(`${departmentId}/${categoryId}`) : undefined; setChoices([]);
    if (!baseAdapter) { setReply("Bu aktif kategori için root görüşme adapter’ı doğrulanamadı. Güvenliğiniz için görüşme başlatılmadı."); if (legacyDestination) setReply(value => `${value} Mevcut kategori sayfası kullanılmaya devam ediyor.`); return; }
    if (categoryId === "SMARTPHONE") {
      setBusy(true);setCategoryLabel(baseAdapter.categoryLabel);setOrientation(baseAdapter.welcomeSummary);setReply("");
      try { const conversationId=crypto.randomUUID(),createId=crypto.randomUUID();const created=await api(baseAdapter,{action:"CREATE",conversationId,messageId:createId,[baseAdapter.categoryField]:baseAdapter.categoryId});const next:Session={departmentId,categoryId,conversationId,revision:number(created.revision)??1};const recovered=await api(baseAdapter,{action:"READ",conversationId});const normalized=normalizeOutcome(recovered);setSession(next);setLatest(normalized);setQuestionComplete(false);history.replaceState({...asObject(history.state),expiyaRootConversationId:next.conversationId},"");sessionStorage.setItem(STORAGE_KEY,JSON.stringify({session:next,orientation:baseAdapter.welcomeSummary,latest:normalized})); }
      catch(error){setReply(error instanceof Error?error.message:"Görüşme başlatılamadı.");setSession(undefined);sessionStorage.removeItem(STORAGE_KEY);}finally{setBusy(false);}return;
    }
    const adapter={...baseAdapter,endpoint:"/api/platform/p-materiality",categoryField:"categoryId" as const,mode:"SIGNED_CRUD" as const};
    setBusy(true); setCategoryLabel(adapter.categoryLabel);setOrientation(adapter.welcomeSummary); setReply("");
    try { const conversationId = crypto.randomUUID(); const createId = crypto.randomUUID(); const created = await api(adapter, { action: "CREATE", conversationId, messageId: createId, departmentId, categoryId:adapter.categoryId }); const revision = number(created.revision) ?? 0; const next: Session = { departmentId, categoryId: adapter.categoryId, conversationId, revision,materiality:true,...(text(created.stateToken)?{stateToken:text(created.stateToken)}:{}) };const normalized=normalizeOutcome(created);setSession(next);setLatest(normalized);setQuestionComplete(false);history.replaceState({...asObject(history.state),expiyaRootConversationId:next.conversationId},"");sessionStorage.setItem(STORAGE_KEY,JSON.stringify({session:next,orientation:adapter.welcomeSummary,latest:normalized}));setBusy(false); }
    catch (error) { setReply(error instanceof Error ? error.message : "Görüşme başlatılamadı."); setSession(undefined); sessionStorage.removeItem(STORAGE_KEY); setBusy(false); }
  }
  async function turn(value: string, current = session, adapter = activeAdapter, acceptance=false, selected:readonly QuickReply[]=[]) {
    const message = value.trim(); if (!message || !current || !adapter) return; setBusy(true); setCardRevealed(false); setStageTwoHref(undefined); messageId.current ??= crypto.randomUUID();
    try { const choice=selectedCandidate?undefined:rootChoicePayload(selected);const choiceBody=choice?{choice}:{}; const requestBody=adapter.mode==="CARS_V3"?{conversationId:current.conversationId,messageId:messageId.current,expectedRevision:current.revision,message,stateToken:current.stateToken,...choiceBody,...(acceptance?{recommendationTermsAcceptance:createRecommendationTermsAcceptance()}: {})}:{ action: "TURN", conversationId: current.conversationId, categoryId:current.categoryId,messageId:messageId.current, expectedRevision:current.revision, message,...choiceBody,...(adapter.mode==="SIGNED_CRUD"?{stateToken:current.stateToken}:{}) };const body = await api(adapter, requestBody); const state=asObject(body.state);const revision = number(state?.revision)??number(body.revision) ?? current.revision + 1; const next = { ...current, revision,...(state?{state}:{}),...(text(body.stateToken)?{stateToken:text(body.stateToken)}:{}) }; const normalized=normalizeOutcome(body);setSession(next);rememberConversation(next,normalized);if(adapter.mode==="CARS_V3")setCardRevealed(Boolean(normalized.card)); setLatest(normalized);setCandidateVisibleCount(6);setQuestionComplete(false);setSelectedReplies([]);setSelectedCandidate(undefined);setComposerError(undefined); setDraft(""); messageId.current = undefined; return true; }
    catch (error) { setReply(error instanceof Error ? error.message : "Görüşme ilerletilemedi."); }
    finally { setBusy(false); }
    return false;
  }
  async function submit(event: FormEvent) { event.preventDefault(); const value = draft.trim(); const validation=validateRootComposerText(value);if(validation){setComposerError(validation);return;} if (!value || busy) return; if (session) return void turn(value,session,activeAdapter,false,selectedReplies); setBusy(true); setLatest(undefined); try { const response = await fetch("/api/platform/secretary", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: value }) }); const body = await response.json() as SecretaryResponse; if (!response.ok) throw new Error(body.message); setReply(body.message); setChoices(body.choices ?? []); if (body.kind === "PROPOSE_NAVIGATION" && body.departmentId) scheduleRoute({departmentId:body.departmentId,categoryId:body.categoryId,message:value,destination:body.destination,label:body.message}); setDraft(""); } catch (error) { setReply(error instanceof Error ? error.message : "Şu anda yardımcı olamıyorum."); } finally { setBusy(false); } }
  function cancelRoute(){if(routeTimer.current)window.clearTimeout(routeTimer.current);routeTimer.current=undefined;setPendingRoute(undefined);setRouteProgress(0);}
  function scheduleRoute(route:PendingRoute){cancelRoute();setPendingRoute(route);setRouteProgress(0);setReply(route.label);setChoices([]);window.requestAnimationFrame(()=>setRouteProgress(1));routeTimer.current=window.setTimeout(()=>{routeTimer.current=undefined;setPendingRoute(undefined);setRouteProgress(0);void begin(route.departmentId,route.categoryId,route.message,route.destination);},ROOT_ROUTE_DELAY_MS);}
  function clearConversation() { clearRootConversationReference(sessionStorage);history.replaceState({...asObject(history.state),expiyaRootConversationId:undefined},""); setSession(undefined); setLatest(undefined); setReply("Merhaba, hoş geldiniz. Ne satın almak istediğinizi anlatabilirsiniz."); setChoices([]); setDraft(""); setCategoryLabel("");setOrientation(""); setBudgetEnabled(false); setBudgetApplied(false); setBudgetAppliedValue(""); setBudgetDraft("");setBudgetNotice(undefined);setSelectedReplies([]);setSelectedCandidate(undefined);setComposerError(undefined); setCardRevealed(false); setStageTwoHref(undefined);setTermsChecked(false);cancelRoute(); messageId.current = undefined; }
  async function toggleBudget(enabled:boolean){setBudgetEnabled(enabled);setBudgetNotice(undefined);if(enabled)return;setBudgetDraft("");if(budgetApplied){const removed=await turn("Önceki bütçe tercihimi kaldır; aktif bütçe filtresi olmadan ihtiyaç odaklı devam.");if(removed){setBudgetApplied(false);setBudgetAppliedValue("");}}}
  async function applyBudgetOnBlur(){const amount=Number(budgetDraft.replace(/[^\d]/gu,""));if(!budgetEnabled||busy||!Number.isSafeInteger(amount)||amount<=0||budgetDraft===budgetAppliedValue)return;const notice=rootBudgetWarning(amount,rootPriceAuthority(latest?.raw));if(await turn(rootBudgetCorrectionMessage(budgetAppliedValue,budgetDraft))){setBudgetApplied(true);setBudgetAppliedValue(budgetDraft);setBudgetNotice(notice);}}
  function toggleReply(option:QuickReply){if(!latest||busy||!questionComplete)return;setSelectedCandidate(undefined);const next=toggleRootReply(selectedReplies,option,latest.quickReplies);setSelectedReplies(next);setDraft(rootReplyDraft(next));setComposerError(undefined);textareaRef.current?.focus();}
  function chooseCandidate(option:RootCandidateReply){if(!latest||busy||!questionComplete)return;setSelectedReplies([]);setSelectedCandidate(option);setDraft(option.label);setComposerError(undefined);textareaRef.current?.focus();}
  function updateDraft(value:string,element:HTMLTextAreaElement){const validation=validateRootComposerText(value);const wraps=element.scrollHeight>element.clientHeight+1;if(validation||wraps){setComposerError(validation??"Mesaj alanı en fazla iki görsel satır olabilir.");return;}setSelectedReplies([]);setSelectedCandidate(undefined);setComposerError(undefined);setDraft(value);}
  async function revealCard() { setCardRevealed(true); const card = latest?.card; if (!card || !session || session.departmentId !== "APPLIANCES") return; try { const response = await fetch("/api/appliances/stage-two-handoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ISSUE", conversationId: session.conversationId, expectedRevision: session.revision }) }); const body = await response.json() as Json; const handoff = text(body.handoff); if (response.ok && handoff) setStageTwoHref(`/appliances/stage/2?handoff=${encodeURIComponent(handoff)}`); } catch { /* Card remains valid while signed continuation stays unavailable. */ } }
  function keydown(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.nativeEvent.isComposing) return;if ((event.key === "Enter" || event.key === "NumpadEnter") && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit();return;}if(event.key==="Enter"&&event.shiftKey&&draft.includes("\n")){event.preventDefault();setComposerError("Mesaj alanı en fazla iki satır olabilir.");} }
  return <section aria-labelledby="secretary-title" className="mx-auto w-full max-w-4xl text-center">
    <p className="mb-4 text-xs font-bold uppercase tracking-[.22em] text-emerald-800">Expiya</p><h1 id="secretary-title" className="text-[clamp(3.25rem,8vw,6.5rem)] font-medium leading-[.86] tracking-[-.075em]">Ne satın almak istiyorsunuz?</h1>
    <div className="mx-auto mt-7 max-w-2xl text-left">{session && <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600" aria-label={`Sabit kategori: ${categoryLabel}`}>{categoryLabel}</span><button type="button" onClick={clearConversation} className="min-h-11 rounded-xl border border-stone-300 bg-white px-3 text-xs font-semibold text-stone-700">Görüşmeyi sil</button></div>}
      {session&&orientation&&<aside aria-label={`${categoryLabel} kısa bilgi`} className="mb-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-600">{orientation}</aside>}
      <div data-testid="root-response-reserve" className="overflow-hidden [min-block-size:8rem] [max-block-size:14rem] sm:[min-block-size:9rem] sm:[max-block-size:15rem]">
        {!session && <div aria-live="polite" className="text-center text-sm leading-6 text-stone-600"><p>{reply}</p>{pendingRoute&&<div className="mx-auto mt-4 max-w-md rounded-2xl border border-stone-200 bg-white p-3 text-left"><div className="h-1.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full origin-left rounded-full bg-emerald-700 transition-[width] duration-[3000ms] ease-linear motion-reduce:transition-none" style={{width:`${routeProgress*100}%`}}/></div><div className="mt-2 flex items-center justify-between gap-3"><span>{pendingRoute.label}</span><button type="button" onClick={cancelRoute} className="min-h-11 rounded-xl border border-stone-300 px-3 font-semibold text-stone-700">Durdur ve burada kal</button></div></div>}{choices.length > 0 && <div className="mt-3 flex flex-wrap justify-center gap-2">{choices.map(choice => <button key={choice.destination} type="button" onClick={() => scheduleRoute({departmentId:choice.departmentId,categoryId:choice.categoryId,message:choice.label,destination:choice.destination,label:choice.label})} className="min-h-11 rounded-full border border-stone-300 bg-white px-4 py-2 font-medium">{choice.label}</button>)}</div>}</div>}
        {session && <div><div aria-live="polite" aria-atomic="true" className="sr-only">{busy ? "Yanıt hazırlanıyor" : latest?.message}</div>{busy ? <p role="status" className="text-sm text-stone-500">Yanıt hazırlanıyor…</p> : latest && <TypewriterReply value={latest.message} onComplete={()=>setQuestionComplete(true)}/>}</div>}
      </div>
      {session&&<div className="space-y-3">{latest?.raw?.offerAwaitingConsent===true&&<div className="rounded-2xl border border-stone-300 bg-white p-4 text-left text-sm"><p className="font-semibold">Aracı göstermeden önce</p><p className="mt-2 leading-6 text-stone-600">Öneri; beyan ettiğin tercihler ile tarihli katalog kaynaklarının yapay zekâ destekli ve kural tabanlı değerlendirmesidir.</p><label className="mt-3 flex gap-2"><input type="checkbox" checked={termsChecked} onChange={event=>setTermsChecked(event.target.checked)}/><span><Link className="underline" href="/arac-oneri-kosullari">Araç Önerisi ve Katalog Kullanım Koşulları’nı</Link> ({RECOMMENDATION_TERMS_VERSION}) kabul ediyorum.</span></label><button type="button" disabled={!termsChecked||busy} onClick={()=>void turn("Evet, araç önerisini göster.",session,activeAdapter,true)} className="mt-3 min-h-11 rounded-xl bg-emerald-700 px-4 font-semibold text-white disabled:opacity-40">Koşulları kabul et ve aracı göster</button></div>}{latest?.card&&!cardRevealed&&<div className="rounded-2xl border border-stone-200 bg-white p-4 text-left"><p className="text-sm leading-6 text-stone-700">Paylaştığınız ihtiyaçlara göre bir karar kartı hazır. Görmek ister misiniz?</p><button type="button" onClick={()=>void revealCard()} className="mt-3 min-h-11 rounded-full border border-emerald-700 px-4 text-sm font-semibold text-emerald-800">Karar kartını göster</button></div>}{latest?.card&&cardRevealed&&<MinimalDecisionCard card={latest.card} stageTwoHref={stageTwoHref}/>}</div>}
      <form onSubmit={submit} className="relative mt-3 overflow-hidden rounded-[1.75rem] border border-stone-200 bg-white p-2.5 shadow-[0_12px_45px_rgba(0,0,0,.09)]"><div className="flex items-end gap-2"><label className="sr-only" htmlFor="secretary-message">Ne seçmek istediğinizi anlatın</label>{!draft&&!session&&<span aria-hidden="true" className={`pointer-events-none absolute inset-x-[1.625rem] top-[1.625rem] text-left text-base leading-6 text-stone-400 transition-[transform,opacity] duration-300 motion-reduce:transition-none ${placeholderState.phase==="EXITING"?"translate-y-[calc(100%+2rem)] opacity-0":"translate-y-0 opacity-100"}`}>{rootPlaceholderValue(placeholderState,false)}</span>}<textarea ref={textareaRef} id="secretary-message" rows={2} value={draft} disabled={busy} aria-invalid={Boolean(composerError)} aria-describedby="root-composer-feedback" placeholder="" onFocus={()=>setMessageFocused(true)} onBlur={()=>setMessageFocused(false)} onChange={event => {if(pendingRoute)cancelRoute();updateDraft(event.target.value,event.currentTarget);}} onKeyDown={keydown} className="relative h-16 min-h-16 max-h-16 min-w-0 flex-1 resize-none overflow-hidden bg-transparent px-4 py-2 text-left text-base leading-6 outline-none"/><button type="submit" disabled={busy || !draft.trim()} className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-lg text-white disabled:bg-stone-300" aria-label="Mesajı gönder">↑</button></div>
        {session&&<div className="mt-1 flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 border-t border-stone-100 px-2 pt-1"><label className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-2 text-xs font-medium text-stone-600"><span>Bütçe</span><input type="checkbox" role="switch" checked={budgetEnabled} onChange={event => void toggleBudget(event.target.checked)} className="h-4 w-4 shrink-0 appearance-none rounded-[4px] border border-stone-400 bg-transparent checked:border-black checked:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"/></label>{budgetEnabled&&<div className="flex min-w-32 flex-1 items-center gap-1"><input aria-label="Kesin bütçe üst sınırı" inputMode="numeric" value={budgetDraft} disabled={busy} onChange={event=>setBudgetDraft(formatRootBudget(event.target.value))} onBlur={()=>void applyBudgetOnBlur()} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();event.currentTarget.blur();}}} placeholder="50.000" className="h-9 min-w-0 flex-1 rounded-lg border border-stone-200 bg-stone-50 px-2 text-sm disabled:opacity-50"/><span className="text-xs text-stone-500">TL</span></div>}</div>}
      </form>
      <p id="root-composer-feedback" role="status" className="min-h-5 px-3 pt-1 text-xs text-rose-700">{composerError??budgetNotice}</p>
      <div id="root-quick-reply-reserve" data-testid="root-quick-reply-reserve" aria-label="Hızlı yanıtlar" aria-busy={busy||!questionComplete} className="max-h-52 min-h-20 overflow-y-auto overflow-x-hidden pt-2"><div className="flex flex-wrap content-start gap-2">{latest?.quickReplies.map(option=>{const pressed=selectedReplies.some(item=>item.questionKey===option.questionKey&&item.value===option.value);return <button key={`${option.questionKey}:${option.value}`} type="button" aria-pressed={pressed} disabled={busy||!questionComplete} onClick={()=>toggleReply(option)} className="min-h-11 max-w-full rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 aria-pressed:border-emerald-800 aria-pressed:bg-emerald-50 disabled:invisible">{option.label}</button>;})}{latest&&paginateRootCandidateReplies(latest.candidateReplies,candidateVisibleCount).visible.map(option=><button key={option.exactProductId} type="button" aria-pressed={selectedCandidate?.exactProductId===option.exactProductId} disabled={busy||!questionComplete} onClick={()=>chooseCandidate(option)} className="min-h-11 max-w-full rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 aria-pressed:border-emerald-800 aria-pressed:bg-emerald-50 disabled:invisible">{option.label}</button>)}</div>{latest&&paginateRootCandidateReplies(latest.candidateReplies,candidateVisibleCount).canExpand&&<button type="button" aria-controls="root-quick-reply-reserve" aria-expanded="false" disabled={busy||!questionComplete} onClick={()=>setCandidateVisibleCount(value=>value+6)} className="mt-2 min-h-11 rounded-full border border-stone-300 px-4 text-sm font-semibold">{paginateRootCandidateReplies(latest.candidateReplies,candidateVisibleCount).hiddenCount} ürün daha göster</button>}</div>
    </div>
  </section>;
}
