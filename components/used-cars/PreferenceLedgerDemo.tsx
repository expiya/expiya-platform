"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DEMO_PREFERENCE_SECTIONS } from "@/features/used-cars/demo/preferenceFields";
import { createDemoMatchQuery } from "@/features/used-cars/demo/preferenceTransfer";
import { TURKEY_CITY_NAMES } from "@/features/used-cars/demo/turkeyCities";

const modelsByBrand: Readonly<Record<string, readonly string[]>> = { Toyota: ["Toyota C-HR"], Renault: ["Renault Clio"], Fiat: ["Fiat Egea"] };
const choices = {
  usePurpose: ["Fark etmez", "Günlük işe/okula ulaşım", "Aile kullanımı", "Şehir içi kısa mesafe", "Uzun yol ve seyahat", "İş ve müşteri ziyareti", "Hafta sonu kullanımı", "Kırsal/bozuk yol", "Yük ve hafif ticari kullanım"],
  bodyStyle: ["Fark etmez", "SUV", "Hatchback", "Sedan"], fuelType: ["Fark etmez", "Benzin", "Dizel", "Hibrit", "Elektrik"], transmission: ["Fark etmez", "Otomatik", "Manuel"],
  preferredBrand: ["Fark etmez", "Toyota", "Renault", "Fiat"], preferredModel: ["Fark etmez"], maximumVehicleAge: ["1", "2", "3", "4", "5", "10", "15", "20+"],
  paintTolerance: ["Lokal olabilir", "Boyalı olabilir", "İstemiyorum"], changedPartTolerance: ["En fazla 1", "Olabilir", "İstemiyorum"], heavyDamageApproach: ["Hariç tut", "Belgeyle değerlendir", "Esnek"],
  maintenanceExpectation: ["Belgeli olmalı", "Tercih ederim", "Fark etmez"], warrantyExpectation: ["Gerekli", "Tercih ederim", "Gerekli değil"], nearbyServiceAccess: ["Gerekli", "Tercih ederim", "Fark etmez"],
  resalePriority: ["Yüksek", "Orta", "Düşük", "Fark etmez"], unexpectedExpenseTolerance: ["Düşük", "Dengeli", "Yüksek"], classicInterest: ["İlgilenmiyorum", "Açığım", "Özellikle klasik"], vehicleUseMode: ["Günlük kullanım", "Hafta sonu", "Koleksiyon"],
} as const;
const numberFields = { totalBudgetTry: ["Toplam bütçe", "1600000"], downPaymentTry: ["Peşinat", "700000"], monthlyFinanceLimitTry: ["Aylık finansman sınırı", "35000"], annualMileageKm: ["Yıllık kilometre", "18000"], maximumMileageKm: ["Kilometre üst sınırı", "90000"] } as const;
const formatNumber = (value: string) => value.replace(/\D/gu, "").replace(/\B(?=(\d{3})+(?!\d))/gu, ".");

export function PreferenceLedgerDemo() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>({});
  const section = DEMO_PREFERENCE_SECTIONS[step];
  const set = (key: string, value: string) => setValues((old) => ({ ...old, [key]: value, ...(key === "preferredBrand" ? { preferredModel: "" } : {}) }));
  const selectedCities = values.preferredCities ? values.preferredCities.split(",") : [];
  const toggleCity = (city: string) => set("preferredCities", selectedCities.includes(city) ? selectedCities.filter((item) => item !== city).join(",") : selectedCities.length < 5 ? [...selectedCities, city].join(",") : selectedCities.join(","));
  const finish = () => router.push(`/ikinciel/eslestirme?${new URLSearchParams(createDemoMatchQuery(values)).toString()}`);

  return <main className="mx-auto max-w-4xl px-5 py-10 lg:px-8">
    <div className="flex items-end justify-between gap-4"><div><p className="text-sm font-black uppercase tracking-widest text-emerald-700">Preference ledger · sentetik demo</p><h1 className="mt-2 text-4xl font-black tracking-tight">Aracı değil, ihtiyacınızı tarif edin</h1></div><span className="text-sm font-black text-stone-500">{step + 1}/{DEMO_PREFERENCE_SECTIONS.length}</span></div>
    <div className="mt-7 flex gap-2">{DEMO_PREFERENCE_SECTIONS.map((item, index) => <div key={item.id} className={`h-2 flex-1 rounded-full ${index <= step ? "bg-emerald-800" : "bg-stone-200"}`} />)}</div>
    <section className="mt-7 rounded-3xl border border-stone-200 bg-white p-6 sm:p-8"><h2 className="text-2xl font-black">{section.title}</h2><p className="mt-2 text-sm text-stone-500">Bir tercih hard sınır olacaksa eşleştirme onu sessizce esnetmez.</p>
      <div className="mt-7 grid gap-6 sm:grid-cols-2">{section.fields.map((field) => {
        const controlId = `used-car-preference-${field}`;
        if (field in numberFields) { const meta = numberFields[field as keyof typeof numberFields]; const raw = values[field] ?? meta[1]; return <label key={field} htmlFor={controlId} className="text-sm font-black">{meta[0]}<input id={controlId} name={field} inputMode="numeric" value={formatNumber(raw)} onChange={(event) => set(field, event.target.value.replace(/\D/gu, ""))} className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 font-normal" /></label>; }
        if (field === "cityDrivingRatio") { const raw = values[field] ?? "70"; return <label key={field} htmlFor={controlId} className="text-sm font-black">Şehir içi oranı: %{raw}<input id={controlId} name={field} type="range" min="0" max="100" step="5" value={raw} onChange={(event) => set(field, event.target.value)} className="mt-4 w-full accent-emerald-800" /></label>; }
        if (field === "preferredCities") return <fieldset key={field} className="sm:col-span-2"><legend className="text-sm font-black">Araç aranan şehirler <span className="font-normal text-stone-500">(en fazla 5)</span></legend><div className="mt-3 max-h-52 overflow-y-auto rounded-2xl border border-stone-200 p-3"><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{TURKEY_CITY_NAMES.map((city) => { const selected = selectedCities.includes(city); const disabled = !selected && selectedCities.length >= 5; return <label key={city} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${selected ? "bg-emerald-50 text-emerald-950" : "bg-stone-50"} ${disabled ? "opacity-40" : ""}`}><input type="checkbox" checked={selected} disabled={disabled} onChange={() => toggleCity(city)} className="accent-emerald-800"/>{city}</label>; })}</div></div><p className="mt-2 text-xs text-stone-500">{selectedCities.length}/5 şehir seçildi. Seçim yapılmazsa şehir hard filtresi uygulanmaz.</p></fieldset>;
        const items = field === "preferredModel" ? ["Fark etmez", ...(modelsByBrand[values.preferredBrand] ?? [])] : choices[field as keyof typeof choices];
        return <label key={field} htmlFor={controlId} className="text-sm font-black">{fieldLabel(field)}<select id={controlId} name={field} value={values[field] ?? ""} onChange={(event) => set(field, event.target.value)} disabled={field === "preferredModel" && !modelsByBrand[values.preferredBrand]} className="mt-2 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 font-normal disabled:bg-stone-100"><option value="">Seçin</option>{items.map((item) => <option key={item}>{item}</option>)}</select>{fieldHelp(field) && <span className="mt-2 block text-xs font-normal leading-5 text-stone-500">{fieldHelp(field)}</span>}</label>;
      })}</div>
      <div className="mt-8 flex justify-between border-t border-stone-200 pt-5">{step === 0 ? <Link href="/ikinciel" className="rounded-xl border border-stone-300 px-5 py-3 font-black">Geri</Link> : <button type="button" onClick={() => setStep((value) => value - 1)} className="rounded-xl border border-stone-300 px-5 py-3 font-black">Geri</button>}<button type="button" onClick={() => step === DEMO_PREFERENCE_SECTIONS.length - 1 ? finish() : setStep((value) => value + 1)} className="rounded-xl bg-emerald-900 px-6 py-3 font-black text-white">{step === DEMO_PREFERENCE_SECTIONS.length - 1 ? "Araçları listele →" : "Devam"}</button></div>
    </section>
    <p className="mt-5 text-xs leading-5 text-stone-500">Bu tercihler sentetik demoda sunucuya kaydedilmez. Eşleştirme için ayrıca açık rıza istenmez; iletişim bilgilerinin seçilen satıcıyla paylaşılması ancak lead adımında, amaç ve alıcı açıkça gösterilerek onaylanır.</p>
  </main>;
}

function fieldLabel(field: string) { const labels: Record<string, string> = { usePurpose: "Kullanım amacı", bodyStyle: "Gövde tipi", fuelType: "Yakıt/enerji tercihi", transmission: "Şanzıman tercihi", preferredBrand: "Marka tercihi (isteğe bağlı)", preferredModel: "Model tercihi (isteğe bağlı)", maximumVehicleAge: "Araç yaşı üst sınırı", paintTolerance: "Boya toleransı", changedPartTolerance: "Değişen parça toleransı", heavyDamageApproach: "Ağır hasar yaklaşımı", maintenanceExpectation: "Bakım geçmişi beklentisi", warrantyExpectation: "Garanti beklentisi", nearbyServiceAccess: "Yakın servis/usta erişimi", resalePriority: "Yeniden satış önceliği", unexpectedExpenseTolerance: "Beklenmedik masraf toleransı", classicInterest: "Klasik araç ilgisi", vehicleUseMode: "Kullanım/koleksiyon amacı" }; return labels[field] ?? field; }
function fieldHelp(field: string) { if (field === "nearbyServiceAccess") return "Konum izni verilirse mesafe; verilmezse seçilen il/ilçe ile doğrulanmış servis ve uzman ağı üzerinden değerlendirilecek. Veri yoksa ‘bilinmiyor’ gösterilecek."; if (field === "resalePriority") return "Aracı ileride kolay satabilme ve değerini görece koruma beklentinizdir; kaynaksız piyasa fiyatı veya satış garantisi üretmez."; return ""; }
