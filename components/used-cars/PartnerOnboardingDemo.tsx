import { DEMO_ONBOARDING_GATES, canDemoDealerPublish } from "@/features/used-cars/demo/onboarding";
import { PartnerDemoNav } from "./PartnerDemoNav";

const style = { COMPLETE: "bg-emerald-100 text-emerald-900", ACTION_REQUIRED: "bg-amber-100 text-amber-900", LOCKED: "bg-stone-200 text-stone-600" } as const;
const label = { COMPLETE: "Tamamlandı", ACTION_REQUIRED: "İncelemede", LOCKED: "Kilitli" } as const;

export function PartnerOnboardingDemo() {
  const eligible = canDemoDealerPublish(DEMO_ONBOARDING_GATES);
  return <main className="min-h-[calc(100vh-73px)] bg-[#f3f3ef]"><PartnerDemoNav active="/ikinciel/partner-demo/onboarding"/><div className="mx-auto max-w-5xl px-5 py-10 lg:px-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-black uppercase tracking-widest text-emerald-700">Sentetik firma kurulumu</p><h1 className="mt-2 text-4xl font-black tracking-tight">Yayın yetkisi kazanılmadan önce</h1><p className="mt-3 max-w-2xl text-stone-600">Üyelik hesabı açılması yayınlama hakkı vermez. Her kapı ayrı sahip, kanıt ve audit kaydıyla kapanır.</p></div><div className={`rounded-2xl px-5 py-3 text-sm font-black ${eligible ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>{eligible ? "Yayın uygun" : "Yayın kapalı"}</div></div>
    <div className="mt-9 overflow-hidden rounded-3xl border border-stone-200 bg-white">{DEMO_ONBOARDING_GATES.map((gate,index) => <article key={gate.id} className="grid gap-4 border-b border-stone-100 p-6 last:border-0 sm:grid-cols-[48px_1fr_auto] sm:items-center"><div className={`grid h-11 w-11 place-items-center rounded-full font-black ${gate.status === "COMPLETE" ? "bg-emerald-900 text-white" : "bg-stone-100 text-stone-500"}`}>{gate.status === "COMPLETE" ? "✓" : index + 1}</div><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-black">{gate.title}</h2><span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider">Sahip: {gate.owner === "DEALER" ? "Firma" : "Expiya"}</span></div><p className="mt-1 text-sm text-stone-600">{gate.description}</p></div><span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${style[gate.status]}`}>{label[gate.status]}</span></article>)}</div>
    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><strong>Fail-closed:</strong> Firma askıya alınır, sözleşme veya ödeme geçersizleşirse bütün stoklar public projection’dan otomatik kaldırılır.</div></div></main>;
}

