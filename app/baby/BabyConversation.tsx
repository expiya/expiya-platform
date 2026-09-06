"use client";
import { FormEvent, KeyboardEvent, useState } from "react";
import { STROLLER_PRODUCTS } from "@/features/baby/catalog";
import { BABY_EXPERIENCE } from "@/features/xpy/visualPacks";
import { XpyAssistantBubble, XpyComposer, XpyHeader, XpyStageOneFrame, XpyTranscript, XpyUserBubble } from "@/components/xpy/XpyPresentation";

const questions = [
  "Önce kullanım aşamasını netleştirelim: yenidoğandan itibaren kullanım gerekiyor mu?",
  "Bebek arabasını sık sık merdivende veya elde taşıyacak mısınız?",
  "Küçük bagaj ya da dar bir saklama alanı için katlı ölçü kritik mi?",
  "Travel sistem uyumu sizin için gerekli mi? Oto koltuğu ve adaptörün ayrıca satılabileceğini hesaba katacağım.",
] as const;
type Entry = { user?: string; reply: string };
export default function BabyConversation({ embedded = false }: { readonly embedded?: boolean }) {
  const [entries, setEntries] = useState<Entry[]>([{ reply: "Bebek arabalarında en önemli farklar çocuğun kullanım aşaması, taşıma ağırlığı, katlı ölçü ve gerekli aksesuarların dahil olup olmamasıdır. Genel bilgi mi istersiniz, yoksa birlikte seçim yapalım mı?" }]);
  const [draft, setDraft] = useState(""); const [step, setStep] = useState(-1); const [authorized, setAuthorized] = useState<string>();
  function submit(event: FormEvent) { event.preventDefault(); const message = draft.trim(); if (!message) return; const normalized = message.toLocaleLowerCase("tr-TR"); let reply: string; let next = step;
    if (/nedir|ne demek|farkı|farki|bilgi/u.test(normalized)) reply = "Travel sistem uyumu, uyumlu bir portbebe veya bebek oto koltuğunun şasiye bağlanabilmesidir; bu parçaların kutuya dahil olduğu anlamına gelmez. Yenidoğan kullanımı da yalnız üreticinin belirttiği yatış veya portbebe koşuluyla kabul edilir. Seçime dönmek isterseniz kullanımınızı anlatın.";
    else if (/seç|sec|öner|yardım|yardim|evet/u.test(normalized) && step < 0) { next = 0; reply = questions[0]; }
    else if (step >= 0 && step < questions.length - 1) { next = step + 1; reply = questions[next]; }
    else { next = questions.length; reply = "Doğrulanmış bilgiler tek bir modeli üstün kılmıyor. Bilinmeyen alanları avantaj saymadan aşağıdaki exact Türkiye adaylarından birini incelemek için model adını yazabilirsiniz: " + STROLLER_PRODUCTS.map(p => `${p.manufacturer} ${p.model}`).join(", "); const product = STROLLER_PRODUCTS.find(p => normalized.includes(p.model.split(" ")[0]!.toLocaleLowerCase("tr-TR"))); if (product) { setAuthorized(product.exactProductId); reply = `${product.manufacturer} ${product.model} için karar kartı, bu açık seçiminizden sonra yetkilendirildi.`; } }
    setEntries(current => [...current, { user: message, reply }]); setDraft(""); setStep(next);
  }
  const product = STROLLER_PRODUCTS.find(row => row.exactProductId === authorized);
  const keyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } };
  return <XpyStageOneFrame adapter={BABY_EXPERIENCE} embedded={embedded}><XpyHeader title="Bebek arabası" description="Tek seferde bir soruyla, yalnız doğrulanmış Türkiye ürün bilgilerine dayanarak ilerler."/><XpyTranscript>{entries.map((entry, index) => <div key={index} className="space-y-2">{entry.user && <XpyUserBubble>{entry.user}</XpyUserBubble>}<XpyAssistantBubble>{entry.reply}</XpyAssistantBubble></div>)}{product && <article className="rounded-2xl border border-stone-700 bg-stone-950 p-5 text-white"><span className="text-xs font-semibold text-emerald-300">Yetkili karar kartı</span><h2 className="mt-2 text-2xl font-semibold">{product.manufacturer} {product.model}</h2><p className="mt-2 text-sm text-stone-300">{product.configurationIdentity}</p><dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><div><dt className="text-stone-400">Azami çocuk ağırlığı</dt><dd>{String(product.facts.childWeightMaxKg)} kg</dd></div><div><dt className="text-stone-400">Bebek arabası ağırlığı</dt><dd>{String(product.facts.strollerWeightKg)} kg</dd></div><div><dt className="text-stone-400">Katlı ölçü</dt><dd>{Array.isArray(product.facts.foldedMm) ? product.facts.foldedMm.join(" × ") + " mm" : "Bilinmiyor"}</dd></div><div><dt className="text-stone-400">Travel sistem</dt><dd>{product.facts.travelSystemCompatible === true ? "Uyumlu; bileşenler ayrıca satılabilir" : "Bilinmiyor"}</dd></div></dl><p className="mt-4 text-xs leading-5 text-amber-200">Azami ağırlık gelişimsel uygunluk garantisi değildir. Eksik bilgiler bilinmiyor olarak korunur.</p></article>}</XpyTranscript><XpyComposer id="baby-message" onSubmit={submit} value={draft} onChange={setDraft} onKeyDown={keyDown} placeholder="İhtiyacınızı veya sorunuzu yazın…" disabled={false}/></XpyStageOneFrame>;
}
