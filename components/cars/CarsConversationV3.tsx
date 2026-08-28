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
  if (message.role === "user") return <div className="ml-auto flex max-w-[88%] items-end gap-2 sm:max-w-[78%]"><div className="rounded-2xl rounded-br-md bg-emerald-100 px-3.5 py-2.5 text-[15px] text-emerald-950 shadow-sm ring-1 ring-emerald-200 dark:bg-emerald-800 dark:text-white dark:ring-emerald-700"><p className="whitespace-pre-wrap leading-6">{message.content}</p></div></div>;
  const choiceGroup = interactive ? quickChoices(message) : undefined;
  const parts = assistantMessageParts(buttonPrompt(message, Boolean(choiceGroup)));
  return <div className="max-w-[92%] space-y-1.5 sm:max-w-[82%]">
    {parts.map((part, index) => <div key={`${message.id}:part:${index}`} className="rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[15px] text-stone-800 shadow-sm ring-1 ring-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:ring-stone-700"><p className="whitespace-pre-wrap leading-6">{part}</p></div>)}
    {choiceGroup && <div className="rounded-2xl border border-stone-200 bg-white/90 p-2.5 shadow-sm dark:border-stone-700 dark:bg-stone-900" role="group" aria-label="Yanıt seçenekleri">
      <div className="grid gap-1.5">{choiceGroup.choices.map((choice) => { const active = selected.includes(choice.value); return <button key={choice.value} type="button" aria-pressed={active} onClick={() => onToggle(choice, choiceGroup.multiple)} className={`rounded-xl border px-3 py-2 text-left text-sm transition ${active ? "border-emerald-600 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-500 dark:bg-emerald-950 dark:text-emerald-100" : "border-stone-200 bg-stone-50 text-stone-900 hover:border-stone-400 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:hover:border-stone-500"}`}><span className="block font-semibold">{choice.label}</span><span className="mt-0.5 block text-xs leading-5 text-stone-500 dark:text-stone-400">{choice.description}</span></button>; })}</div>
      <button type="button" disabled={!selected.length} onClick={onSend} className="mt-2.5 w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">{selected.length > 1 ? `${selected.length} seçimi gönder` : "Seçimi gönder"}</button>
    </div>}
    {interactive && message.trace?.offerAwaitingConsent && <div className="rounded-2xl border border-neutral-600 bg-neutral-950 p-4 text-sm text-neutral-100">
      <p className="font-semibold">Aracı göstermeden önce</p>
      <p className="mt-2 leading-6 text-neutral-300">Öneri; beyan ettiğin tercihler ile tarihli katalog kaynaklarının yapay zekâ destekli ve kural tabanlı değerlendirilmesidir. Satış teklifi, garanti veya ekspertiz değildir.</p>
      <label className="mt-4 flex cursor-pointer items-start gap-3"><input type="checkbox" checked={termsChecked} onChange={(event) => onTermsChecked(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-500"/><span><Link href="/arac-oneri-kosullari?returnTo=%2F" className="font-semibold underline underline-offset-4">Araç Önerisi ve Katalog Kullanım Koşulları’nı</Link> ({RECOMMENDATION_TERMS_VERSION}) okudum ve kabul ediyorum.</span></label>
      <button type="button" onClick={onAcceptTerms} disabled={!termsChecked} className="mt-4 w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40">Koşulları kabul et ve aracı göster</button>
      <button type="button" onClick={onDeclineTerms} className="mt-2 w-full rounded-xl border border-neutral-700 px-5 py-3 font-semibold">Kabul etmeden sohbete devam et</button>
      <p className="mt-3 text-xs leading-5 text-neutral-400">Kabul etmezsen araç kartı gösterilmez. KVKK aydınlatması ve diğer izinler bu kabulden ayrıdır.</p>
    </div>}
    {message.variantCounts && <p className="px-1 pt-1 text-[11px] text-stone-500 dark:text-stone-400">{message.variantCounts.total} varyant içinden {message.variantCounts.remaining} seçenek kaldı</p>}
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
  const [messages, setMessages] = useState<Message[]>([]); const [draft, setDraft] = useState(""); const [loading, setLoading] = useState(false); const [archiveError, setArchiveError] = useState<string>();
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
  function persistConversationBeforeNavigation() {
    sessionStorage.setItem(storageKey, JSON.stringify({ state, stateToken, messages }));
  }
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
  function deleteConversation() {
    if (!messages.length || loading) return;
    sessionStorage.removeItem(storageKey);
    setConversationId(crypto.randomUUID()); setState(undefined); setStateToken(undefined); setMessages([]); setDraft("");
    setSelectedChoices({}); setRecommendationTermsChecked(false); setBudgetDraft(""); setBudgetEditorOpen(false); setArchiveError(undefined);
  }
  return <main onClickCapture={persistConversationBeforeNavigation} className="min-h-screen bg-[#f4f1eb] px-3 py-4 text-stone-950 dark:bg-stone-950 dark:text-stone-50 sm:px-5 sm:py-8"><section className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-4xl flex-col overflow-hidden rounded-[1.75rem] border border-stone-200 bg-[#ebe7df] shadow-xl dark:border-stone-800 dark:bg-stone-900 sm:min-h-[82vh]">
    <header className="flex items-start justify-between gap-3 border-b border-stone-200 bg-white/90 px-4 py-4 backdrop-blur dark:border-stone-800 dark:bg-stone-950/85 sm:px-6"><div className="min-w-0"><div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white shadow-sm">E</span><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Aşama 1 · Karar görüşmesi</p><h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Araç danışmanın</h1></div></div><p className="mt-2 max-w-xl text-sm text-stone-500 dark:text-stone-400">İhtiyacını konuşalım; seçenekleri birlikte sadeleştirip doğru araca ilerleyelim.</p>{latestVariantCounts && <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800"><span><strong>{latestVariantCounts.remaining}</strong> seçenek kaldı</span><span aria-hidden="true">·</span><span>{latestVariantCounts.total} varyant</span></div>}</div><button type="button" onClick={deleteConversation} disabled={!messages.length || loading} className="min-h-11 shrink-0 rounded-full border border-stone-300 px-3 text-xs font-semibold text-stone-600 transition hover:border-rose-300 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-40 dark:border-stone-700 dark:text-stone-300 dark:hover:border-rose-800 dark:hover:text-rose-300">Görüşmeyi sil</button></header>
    <section aria-labelledby="budget-mode-title" className="border-b border-stone-200 bg-white/60 px-4 py-3 dark:border-stone-800 dark:bg-stone-950/35 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="budget-mode-title" className="text-sm font-semibold text-stone-800 dark:text-stone-200">Bütçeyi karar filtresi yap</h2><p className="mt-0.5 text-xs leading-5 text-stone-500 dark:text-stone-400">İstersen kesin üst sınır belirle; kapalıyken yalnız ihtiyaçlarına odaklanırız.</p></div>
        <button type="button" role="switch" aria-checked={budgetFilterEnabled} aria-label="Bütçeyi karar filtresi olarak kullan" disabled={loading} onClick={toggleBudgetFilter} className={`relative h-11 w-16 overflow-hidden rounded-full border transition-colors ${budgetFilterEnabled ? "border-emerald-500 bg-emerald-600" : "border-neutral-600 bg-neutral-800"}`}><span aria-hidden="true" className={`absolute left-1 top-1 h-9 w-9 rounded-full bg-white shadow transition-transform duration-200 motion-reduce:transition-none ${budgetFilterEnabled ? "translate-x-5" : "translate-x-0"}`}/></button>
      </div>
      {budgetFilterEnabled && <form onSubmit={submitBudget} className="mt-3"><div className="flex flex-wrap gap-2"><label className="min-w-56 flex-1"><span className="sr-only">Kesin bütçe üst sınırı</span><div className="flex items-center rounded-xl border border-stone-300 bg-white px-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-100 dark:border-stone-700 dark:bg-stone-900 dark:focus-within:ring-emerald-950"><input inputMode="numeric" autoComplete="off" value={budgetDraft} disabled={loading} onChange={(event) => setBudgetDraft(formatBudgetTry(event.target.value))} placeholder={state?.budgetMetadata ? state.budgetMetadata.amountTry.toLocaleString("tr-TR") : "Örn. 3.200.000"} className="min-w-0 flex-1 bg-transparent py-2.5 text-stone-900 outline-none dark:text-stone-100"/><span className="text-sm text-stone-500 dark:text-stone-400">TL</span></div></label><button type="submit" disabled={loading || Number(budgetDraft.replace(/[^\d]/gu, "")) < minimumBudgetTry} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Üst sınırı uygula</button></div><p className={`mt-2 text-xs ${budgetDraft && Number(budgetDraft.replace(/[^\d]/gu, "")) < minimumBudgetTry ? "text-rose-700 dark:text-rose-300" : "text-stone-500 dark:text-stone-400"}`}>Aktif katalogdaki en düşük araç fiyatı: {minimumBudgetTry.toLocaleString("tr-TR")} TL. Bunun altında bir üst sınır uygulanamaz.</p></form>}
      {budgetFilterEnabled && !state?.budgetMetadata && <p role="status" className="mt-2 text-xs text-amber-800 dark:text-amber-300">Üst sınır henüz uygulanmadı. Tutarı girip “Üst sınırı uygula” düğmesine bas.</p>}
      {state?.budgetMetadata && <p className={`mt-2 text-xs ${state.budgetMetadata.includedInDecision ? "text-emerald-700 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"}`}>{state.budgetMetadata.amountTry.toLocaleString("tr-TR")} TL bütçe {state.budgetMetadata.includedInDecision ? "karar filtresine dahil" : "kaydedildi; karar filtresine dahil edilmedi"}.</p>}
    </section>
    {archiveError && <p role="alert" className="border-b border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">{archiveError}</p>}
    <div className="flex-1 space-y-2 overflow-y-auto bg-[radial-gradient(circle_at_top,#f5f1e8_0,transparent_42%)] px-3 py-4 dark:bg-[radial-gradient(circle_at_top,#292524_0,transparent_45%)] sm:px-6" role="log" aria-live="polite" aria-relevant="additions text">{messages.length === 0 && <div className="max-w-[92%] rounded-2xl rounded-bl-md bg-white px-3.5 py-2.5 text-[15px] leading-6 text-stone-700 shadow-sm ring-1 ring-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:ring-stone-700 sm:max-w-[82%]">Merhaba! Nasıl bir araç aradığını anlat; istersen yalnızca günlük kullanımından söz ederek başlayabilirsin.</div>}{messages.map((message) => <ConversationMessage key={message.id} message={message} selected={selectedChoices[message.id] ?? []} interactive={!loading && message.id === latestAssistantMessageId} termsChecked={recommendationTermsChecked} onTermsChecked={setRecommendationTermsChecked} onAcceptTerms={acceptRecommendationTermsAndReveal} onDeclineTerms={() => void send("Şimdilik gösterme.")} onToggle={(choice, multiple) => toggleChoice(message.id, choice, multiple)} onSend={() => sendChoices(message)} onPhase2={(exactVariantId) => void openPhase2(exactVariantId)}/>)}{loading && <div className="inline-flex items-center gap-1 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm ring-1 ring-stone-200 dark:bg-stone-800 dark:ring-stone-700" role="status" aria-label="Yanıt hazırlanıyor"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stone-400"/><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stone-400 [animation-delay:150ms]"/><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-stone-400 [animation-delay:300ms]"/></div>}<div ref={conversationEndRef}/></div>
    <form onSubmit={submit} className="flex items-end gap-2 border-t border-stone-200 bg-white/95 p-3 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90 sm:p-4"><textarea aria-label="Mesajınız" value={draft} disabled={recommendationTermsRequired || loading} onChange={(event) => setDraft(event.target.value)} onKeyDown={submitOnEnter} rows={1} className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 text-[15px] text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:focus:ring-emerald-950" placeholder={recommendationTermsRequired ? "Devam etmek için yukarıdaki seçimi kullan…" : "Mesajını yaz…"}/><button disabled={loading || recommendationTermsRequired || !draft.trim()} aria-label="Mesajı gönder" className="flex min-h-12 items-center rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-40">Gönder <span className="ml-2" aria-hidden="true">↑</span></button></form>
  </section></main>;
}
