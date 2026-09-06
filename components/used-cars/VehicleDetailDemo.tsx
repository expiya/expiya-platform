"use client";

import { useState } from "react";
import Link from "next/link";
import type { DemoUsedCar } from "@/features/used-cars/demo/catalog";
import { formatTry } from "@/features/used-cars/demo/catalog";
import { buildDemoVehicleFacts, demoTrustLabel, type DemoTrustClass } from "@/features/used-cars/demo/trust";
import { dryRunDemoLead } from "@/features/used-cars/demo/leadDryRun";
import type { UsedCarLeadIntent } from "@/features/used-cars/lead-handoff/contracts";

const badge: Record<DemoTrustClass, string> = {
  EXPIYA_VERIFIED: "bg-emerald-100 text-emerald-900", DEALER_DECLARED: "bg-sky-100 text-sky-900",
  DOCUMENT_UNVERIFIED: "bg-amber-100 text-amber-900", MISSING: "bg-red-100 text-red-900",
};

export function VehicleDetailDemo({ car }: { readonly car: DemoUsedCar }) {
  const [leadOpen, setLeadOpen] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [intent, setIntent] = useState<UsedCarLeadIntent>("REQUEST_DEALER_CONTACT");
  const [leadErrors, setLeadErrors] = useState<readonly string[]>([]);
  const vehicleFacts = buildDemoVehicleFacts(car);
  return <main className="mx-auto max-w-7xl px-5 py-9 lg:px-8">
    <Link href="/ikinciel/eslestirme" className="text-sm font-bold text-stone-600">← Eşleştirmeye dön</Link>
    <div className="mt-5 grid gap-7 lg:grid-cols-[1fr_390px]"><section>
      <div className={`relative h-72 overflow-hidden rounded-[2rem] bg-gradient-to-br ${car.accent}`}><span className="absolute left-6 top-6 rounded-full bg-amber-300 px-3 py-1 text-xs font-black text-amber-950">SENTETİK ARAÇ · GERÇEK İLAN DEĞİL</span><div className="absolute bottom-7 left-7 text-white"><p className="text-sm font-bold text-white/70">{car.year} · {car.mileageKm.toLocaleString("tr-TR")} km</p><h1 className="mt-1 text-4xl font-black">{car.title}</h1><p className="mt-1 text-white/80">{car.trim}</p></div></div>
      <div className="mt-7 rounded-3xl border border-stone-200 bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-emerald-700">Alan bazlı güven görünümü</p><h2 className="mt-2 text-2xl font-black">Neyi, kim söylüyor?</h2></div><span className="text-xs text-stone-500">Tek bir genel “doğrulandı” rozeti yoktur</span></div><div className="mt-6 divide-y divide-stone-100">{vehicleFacts.map(fact => <div key={fact.label} className="grid gap-2 py-4 sm:grid-cols-[150px_1fr_auto]"><strong className="text-sm">{fact.label}</strong><div><div className="font-bold">{fact.value}</div><div className="mt-1 text-xs text-stone-500">Kaynak: {fact.source}{fact.checkedAt ? ` · ${fact.checkedAt}` : ""}</div></div><span className={`h-fit w-fit rounded-full px-3 py-1 text-xs font-black ${badge[fact.trustClass]}`}>{demoTrustLabel[fact.trustClass]}</span></div>)}</div></div>
      <div className="mt-7 rounded-3xl bg-stone-950 p-6 text-white"><p className="text-xs font-black uppercase tracking-widest text-emerald-300">Güvenli kontrol planı</p><h2 className="mt-2 text-2xl font-black">Görüşmeden önce ve sonra</h2><ol className="mt-5 grid gap-3 sm:grid-cols-2">{["VIN’i satıcıyla teyit edin; public alanda paylaşmayın.","Bakım belgelerinin servis ve tarihlerle tutarlılığını kontrol edin.","Yetkili geçmiş sorgularını kendi erişiminizle yapın.","Satıcıdan bağımsız bir ekspertiz kuruluşu seçin."].map((item,index) => <li key={item} className="rounded-2xl bg-white/10 p-4 text-sm leading-6"><strong className="mr-2 text-emerald-300">0{index+1}</strong>{item}</li>)}</ol><p className="mt-5 text-xs text-stone-400">Expiya bu araç için “al” veya “alma” talimatı vermez.</p></div>
    </section><aside className="h-fit rounded-3xl border border-stone-200 bg-white p-6 lg:sticky lg:top-5"><p className="text-sm text-stone-500">Sentetik satış fiyatı</p><p className="mt-1 text-3xl font-black">{formatTry(car.priceTry)}</p><div className="mt-5 rounded-2xl bg-stone-100 p-4"><p className="text-xs text-stone-500">Kurumsal demo satıcı</p><strong className="mt-1 block">{car.seller}</strong><span className="text-sm text-stone-600">{car.city} · Firma üyeliği araç garantisi değildir</span></div><button type="button" onClick={() => setLeadOpen(true)} className="mt-5 w-full rounded-xl bg-emerald-900 px-5 py-4 font-black text-white">Görüşme talebi oluştur</button><p className="mt-3 text-center text-xs text-stone-500">Demo talep hiçbir sisteme veya firmaya gönderilmez.</p>
      {leadOpen && <div className="mt-6 border-t border-stone-200 pt-6">{submitted ? <div className="rounded-2xl bg-emerald-50 p-5 text-emerald-950"><strong>Demo dry-run tamamlandı</strong><p className="mt-2 text-sm">Şema ve rıza kontrolleri geçti. Hiçbir kişisel veri kaydedilmedi veya aktarılmadı.</p></div> : <form onSubmit={event => { event.preventDefault(); const result=dryRunDemoLead({listingId:`listing-${car.id}`,inventoryUnitId:car.id,intent,consentGranted:consent}); setLeadErrors(result.errorCodes); if(result.accepted)setSubmitted(true); }}><h2 className="font-black">Talep tercihi</h2><div className="mt-3 grid grid-cols-1 gap-2">{[["REQUEST_DEALER_CONTACT","Telefon görüşmesi"],["REQUEST_TEST_DRIVE","Test sürüşü"],["REQUEST_QUOTE","Fiyat teklifi"]].map(([value,label]) => <label key={value} className={`rounded-xl border p-3 text-xs font-bold ${intent===value?"border-emerald-800 bg-emerald-50":"border-stone-200"}`}><input type="radio" name="intent" checked={intent===value} onChange={()=>setIntent(value as UsedCarLeadIntent)} className="mr-2 accent-emerald-800"/>{label}</label>)}</div><label className="mt-4 block text-sm font-bold">Telefon (sentetik ve maskeli)<input value="05•• ••• •• 18" readOnly className="mt-2 w-full rounded-xl border border-stone-300 bg-stone-50 px-4 py-3 font-normal"/></label><label className="mt-4 flex items-start gap-3 text-xs leading-5 text-stone-600"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-1 accent-emerald-800"/><span>Bu araç için iletişim bilgilerimin yalnız seçili kurumsal demo satıcıyla paylaşılmasını kabul ediyorum. Pazarlama izni değildir.</span></label>{leadErrors.length>0&&<p className="mt-3 text-xs font-bold text-red-700">{leadErrors.join(" · ")}</p>}<button disabled={!consent} className="mt-4 w-full rounded-xl bg-emerald-900 px-4 py-3 font-black text-white disabled:bg-stone-300 disabled:text-stone-600">Demo talebi dry-run</button></form>}</div>}
    </aside></div>
  </main>;
}
