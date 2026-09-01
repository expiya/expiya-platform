"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DEMO_USED_CARS, formatTry, type DemoRiskLevel } from "@/features/used-cars/demo/catalog";
import { parseDemoMatchNumber } from "@/features/used-cars/demo/preferenceTransfer";
import { runDemoMatching } from "@/features/used-cars/demo/matchingRuntime";
import { parseSelectedCities } from "@/features/used-cars/demo/turkeyCities";

const evidenceLabels = { STRONG: "Güçlü kanıt", PARTIAL: "Kısmi kanıt", LIMITED: "Sınırlı kanıt" } as const;

export function UsedCarsMatcherDemo() {
  const searchParams = useSearchParams();
  const queryRisk = searchParams.get("risk"); const queryBody = searchParams.get("body");
  const budget = parseDemoMatchNumber(searchParams.get("budget"), 1_600_000, 900_000, 1_800_000);
  const risk: DemoRiskLevel = queryRisk === "LOW" || queryRisk === "FLEXIBLE" ? queryRisk : "BALANCED";
  const body: "ALL" | "SUV" | "HATCHBACK" | "SEDAN" = queryBody === "SUV" || queryBody === "HATCHBACK" || queryBody === "SEDAN" ? queryBody : "ALL";
  const brandParam = searchParams.get("brand"); const modelParam = searchParams.get("model");
  const brand = !brandParam || brandParam === "Fark etmez" ? "ALL" : brandParam;
  const model = !modelParam || modelParam === "Fark etmez" ? "ALL" : modelParam;
  const selectedCities = useMemo(() => parseSelectedCities(searchParams.get("cities")), [searchParams]);
  const minimumModelYear = parseDemoMatchNumber(searchParams.get("minYear"), 2020, 1950, 2026);
  const maximumMileageKm = parseDemoMatchNumber(searchParams.get("maxMileage"), 90_000, 0, 500_000);
  const candidateCars = useMemo(() => DEMO_USED_CARS.filter((car) => (brand === "ALL" || car.title.startsWith(`${brand} `)) && (model === "ALL" || car.title === model) && (selectedCities.length === 0 || selectedCities.includes(car.city))), [brand, model, selectedCities]);
  const run = useMemo(() => runDemoMatching(candidateCars,{budget,risk,body,minimumModelYear,maximumMileageKm}), [candidateCars, budget, risk, body, minimumModelYear, maximumMileageKm]);
  const matches = run.matches;
  const [alertStep, setAlertStep] = useState<"FORM" | "VERIFY" | "READY">("FORM");
  const [alertEmail, setAlertEmail] = useState("");
  const [alertCadence, setAlertCadence] = useState<"WEEKLY" | "INSTANT">("WEEKLY");

  return <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Sentetik eşleştirme demosu</p><h1 className="mt-2 text-4xl font-black tracking-tight">Size uygun araçlar</h1><p className="mt-3 max-w-2xl text-stone-600">Sonuçlar gerçek stok değildir. Seçtiğiniz ihtiyaç ve risk sınırları doğrudan uygulanmıştır.</p></div><Link href="/ikinciel/tercihler" className="text-sm font-bold text-stone-600">← Tercihlere dön</Link></div>
    <section>
        <div className="rounded-3xl bg-emerald-950 p-6 text-white"><div className="text-sm text-emerald-200">Uygulanan hard sınırlar</div><div className="mt-2 text-3xl font-black">{minimumModelYear}+ · en fazla {maximumMileageKm.toLocaleString("tr-TR")} km</div><p className="mt-3 text-sm leading-6 text-emerald-100">Şehir: {selectedCities.length ? selectedCities.join(", ") : "Fark etmez"}. Risk koridoru: {risk === "LOW" ? "düşük risk" : risk === "BALANCED" ? "dengeli" : "esnek"}. Hard sınırlar sessizce gevşetilmez.</p></div>
        <div className="mt-6 flex items-center justify-between"><div><h2 className="text-2xl font-black">{matches.length} uygun demo araç</h2>{run.rejectedCount>0 && <p className="mt-1 text-xs text-stone-500">{run.rejectedCount} aday hard sınırlar nedeniyle elendi · {run.rejectionCodes.join(", ")}</p>}</div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-900">GERÇEK İLAN DEĞİL</span></div>
        <div className="mt-4 grid gap-5 xl:grid-cols-2">{matches.map(({ car, result, scorePercent }) => <article key={car.id} className="overflow-hidden rounded-3xl border border-stone-200 bg-white">
          <div className={`relative h-36 bg-gradient-to-br ${car.accent}`}><span className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1 text-xs font-black text-stone-900">Sentetik görsel alanı</span><span className="absolute bottom-5 right-5 text-5xl font-black text-white/20">{car.year}</span></div>
          <div className="p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-stone-500">{car.city} · kurumsal demo</p><h3 className="mt-1 text-2xl font-black">{car.title}</h3><p className="text-sm text-stone-600">{car.trim}</p></div><div className="rounded-2xl bg-emerald-50 px-3 py-2 text-center text-emerald-900"><strong className="block text-xl">%{scorePercent}</strong><span className="text-[10px] font-bold uppercase">uyum</span></div></div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-sm"><div><span className="block text-xs text-stone-500">Model yılı</span><strong>{car.year}</strong></div><div><span className="block text-xs text-stone-500">Kilometre</span><strong>{car.mileageKm.toLocaleString("tr-TR")}</strong></div><div><span className="block text-xs text-stone-500">Fiyat</span><strong>{formatTry(car.priceTry)}</strong></div></div>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold"><span className={`rounded-full px-3 py-1 ${car.evidence === "STRONG" ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900"}`}>{evidenceLabels[car.evidence]}</span><span className="rounded-full bg-stone-100 px-3 py-1">{car.maintenanceDocumented ? "Bakım belgeli" : "Bakım belgesiz"}</span></div>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-stone-200 pt-4 text-center text-xs"><div><strong className="block text-lg">%{Math.round(result.dimensions.needFit*100)}</strong>İhtiyaç</div><div><strong className="block text-lg">%{Math.round(result.dimensions.riskFit*100)}</strong>Risk</div><div><strong className="block text-lg">%{Math.round(result.dimensions.evidenceReadiness*100)}</strong>Kanıt</div></div><div className="mt-4"><p className="text-xs font-black uppercase tracking-wider text-amber-800">Belirsizlikler</p><ul className="mt-2 space-y-1 text-sm text-stone-600">{[...new Set([...car.uncertainties,...result.uncertainties])].map(item => <li key={item}>• {item}</li>)}</ul></div>
          <Link href={`/ikinciel/arac/${car.id}`} className="mt-5 block w-full rounded-xl border border-emerald-800 px-4 py-3 text-center text-sm font-black text-emerald-900">Aracı ve güven sınırlarını incele</Link>
        </div></article>)}</div>
        {matches.length === 0 && <div className="mt-5 rounded-3xl border border-dashed border-stone-300 bg-white p-7 sm:p-10">
          <div className="mx-auto max-w-2xl text-center"><h3 className="text-2xl font-black">Bu sınırlarla demo eşleşme yok</h3><p className="mt-2 text-stone-600">Tercihlerinize uyan kurumsal bir araç stoğa girdiğinde haber almak ister misiniz?</p></div>
          {alertStep === "FORM" ? <form className="mx-auto mt-7 max-w-xl" onSubmit={(event) => { event.preventDefault(); setAlertStep("VERIFY"); }}>
            <fieldset><legend className="text-sm font-black">Bildirim kapsamı</legend><div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className={`rounded-2xl border p-4 ${alertCadence === "WEEKLY" ? "border-emerald-800 bg-emerald-50" : "border-stone-200"}`}><input type="radio" name="cadence" value="WEEKLY" checked={alertCadence === "WEEKLY"} onChange={() => setAlertCadence("WEEKLY")} className="mr-2 accent-emerald-800"/><strong>Haftalık · Ücretsiz</strong><span className="mt-1 block text-xs text-stone-600">Hard filtreler · seçili en fazla 5 şehir · en fazla 12 hafta.</span></label>
              <label className={`rounded-2xl border p-4 ${alertCadence === "INSTANT" ? "border-emerald-800 bg-emerald-50" : "border-stone-200"}`}><input type="radio" name="cadence" value="INSTANT" checked={alertCadence === "INSTANT"} onChange={() => setAlertCadence("INSTANT")} className="mr-2 accent-emerald-800"/><strong>Anında · Pro taslağı</strong><span className="mt-1 block text-xs text-stone-600">Hard filtreler · Türkiye geneli · 1 yıl. Fiyat belirlenmedi.</span></label>
            </div></fieldset>
            <label htmlFor="vehicle-alert-email" className="mt-5 block text-sm font-black">E-posta adresi<input id="vehicle-alert-email" name="email" type="email" required value={alertEmail} onChange={(event) => setAlertEmail(event.target.value)} placeholder="ornek@eposta.com" className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 font-normal"/></label>
            <label className="mt-4 flex items-start gap-3 text-xs leading-5 text-stone-600"><input type="checkbox" required className="mt-1 accent-emerald-800"/><span>Yalnız bu araç eşleşmesi için e-posta bildirimi almak istiyorum. Bunun pazarlama izni olmadığını ve tek tıkla kapatabileceğimi anladım.</span></label>
            {alertCadence === "INSTANT" && <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4"><p className="text-sm font-black text-amber-950">Pro ödeme adımı</p><p className="mt-1 text-xs leading-5 text-amber-900">Fiyat, sözleşme ve ikinci ele özel güvenli ödeme bağlantısı onaylandığında bu alanda açılacak. Sıfır araç karşılaştırma raporunun ödeme ürünü kullanılmayacak.</p><button type="button" disabled className="mt-3 w-full cursor-not-allowed rounded-xl bg-stone-300 px-4 py-3 text-sm font-black text-stone-600">Pro’ya geç · Yakında</button></div>}
            <button type="submit" className="mt-5 w-full rounded-xl bg-emerald-900 px-5 py-3 font-black text-white">Doğrulama kodu gönder</button><p className="mt-3 text-center text-xs text-stone-500">Bu prototip gerçek e-posta göndermez, adresi kaydetmez ve ücret tahsil etmez.</p>
          </form> : alertStep === "VERIFY" ? <form className="mx-auto mt-7 max-w-xl rounded-2xl border border-stone-200 bg-stone-50 p-5" onSubmit={(event) => { event.preventDefault(); setAlertStep("READY"); }}><strong>E-posta adresinizi doğrulayın</strong><p className="mt-1 text-sm text-stone-600">{alertEmail} adresine gönderilecek 6 haneli kod bu adımda doğrulanır. Demo için herhangi bir 6 haneli kod kullanabilirsiniz.</p><label htmlFor="vehicle-alert-code" className="mt-4 block text-sm font-black">Doğrulama kodu<input id="vehicle-alert-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder="123456" className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 text-center text-xl tracking-[0.4em]"/></label><button type="submit" className="mt-4 w-full rounded-xl bg-emerald-900 px-5 py-3 font-black text-white">Kodu doğrula</button><button type="button" onClick={() => setAlertStep("FORM")} className="mt-3 w-full text-sm font-bold text-stone-600">E-posta adresini değiştir</button><p className="mt-3 text-center text-xs text-stone-500">Production akışında kod 10 dakika geçerli, 5 denemeyle sınırlı olacaktır.</p></form> : <div className="mx-auto mt-7 max-w-xl rounded-2xl bg-emerald-50 p-5 text-center text-emerald-950"><strong>Demo e-posta doğrulaması tamamlandı</strong><p className="mt-1 text-sm">{alertCadence === "INSTANT" ? "Gerçek üründe sıradaki adım Pro ödemesi olacaktır." : "Gerçek üründe haftalık takip bu noktadan sonra aktive edilir."} Bu prototipte kayıt, gönderim veya tahsilat yapılmadı.</p></div>}
        </div>}
    </section>
  </main>;
}
