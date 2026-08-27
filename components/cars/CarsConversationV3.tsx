"use client";

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { V3ConversationState, V3PublicResponse } from "@/features/decision/v3/types";
import { EQUIPMENT_FEATURE_DEFINITIONS } from "@/features/vehicle-data/equipmentEvidencePolicy";
import { createRecommendationTermsAcceptance, RECOMMENDATION_TERMS_VERSION, type RecommendationTermsAcceptance } from "@/lib/legal/recommendationTerms";

type Message = { readonly id: string; readonly role: "user" | "assistant"; readonly content: string; readonly recommendations?: V3PublicResponse["recommendations"]; readonly variantCounts?: V3PublicResponse["variantCounts"]; readonly trace?: { readonly revision: number; readonly purchaseIntent: V3ConversationState["purchaseIntent"]; readonly route?: V3ConversationState["lastRoute"]; readonly lastQuestionKey?: string; readonly ledger: V3ConversationState["ledger"]; readonly offerAwaitingConsent: boolean } };
type QuickChoice = { readonly value: string; readonly label: string; readonly description: string; readonly exclusive?: boolean };

const equipmentDefinitions = new Map<string, (typeof EQUIPMENT_FEATURE_DEFINITIONS)[number]>(EQUIPMENT_FEATURE_DEFINITIONS.map((item) => [item.featureCode, item]));
const equipmentDailyUse: Readonly<Record<string, string>> = {
  PARKING: "Dar alanlarda manevra ederken çevreyi daha rahat takip etmeye yardımcı olur.",
  ADAS: "Yoğun trafikte ve uzun yolda sürücünün dikkat yükünü azaltmaya yardımcı olur.",
  OCCUPANT_SAFETY: "Çocuklar ve diğer yolcular için günlük güvenlik ihtiyacını destekler.",
  CABIN_COMFORT: "Uzun veya sık yolculuklarda kabin rahatlığını artırır.",
  ACCESS: "Araca ve bagaja günlük erişimi daha pratik hale getirir.",
  CONNECTIVITY: "Telefon ve navigasyon kullanımını daha kolay hale getirir.",
  LIGHTING: "Gece ve değişken yol koşullarında görüş rahatlığını destekler.",
  OFF_ROAD: "Bozuk, eğimli veya düşük tutunmalı yollarda ilerlemeye yardımcı olur.",
};
function quickChoices(message: Message): { multiple: boolean; choices: readonly QuickChoice[] } | undefined {
  const key = message.trace?.lastQuestionKey;
  if (!key) return undefined;
  if (key.startsWith("verifiedEquipment:")) {
    const choices = key.slice("verifiedEquipment:".length).split("|").flatMap((code) => { const definition = equipmentDefinitions.get(code); return definition ? [{ value: definition.labelTr.toLocaleLowerCase("tr-TR"), label: definition.labelTr, description: equipmentDailyUse[definition.category] ?? "Günlük kullanımda belirgin bir kolaylık sağlayabilir." }] : []; });
    return choices.length ? { multiple: true, choices: [...choices, { value: "Bu seçeneklerden hiçbiri şart değil", label: "Hiçbiri şart değil", description: "Bu donanımlar zorunlu tutulmadan daha geniş bir araç seçeneği değerlendirilir.", exclusive: true }] } : undefined;
  }
  if (key === "fuelType") return { multiple: true, choices: [
    { value: "Benzinli", label: "Benzinli", description: "Kısa ve orta mesafede sade kullanım; şarj gerektirmez." },
    { value: "Dizel", label: "Dizel", description: "Düzenli yüksek kilometre ve uzun yolda tüketim avantajı sağlayabilir." },
    { value: "Hibrit", label: "Hibrit", description: "Şehir içi dur-kalkta elektrik desteğiyle tüketimi azaltabilir." },
    { value: "Elektrikli", label: "Elektrikli", description: "Düzenli şarj imkânıyla sessiz ve düşük kullanım giderli olabilir." },
    { value: "Yakıt türünü birlikte değerlendirelim", label: "Birlikte değerlendirelim", description: "Yakıt türünü günlük kullanımına göre birlikte belirleriz.", exclusive: true },
  ] };
  if (key === "bodyStyle") return { multiple: true, choices: [
    { value: "Kompakt hatchback", label: "Kompakt ve kolay park", description: "Dar sokaklarda manevra ve park genellikle daha kolaydır." },
    { value: "Ferah ve yüksek SUV", label: "Ferah ve yüksek yapı", description: "İnip binme, görüş ve kabin ferahlığı daha güçlü olabilir." },
    { value: "Her ikisi de olabilir", label: "Her ikisi de olabilir", description: "Alçak ya da yüksek yapı yerine diğer günlük ihtiyaçlarına öncelik veririz.", exclusive: true },
  ] };
  if (key === "mixedRoadBody") return { multiple: true, choices: [
    { value: "SUV", label: "SUV", description: "Kapalı bagaj ve yolcu kullanımını karma yol kabiliyetiyle birleştirir." },
    { value: "Pick-up", label: "Pick-up", description: "Açık kasa ve ağır, kirli veya hacimli yüklerde daha pratiktir." },
  ] };
  if (key === "commercialConfiguration") return { multiple: true, choices: [
    { value: "Kapalı yük alanlı panelvan", label: "Panelvan", description: "Kolili ve hava koşullarından korunması gereken yükler için uygundur." },
    { value: "Açık kasalı pick-up", label: "Pick-up", description: "Hacimli, ağır veya kirli yükleri açık kasada taşımaya uygundur." },
    { value: "Yolcu ve yükü birlikte taşıyan yapı", label: "Yolcu + yük", description: "Ekip ve malzemeyi aynı araçta taşımaya uygundur." },
  ] };
  if (key === "recommendationStart") return { multiple: false, choices: [
    { value: "Tamam, bana en uygun aracı seç", label: "Seçime geç", description: "Kaydedilen ihtiyaçlarla araç seçimini başlatır." },
    { value: "Bir soru daha sor", label: "Bir ihtiyacı daha konuş", description: "Karardan önce günlük kullanımın için önemli olabilecek bir noktayı daha ele alır.", exclusive: true },
  ] };
  if (key === "purchaseInterest") return { multiple: false, choices: [
    { value: "Kendi kullanımım için araç seçmeyi düşünüyorum", label: "Araç seçmek istiyorum", description: "Günlük ihtiyaçlarını konuşarak satın alma seçimine geçer." },
    { value: "Şimdilik sadece merak ediyorum", label: "Yalnızca bilgi", description: "Bilgi sorusunu tercih veya satın alma kararı olarak kaydetmez.", exclusive: true },
  ] };
  if (key === "catalogBrandRelaxation") return { multiple: false, choices: [
    { value: "Evet, yakıt tercihini koruyup markayı esnetelim", label: "Markayı esnet", description: "İstenen motor türünü korur ve başka markalardaki uygun araçlara bakar." },
    { value: "Hayır, marka tercihim kalsın", label: "Markayı koru", description: "Başka markaya geçmeden mevcut tercihi korur.", exclusive: true },
  ] };
  if (key === "brandModel") return { multiple: false, choices: [
    { value: "Marka veya model tercihim yok, sen seç", label: "Marka tercihim yok", description: "Markaya öncelik vermeden ihtiyaç ve değer dengesine göre ilerler." },
  ] };
  if (key.startsWith("constraintRelaxation:")) {
    const definitions: Readonly<Record<string, QuickChoice>> = {
      budgetMax: { value: "Bütçeyi karardan çıkar, ihtiyaç odaklı devam", label: "Bütçe sınırını kaldır", description: "Fiyat üst sınırı uygulanmadan günlük ihtiyaçlarına uyan araçlar yeniden değerlendirilir." },
      bodyStyle: { value: "Gövde tipi fark etmez, bu tercihi esnetelim", label: "Gövde tipini esnet", description: "SUV, sedan veya hatchback ayrımı zorunlu tutulmadan diğer ihtiyaçların korunur." },
      fuelType: { value: "Yakıt türü fark etmez, bu tercihi esnetelim", label: "Yakıt türünü esnet", description: "Benzinli, dizel, hibrit veya elektrikli ayrımı yerine diğer ihtiyaçların korunur." },
      transmission: { value: "Vites türü fark etmez, bu tercihi esnetelim", label: "Vites tercihini esnet", description: "Manuel ya da otomatik ayrımı zorunlu tutulmadan diğer ihtiyaçların korunur." },
    };
    const choices = key.slice("constraintRelaxation:".length).split("|").flatMap((concept) => definitions[concept] ? [definitions[concept]] : []);
    return choices.length ? { multiple: false, choices } : undefined;
  }
  if (key.startsWith("confirm:")) return { multiple: false, choices: [
    { value: "Evet, bunu öncelik yapalım", label: "Evet", description: "Bu ihtiyaç seçimde güçlü bir tercih olarak kullanılır." },
    { value: "Hayır, bunu öncelik yapmayalım", label: "Hayır", description: "Bu çıkarım reddedilir ve seçim ölçütü olmaz.", exclusive: true },
  ] };
  return undefined;
}
function assistantMessageParts(content: string): readonly string[] {
  if (content.length < 190) return [content];
  const sentences = content.match(/[^.!?]+[.!?]+|[^.!?]+$/gu)?.map((item) => item.trim()).filter(Boolean) ?? [content];
  if (sentences.length < 2) return [content];
  const parts: string[] = [];
  for (const sentence of sentences) { const last = parts.at(-1); if (last && last.length + sentence.length < 210) parts[parts.length - 1] = `${last} ${sentence}`; else parts.push(sentence); }
  return parts;
}

function buttonPrompt(message: Message, hasChoices: boolean): string {
  if (!hasChoices) return message.content;
  const key = message.trace?.lastQuestionKey ?? "";
  if (key.startsWith("verifiedEquipment:")) return "Senin için vazgeçilmez olan donanımları seçebilirsin.";
  if (key.startsWith("confirm:")) return "Bu önceliği araç seçiminde kullanalım mı?";
  if (key.startsWith("constraintRelaxation:")) return "Seçenekleri yeniden genişletmek için esnetebileceğin tercihi seçebilirsin.";
  const prompts: Readonly<Record<string, string>> = {
    fuelType: "Günlük kullanımına uygun yakıt seçeneklerini seçebilirsin.", bodyStyle: "Günlük kullanımına uygun araç yapısını seçebilirsin.", mixedRoadBody: "Karma yol kullanımına uygun yapıyı seçebilirsin.", commercialConfiguration: "Yükleme düzenine uygun araç yapısını seçebilirsin.", recommendationStart: "Hazırsan araç seçimine geçebiliriz.", purchaseInterest: "Nasıl devam etmek istediğini seçebilirsin.", catalogBrandRelaxation: "Motor tercihini koruyarak marka konusunda nasıl ilerleyeceğini seçebilirsin.", brandModel: "Marka tercihin yoksa bunu seçebilir veya istediğin markayı yazabilirsin.",
  };
  return prompts[key] ?? message.content;
}

function ConversationMessage({ message, selected, interactive, termsChecked, onTermsChecked, onAcceptTerms, onDeclineTerms, onToggle, onSend, onPhase2 }: { readonly message: Message; readonly selected: readonly string[]; readonly interactive: boolean; readonly termsChecked: boolean; readonly onTermsChecked: (checked: boolean) => void; readonly onAcceptTerms: () => void; readonly onDeclineTerms: () => void; readonly onToggle: (choice: QuickChoice, multiple: boolean) => void; readonly onSend: () => void; readonly onPhase2: (exactVariantId: string) => void }) {
  if (message.role === "user") return <div className="ml-auto max-w-[85%] rounded-2xl bg-emerald-700 px-4 py-3"><p className="whitespace-pre-wrap leading-7">{message.content}</p></div>;
  const choiceGroup = interactive ? quickChoices(message) : undefined;
  const parts = assistantMessageParts(buttonPrompt(message, Boolean(choiceGroup)));
  return <div className="max-w-[90%] space-y-2">
    {parts.map((part, index) => <div key={`${message.id}:part:${index}`} className="rounded-2xl bg-neutral-800 px-4 py-3"><p className="whitespace-pre-wrap leading-7">{part}</p></div>)}
    {choiceGroup && <div className="rounded-2xl border border-neutral-700 bg-neutral-900 p-3" role="group" aria-label="Yanıt seçenekleri">
      <div className="grid gap-2">{choiceGroup.choices.map((choice) => { const active = selected.includes(choice.value); return <button key={choice.value} type="button" aria-pressed={active} onClick={() => onToggle(choice, choiceGroup.multiple)} className={`rounded-xl border px-3 py-2 text-left transition ${active ? "border-emerald-500 bg-emerald-950 text-emerald-100" : "border-neutral-700 bg-neutral-950 text-neutral-100 hover:border-neutral-500"}`}><span className="block font-medium">{choice.label}</span><span className="mt-1 block text-xs leading-5 text-neutral-400">{choice.description}</span></button>; })}</div>
      <button type="button" disabled={!selected.length} onClick={onSend} className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-40">{selected.length > 1 ? `${selected.length} seçimi gönder` : "Seçimi gönder"}</button>
    </div>}
    {interactive && message.trace?.offerAwaitingConsent && <div className="rounded-2xl border border-neutral-600 bg-neutral-950 p-4 text-sm text-neutral-100">
      <p className="font-semibold">Aracı göstermeden önce</p>
      <p className="mt-2 leading-6 text-neutral-300">Öneri; beyan ettiğin tercihler ile tarihli katalog kaynaklarının yapay zekâ destekli ve kural tabanlı değerlendirilmesidir. Satış teklifi, garanti veya ekspertiz değildir.</p>
      <label className="mt-4 flex cursor-pointer items-start gap-3"><input type="checkbox" checked={termsChecked} onChange={(event) => onTermsChecked(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-500"/><span><Link href="/arac-oneri-kosullari?returnTo=%2Fanalysis%3Fpilot%3Dv3.8" className="font-semibold underline underline-offset-4">Araç Önerisi ve Katalog Kullanım Koşulları’nı</Link> ({RECOMMENDATION_TERMS_VERSION}) okudum ve kabul ediyorum.</span></label>
      <button type="button" onClick={onAcceptTerms} disabled={!termsChecked} className="mt-4 w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40">Koşulları kabul et ve aracı göster</button>
      <button type="button" onClick={onDeclineTerms} className="mt-2 w-full rounded-xl border border-neutral-700 px-5 py-3 font-semibold">Kabul etmeden sohbete devam et</button>
      <p className="mt-3 text-xs leading-5 text-neutral-400">Kabul etmezsen araç kartı gösterilmez. KVKK aydınlatması ve diğer izinler bu kabulden ayrıdır.</p>
    </div>}
    {message.variantCounts && <p className="px-1 text-xs text-neutral-400">Toplam varyant: {message.variantCounts.total} · Kalan seçenek varyant: {message.variantCounts.remaining}</p>}
    {message.recommendations?.map((item) => <article key={item.id} className="group overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-950 transition hover:border-neutral-500 hover:shadow-xl"><Link href={`/decision/v3-${encodeURIComponent(item.id)}`} aria-label={`${item.title} ayrıntısını aç`} className="block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400"><div className="relative aspect-[16/9] overflow-hidden bg-neutral-800"><Image src={item.image} alt={`${item.title} araç görseli`} fill sizes="(max-width: 768px) 100vw, 700px" className="object-cover transition duration-300 group-hover:scale-[1.025]"/>{item.imageStatus !== "EXACT" && <span className="absolute bottom-3 right-3 rounded-full bg-black/75 px-2.5 py-1 text-[11px] font-medium text-white">{item.imageStatus === "PLACEHOLDER" ? "Görsel hazırlanıyor" : "Temsilî görsel"}</span>}</div><div className="p-4">{item.badge && <p className="mb-2 inline-flex rounded-full border border-emerald-800 bg-emerald-950 px-2 py-1 text-xs text-emerald-300">{item.badge}</p>}<h2 className="font-semibold">{item.title}</h2>{item.imageAttribution && <p className="mt-1 text-xs text-neutral-500">Görsel: {item.imageAttribution}</p>}{item.warning && <p className="mt-2 text-sm leading-6 text-amber-300">{item.warning}</p>}<p className="mt-4 border-t border-neutral-800 pt-3 text-sm text-neutral-400">Araç ayrıntısını aç →</p></div></Link><div className="border-t border-neutral-800 p-4"><button type="button" onClick={() => onPhase2(item.id)} className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-left text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300">Bu kararı beğendim, aracı daha yakından tanımak istiyorum.</button></div></article>)}
  </div>;
}
  const storageKey = "expiya:cars-conversation:v3.8-pilot";

const formatBudgetTry = (value: string): string => {
  const digits = value.replace(/[^\d]/gu, "").replace(/^0+(?=\d)/u, "");
  return digits ? Number(digits).toLocaleString("tr-TR") : "";
};

export function CarsConversationV3({ initialQuery = "", minimumBudgetTry }: { readonly initialQuery?: string; readonly minimumBudgetTry: number }) {
  const router = useRouter();
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const [conversationId, setConversationId] = useState(() => crypto.randomUUID()); const [state, setState] = useState<V3ConversationState>();
  const [messages, setMessages] = useState<Message[]>([]); const [draft, setDraft] = useState(""); const [loading, setLoading] = useState(false); const [archiving, setArchiving] = useState(false); const [archiveError, setArchiveError] = useState<string>();
  const [stateToken, setStateToken] = useState<string>();
  const [selectedChoices, setSelectedChoices] = useState<Readonly<Record<string, readonly string[]>>>({});
  const [recommendationTermsChecked, setRecommendationTermsChecked] = useState(false);
  const [budgetDraft, setBudgetDraft] = useState("");
  const [budgetEditorOpen, setBudgetEditorOpen] = useState(false);
  const [restored, setRestored] = useState(false);
  const budgetMode = state?.budgetMode ?? "NEEDS_ONLY";
  const budgetFilterEnabled = budgetMode === "BUDGET_AS_DECISION_FILTER" || budgetEditorOpen;
  const latestVariantCounts = [...messages].reverse().find((message) => message.variantCounts)?.variantCounts;
  const latestAssistantMessageId = [...messages].reverse().find((message) => message.role === "assistant")?.id;
  const recommendationTermsRequired = Boolean([...messages].reverse().find((message) => message.role === "assistant")?.trace?.offerAwaitingConsent);
  useEffect(() => { try { const stored = JSON.parse(sessionStorage.getItem(storageKey) ?? "null") as { state?: V3ConversationState; stateToken?: string; messages?: Message[] } | null; if (stored?.state?.version === "3.8") { setConversationId(stored.state.conversationId); setState(stored.state); setStateToken(stored.stateToken); setMessages(stored.messages ?? []); } } finally { setRestored(true); } }, []);
  useEffect(() => { if (restored) sessionStorage.setItem(storageKey, JSON.stringify({ state, stateToken, messages })); }, [messages, restored, state, stateToken]);
  useEffect(() => { conversationEndRef.current?.scrollIntoView({ block: "nearest" }); }, [loading, messages]);
  async function openPhase2(exactVariantId: string) {
    if (!stateToken || !state?.recommendationTermsAcceptance) return;
    setLoading(true);
    try { const response = await fetch("/api/cars/sales-advisor/handoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: state.conversationId, stateToken, offerId: state.recommendationTermsAcceptance.offerId, selectedExactVariantId: exactVariantId }) }); const payload = await response.json() as { token?: string; error?: string }; if (!response.ok || !payload.token) throw new Error(payload.error ?? "Aşama 2 geçişi doğrulanamadı"); router.push(`/cars/variant/${encodeURIComponent(exactVariantId)}?handoff=${encodeURIComponent(payload.token)}`); } catch (error) { setArchiveError(error instanceof Error ? error.message : "Aşama 2 geçişi doğrulanamadı"); setLoading(false); }
  }
  async function send(content: string, recommendationTermsAcceptance?: RecommendationTermsAcceptance) {
    if (!content.trim() || loading) return; const user: Message = { id: crypto.randomUUID(), role: "user", content: content.trim() };
    setMessages((current) => [...current, user]); setDraft(""); setLoading(true);
    try {
      const response = await fetch("/api/cars/conversation/v3", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: state?.conversationId ?? conversationId, messageId: user.id, message: user.content, expectedRevision: state?.revision ?? 0, stateToken, includePilotDiagnostics: true, recommendationTermsAcceptance }) });
      const payload = await response.json() as V3PublicResponse | { message: string };
      if (!response.ok || !("state" in payload)) throw new Error(payload.message);
      setState(payload.state); setStateToken(payload.stateToken); setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: payload.message, recommendations: payload.recommendations, variantCounts: payload.variantCounts, trace: { revision: payload.state.revision, purchaseIntent: payload.state.purchaseIntent, route: payload.state.lastRoute, lastQuestionKey: payload.state.lastQuestionKey, ledger: payload.state.ledger, offerAwaitingConsent: Boolean(payload.offerAwaitingConsent) } }]);
    } catch { setMessages((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: "Şu anda yanıt veremiyorum; mesajın tarayıcında korundu. Lütfen yeniden dene." }]); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (!initialQuery.trim() || !restored || messages.length > 0) return; const timer = window.setTimeout(() => void send(initialQuery), 0); return () => window.clearTimeout(timer); }, [initialQuery, restored]); // eslint-disable-line react-hooks/exhaustive-deps
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
  function toggleChoice(messageId: string, choice: QuickChoice, multiple: boolean) {
    setSelectedChoices((current) => { const selected = current[messageId] ?? []; const next = choice.exclusive || !multiple ? [choice.value] : selected.includes(choice.value) ? selected.filter((item) => item !== choice.value) : [...selected.filter((item) => !item.startsWith("Bu seçeneklerden hiçbiri") && item !== "Yakıt türünü birlikte değerlendirelim" && item !== "Her ikisi de olabilir"), choice.value]; return { ...current, [messageId]: next }; });
  }
  function sendChoices(message: Message) { const selected = selectedChoices[message.id] ?? []; if (!selected.length) return; const key = message.trace?.lastQuestionKey ?? ""; const content = key.startsWith("verifiedEquipment:") && selected.length > 1 ? `${selected.join(" ve ")} benim için vazgeçilmez.` : key === "fuelType" && selected.length > 1 ? `${selected.join(" veya ")} olabilir.` : selected.join(" ve "); void send(content); }
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
  return <main className="min-h-screen bg-neutral-950 px-4 py-8 text-neutral-50"><section className="mx-auto flex min-h-[80vh] max-w-3xl flex-col rounded-3xl border border-neutral-800 bg-neutral-900 shadow-2xl">
    <header className="flex items-start justify-between gap-4 border-b border-neutral-800 px-6 py-5"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">Expiya Cars</p><h1 className="mt-1 text-2xl font-semibold">Araç danışmanın</h1><p className="mt-1 text-sm text-neutral-400">İhtiyacını konuşalım, seçimi birlikte sadeleştirelim.</p>{latestVariantCounts && <div className="mt-3 inline-flex items-center gap-3 rounded-full border border-emerald-800 bg-emerald-950/60 px-3 py-1.5 text-sm"><span><strong>{latestVariantCounts.total}</strong> toplam varyant</span><span className="text-emerald-300"><strong>{latestVariantCounts.remaining}</strong> seçenek kaldı</span></div>}</div><button type="button" onClick={() => void archiveAndDelete()} disabled={!messages.length || loading || archiving} className="min-h-11 shrink-0 rounded-xl border border-red-900 px-3 py-2 text-sm text-red-300 disabled:cursor-not-allowed disabled:opacity-40">{archiving ? "Kaydediliyor…" : "Görüşmeyi sil"}</button></header>
    <section aria-labelledby="budget-mode-title" className="border-b border-neutral-800 bg-neutral-950/40 px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="budget-mode-title" className="text-sm font-semibold text-neutral-200">Bütçeyi filtrele</h2><p className="mt-1 text-xs leading-5 text-neutral-400">Kapalıyken seçim yalnız ihtiyaçlarına göre yapılır. Açtığında belirlediğin üst sınır adayları eler.</p></div>
        <button type="button" role="switch" aria-checked={budgetFilterEnabled} aria-label="Bütçeyi karar filtresi olarak kullan" disabled={loading} onClick={toggleBudgetFilter} className={`relative h-11 w-16 overflow-hidden rounded-full border transition-colors ${budgetFilterEnabled ? "border-emerald-500 bg-emerald-600" : "border-neutral-600 bg-neutral-800"}`}><span aria-hidden="true" className={`absolute left-1 top-1 h-9 w-9 rounded-full bg-white shadow transition-transform duration-200 motion-reduce:transition-none ${budgetFilterEnabled ? "translate-x-5" : "translate-x-0"}`}/></button>
      </div>
      {budgetFilterEnabled && <form onSubmit={submitBudget} className="mt-4"><div className="flex flex-wrap gap-2"><label className="min-w-56 flex-1"><span className="sr-only">Kesin bütçe üst sınırı</span><div className="flex items-center rounded-xl border border-neutral-700 bg-neutral-900 px-3 focus-within:border-emerald-500"><input inputMode="numeric" autoComplete="off" value={budgetDraft} disabled={loading} onChange={(event) => setBudgetDraft(formatBudgetTry(event.target.value))} placeholder={state?.budgetMetadata ? state.budgetMetadata.amountTry.toLocaleString("tr-TR") : "Örn. 3.200.000"} className="min-w-0 flex-1 bg-transparent py-2.5 outline-none"/><span className="text-sm text-neutral-400">TL</span></div></label><button type="submit" disabled={loading || Number(budgetDraft.replace(/[^\d]/gu, "")) < minimumBudgetTry} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">Üst sınırı uygula</button></div><p className={`mt-2 text-xs ${budgetDraft && Number(budgetDraft.replace(/[^\d]/gu, "")) < minimumBudgetTry ? "text-red-300" : "text-neutral-400"}`}>Aktif katalogdaki en düşük araç fiyatı: {minimumBudgetTry.toLocaleString("tr-TR")} TL. Bunun altında bir üst sınır uygulanamaz.</p></form>}
      {budgetFilterEnabled && !state?.budgetMetadata && <p role="status" className="mt-3 text-xs text-amber-300">Üst sınır henüz uygulanmadı. Tutarı girip “Üst sınırı uygula” düğmesine bas.</p>}
      {state?.budgetMetadata && <p className={`mt-3 text-xs ${state.budgetMetadata.includedInDecision ? "text-emerald-300" : "text-amber-300"}`}>{state.budgetMetadata.amountTry.toLocaleString("tr-TR")} TL bütçe {state.budgetMetadata.includedInDecision ? "karar filtresine dahil" : "kaydedildi; karar filtresine dahil edilmedi"}.</p>}
    </section>
    {archiveError && <p role="alert" className="border-b border-red-900 bg-red-950/40 px-6 py-3 text-sm text-red-300">{archiveError}</p>}
    <div className="flex-1 space-y-4 overflow-y-auto p-6" role="log" aria-live="polite" aria-relevant="additions text">{messages.length === 0 && <div className="rounded-2xl bg-neutral-800 p-4 text-neutral-200">Merhaba! Nasıl bir araç aradığını anlatabilir veya sadece sohbet ederek başlayabilirsin.</div>}{messages.map((message) => <ConversationMessage key={message.id} message={message} selected={selectedChoices[message.id] ?? []} interactive={!loading && message.id === latestAssistantMessageId} termsChecked={recommendationTermsChecked} onTermsChecked={setRecommendationTermsChecked} onAcceptTerms={acceptRecommendationTermsAndReveal} onDeclineTerms={() => void send("Şimdilik gösterme.")} onToggle={(choice, multiple) => toggleChoice(message.id, choice, multiple)} onSend={() => sendChoices(message)} onPhase2={(exactVariantId) => void openPhase2(exactVariantId)}/>)}{loading && <p className="text-sm text-neutral-400">Düşünüyorum…</p>}<div ref={conversationEndRef}/></div>
    <form onSubmit={submit} className="flex gap-3 border-t border-neutral-800 p-4"><textarea aria-label="Mesajınız" value={draft} disabled={recommendationTermsRequired || loading} onChange={(event) => setDraft(event.target.value)} onKeyDown={submitOnEnter} rows={2} className="min-h-12 flex-1 resize-none rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50" placeholder={recommendationTermsRequired ? "Devam etmek için yukarıdaki seçimi kullan…" : "Mesajını yaz…"}/><button disabled={loading || recommendationTermsRequired || !draft.trim()} className="rounded-2xl bg-emerald-600 px-5 font-semibold disabled:opacity-40">Gönder</button></form>
  </section></main>;
}
