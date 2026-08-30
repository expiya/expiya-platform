"use client";

import { useEffect, useRef, useState } from "react";
import type { PaidComparisonAdvisorReply, PaidComparisonAdvisorReport, PaidComparisonSalesIntent } from "@/features/paid-comparison/advisor";

type Message = { readonly id: string; readonly role: "user" | "assistant"; readonly text: string; readonly action?: NonNullable<PaidComparisonAdvisorReply["action"]> };

export function PaidReportAdvisor({ report, sample, onSalesAction }: { readonly report: PaidComparisonAdvisorReport; readonly sample: boolean; readonly onSalesAction: (exactVariantId: string, intent: PaidComparisonSalesIntent) => Promise<void> }) {
  const [messages, setMessages] = useState<Message[]>([]); const [draft, setDraft] = useState(""); const [sending, setSending] = useState(false); const [turns, setTurns] = useState(0); const end = useRef<HTMLDivElement>(null);
  useEffect(() => { if (messages.length) end.current?.scrollIntoView({ block: "nearest" }); }, [messages]);
  const ended = turns >= 10;
  async function submit(event: React.FormEvent) {
    event.preventDefault(); const question = draft.trim(); if (!question || sending || ended || sample) return;
    const messageId = crypto.randomUUID(); setDraft(""); setSending(true); setMessages((current) => [...current, { id: messageId, role: "user", text: question }]);
    try {
      const response = await fetch("/api/cars/paid-comparison/advisor", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageId, question }) });
      const body = await response.json() as PaidComparisonAdvisorReply & { message?: string }; if (!response.ok) throw new Error(body.message ?? "Yanıt hazırlanamadı.");
      if (body.turn) setTurns(body.turn.used);
      setMessages((current) => [...current, ...body.messages.map((text, index) => ({ id: `${messageId}:${index}`, role: "assistant" as const, text, ...(index === body.messages.length - 1 && body.action ? { action: body.action } : {}) }))]);
    } catch (reason) { setMessages((current) => [...current, { id: `${messageId}:error`, role: "assistant", text: reason instanceof Error ? reason.message : "Yanıt hazırlanamadı." }]); }
    finally { setSending(false); }
  }
  return <section className="mt-8 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm" aria-labelledby="paid-report-advisor-title">
    <header className="flex items-center gap-3 bg-neutral-950 px-5 py-5 text-white sm:px-6"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400 font-bold text-neutral-950">E</span><div><h2 id="paid-report-advisor-title" className="font-semibold">Karşılaştırma danışmanı</h2><p className="text-xs text-neutral-400">Yalnız raporundaki üç araç · bağlayıcı teklif değildir</p></div><span className="ml-auto rounded-full border border-white/20 px-3 py-1 text-xs">{turns}/10</span></header>
    <div className="max-h-[28rem] min-h-56 space-y-3 overflow-y-auto bg-neutral-50 p-4" aria-live="polite">
      <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-white p-4 text-sm leading-6 shadow-sm">{sample ? "Örnek raporda danışman devre dışıdır. Satın alınan raporda üç aracı ihtiyaçlarına göre yorumlayabilir, karşılaştırabilir ve seçtiğin araç için satış adımını hazırlayabilirim." : `Rapordaki ${report.vehicles.map((vehicle) => `${vehicle.identity.brand} ${vehicle.identity.model}`).join(", ")} arasında fiyat, menzil, tüketim, güç, bagaj ve şarj gibi farkları açıklayabilirim. Seçtiğin araç için fiyat teklifi, test sürüşü veya satıcı iletişimi adımına da yönlendirebilirim.`}</div>
      {messages.map((message) => <div key={message.id} className={`max-w-[92%] rounded-2xl p-4 text-sm leading-6 ${message.role === "user" ? "ml-auto rounded-tr-sm bg-neutral-900 text-white" : "rounded-tl-sm bg-white shadow-sm"}`}><p>{message.text}</p>{message.action ? <button type="button" onClick={() => void onSalesAction(message.action!.exactVariantId, message.action!.intent)} className="mt-3 rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-600">{message.action.label}</button> : null}</div>)}<div ref={end} />
    </div>
    <form onSubmit={submit} className="border-t border-neutral-200 p-3"><div className="flex gap-2"><label htmlFor="paid-report-advisor-question" className="sr-only">Karşılaştırma danışmanına sor</label><input id="paid-report-advisor-question" value={draft} onChange={(event) => setDraft(event.target.value)} disabled={sample || sending || ended} placeholder={sample ? "Örnek raporda kullanılamaz" : ended ? "10 soruluk görüşme tamamlandı" : "Üç araç arasındaki farkı sor…"} className="min-w-0 flex-1 rounded-full bg-neutral-100 px-4 py-3 text-sm outline-none ring-emerald-600 focus:ring-2 disabled:opacity-60"/><button disabled={sample || sending || ended || !draft.trim()} className="min-h-11 rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white disabled:opacity-40">Gönder</button></div><p className="mt-2 px-2 text-xs text-neutral-500">En fazla 10 soru. Danışman yalnız bu rapordaki üç aracı ve güvenli satış geçişlerini kullanır.</p></form>
  </section>;
}
