"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { paidComparisonLegalVersions } from "@/features/paid-comparison/legalVersions";

type Vehicle = { exactVariantId: string; brand: string; model: string; trim: string; bodyStyle: string; fuelType: string; amountTry: number; priceValidFrom: string };
type Options = { conversationId: string; decisionId: string; decision: Vehicle; comparisonClass: string; alternatives: Vehicle[] };
type Step = "loading" | "select" | "checkout" | "error";
const HANDOFF_KEY = "expiya:paid-comparison-handoff";

function money(value: number) { return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value); }
async function post<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message ?? "İşlem tamamlanamadı.");
  return payload as T;
}
function safeIyzicoUrl(raw: string): string {
  const url = new URL(raw);
  if (url.protocol !== "https:" || !["sandbox-cpp.iyzipay.com", "cpp.iyzipay.com"].includes(url.hostname)) throw new Error("Güvenli ödeme adresi doğrulanamadı.");
  return url.toString();
}

export default function PaidComparisonFlow({ legalTexts }: { legalTexts: { preInformation: string; distanceContract: string; immediatePerformance: string } }) {
  const [handoff, setHandoff] = useState("");
  const [options, setOptions] = useState<Options>();
  const [selected, setSelected] = useState<string[]>([]);
  const [quoteId, setQuoteId] = useState("");
  const [step, setStep] = useState<Step>("loading");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const value = sessionStorage.getItem(HANDOFF_KEY) ?? "";
    if (!value) {
      Promise.resolve().then(() => { setMessage("Karar kartından gelen güvenli seçim bilgisi bulunamadı."); setStep("error"); });
      return;
    }
    Promise.resolve().then(() => setHandoff(value));
    post<Options>("/api/cars/paid-comparison/options", { handoff: value })
      .then((result) => {
        setOptions(result); setStep("select");
        const key = `expiya:paid-comparison-options-viewed:${result.decisionId}:${result.decision.exactVariantId}`;
        if (!sessionStorage.getItem(key)) {
          sessionStorage.setItem(key, "1");
          void fetch("/api/cars/paid-comparison/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventId: crypto.randomUUID(), eventName: "OPTIONS_VIEWED", conversationId: result.conversationId, decisionId: result.decisionId, exactVariantId: result.decision.exactVariantId }) });
        }
      })
      .catch((error: Error) => { setMessage(error.message); setStep("error"); });
  }, []);

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 2 ? [...current, id] : current);
  }
  async function continueToCheckout() {
    if (selected.length !== 2) return;
    setBusy(true);
    try {
      const quote = await post<{ quoteId: string }>("/api/cars/paid-comparison/quotes", { handoff, alternativeVariantIds: selected });
      setQuoteId(quote.quoteId); setStep("checkout");
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  async function pay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await post<{ paymentPageUrl: string }>("/api/payments/iyzico/checkout", {
        quoteId,
        buyer: {
          name: form.get("name"), surname: form.get("surname"), identityNumber: form.get("identityNumber"),
          email: form.get("email"), gsmNumber: form.get("gsmNumber"),
          billingAddress: { address: form.get("address"), city: form.get("city"), zipCode: form.get("zipCode") || undefined },
        },
        legalAcceptance: {
          preInformationVersion: paidComparisonLegalVersions.preInformation,
          distanceContractVersion: paidComparisonLegalVersions.distanceContract,
          immediatePerformanceVersion: paidComparisonLegalVersions.immediatePerformance,
          preInformationAccepted: form.get("preInformationAccepted") === "on",
          distanceContractAccepted: form.get("distanceContractAccepted") === "on",
          immediatePerformanceAccepted: form.get("immediatePerformanceAccepted") === "on",
        },
      });
      sessionStorage.removeItem(HANDOFF_KEY);
      event.currentTarget.reset();
      window.location.assign(safeIyzicoUrl(result.paymentPageUrl));
    } catch (error) { setMessage((error as Error).message); setBusy(false); }
  }

  return <main className="mx-auto min-h-screen max-w-3xl px-4 py-8 sm:py-14">
    <header><p className="text-sm font-semibold text-emerald-700">Expiya Cars</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">3 araç karar doğrulama raporu</h1><p className="mt-3 text-neutral-600 dark:text-neutral-300">Karar kartındaki aracın yanında aynı sınıftan iki aracı sen seç. KDV dâhil tek fiyat: <strong>349 TL</strong>.</p></header>
    {step === "loading" && <p className="mt-10">Seçenekler hazırlanıyor…</p>}
    {step === "error" && <section className="mt-8 rounded-2xl border p-5"><p>{message}</p><Link className="mt-4 inline-block underline" href="/">Karar ekranına dön</Link></section>}
    {step === "select" && options && <section className="mt-8">
      <h2 className="text-xl font-semibold">Kararın + iki alternatif</h2>
      <VehicleCard vehicle={options.decision} selected label="Karar kartın" />
      <p className="mt-7 text-sm text-neutral-600">{options.comparisonClass} sınıfından tam iki araç seç ({selected.length}/2).</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{options.alternatives.map((vehicle) => <VehicleCard key={vehicle.exactVariantId} vehicle={vehicle} selected={selected.includes(vehicle.exactVariantId)} onClick={() => toggle(vehicle.exactVariantId)} />)}</div>
      {message && <p className="mt-4 text-sm text-red-700">{message}</p>}
      <button disabled={selected.length !== 2 || busy} onClick={continueToCheckout} className="mt-6 min-h-12 w-full rounded-xl bg-neutral-950 px-5 font-semibold text-white disabled:opacity-40 dark:bg-white dark:text-neutral-950">{busy ? "Hazırlanıyor…" : "Seçimi onayla — 349 TL"}</button>
    </section>}
    {step === "checkout" && <form onSubmit={pay} className="mt-8 space-y-5">
      <section className="rounded-2xl border p-5"><h2 className="text-xl font-semibold">Fatura ve ödeme bilgileri</h2><p className="mt-2 text-sm text-neutral-600">Kart bilgilerin iyzico’nun güvenli sayfasında alınır; Expiya’da saklanmaz.</p><div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Ad" /><Field name="surname" label="Soyad" /><Field name="identityNumber" label="T.C. kimlik / vergi no" inputMode="numeric" /><Field name="gsmNumber" label="Telefon (+90…)" /><Field name="email" label="E-posta" type="email" /><Field name="city" label="Şehir" /><Field name="zipCode" label="Posta kodu" required={false} /><Field name="address" label="Fatura adresi" wide />
      </div></section>
      <section className="rounded-2xl border p-5 space-y-4"><h2 className="text-lg font-semibold">Sözleşmeler ve teslim</h2>
        <LegalConsent name="preInformationAccepted" title="Ön bilgilendirme" text={legalTexts.preInformation}>Ön bilgilendirmeyi okudum ve kabul ediyorum.</LegalConsent>
        <LegalConsent name="distanceContractAccepted" title="Mesafeli satış sözleşmesi" text={legalTexts.distanceContract}>Mesafeli satış sözleşmesini okudum ve kabul ediyorum.</LegalConsent>
        <LegalConsent name="immediatePerformanceAccepted" title="Hizmetin hemen başlaması" text={legalTexts.immediatePerformance}>Ödeme sonrası kişiselleştirilmiş raporun hemen hazırlanmasını talep ediyorum.</LegalConsent>
        <details className="text-sm text-neutral-600"><summary className="cursor-pointer">İade ve teslim ayrıntıları</summary><p className="mt-2">Rapor tesliminden itibaren 24 saat içinde kolay iade talebi iletebilirsin. Bu politika yasal haklarını sınırlamaz. Rapor üretilemezse tam iade süreci başlatılır.</p></details>
      </section>
      {message && <p className="text-sm text-red-700">{message}</p>}
      <button disabled={busy} className="min-h-12 w-full rounded-xl bg-emerald-700 px-5 font-semibold text-white disabled:opacity-50">{busy ? "iyzico’ya bağlanıyor…" : "Güvenli ödemeye geç — 349 TL"}</button>
    </form>}
  </main>;
}

function VehicleCard({ vehicle, selected, label, onClick }: { vehicle: Vehicle; selected: boolean; label?: string; onClick?: () => void }) {
  return <button type="button" onClick={onClick} disabled={!onClick} className={`mt-3 w-full rounded-2xl border p-4 text-left ${selected ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30" : "border-neutral-200"}`}><span className="text-xs font-semibold uppercase text-emerald-700">{label ?? (selected ? "Seçildi" : "Alternatif")}</span><strong className="mt-1 block">{vehicle.brand} {vehicle.model} {vehicle.trim}</strong><span className="mt-2 block text-sm text-neutral-600 dark:text-neutral-300">{vehicle.fuelType} · {money(vehicle.amountTry)} · fiyat tarihi {vehicle.priceValidFrom}</span></button>;
}
function Field({ name, label, type = "text", inputMode, wide, required = true }: { name: string; label: string; type?: string; inputMode?: "numeric"; wide?: boolean; required?: boolean }) { return <label className={wide ? "sm:col-span-2" : ""}><span className="mb-1 block text-sm font-medium">{label}</span><input required={required} name={name} type={type} inputMode={inputMode} className="min-h-11 w-full rounded-xl border border-neutral-300 bg-transparent px-3" /></label>; }
function LegalConsent({ name, title, text, children }: { name: string; title: string; text: string; children: React.ReactNode }) { return <div><details className="mb-2 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"><summary className="cursor-pointer font-medium">{title}</summary><p className="mt-2 leading-6">{text}</p></details><label className="flex gap-3 text-sm"><input required name={name} type="checkbox" className="mt-1 size-4" /><span>{children}</span></label></div>; }
