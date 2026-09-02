"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { paidComparisonLegalVersions } from "@/features/paid-comparison/legalVersions";
import { PAID_COMPARISON_HANDOFF_STORAGE_KEY, PAID_COMPARISON_RETURN_URL_STORAGE_KEY } from "@/features/paid-comparison/clientContract";

type Vehicle = { exactVariantId: string; brand: string; model: string; trim: string; bodyStyle: string; fuelType: string; amountTry: number; priceValidFrom: string; imageUrl: string; imageAlt: string; imageStatus: "EXACT" | "REPRESENTATIVE" | "APPROXIMATE" | "PLACEHOLDER" };
type Options = { conversationId: string; decisionId: string; decision: Vehicle; comparisonClass: string; alternatives: Vehicle[] };
type Step = "loading" | "select" | "checkout" | "error";

function money(value: number) { return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value); }
function dateOnly(value: string) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value.split("T")[0] ?? value : new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(parsed); }
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

export default function PaidComparisonFlow({ checkoutEnabled, legalTexts }: { checkoutEnabled: boolean; legalTexts: { preInformation: string; distanceContract: string; immediatePerformance: string } }) {
  const [handoff, setHandoff] = useState("");
  const [options, setOptions] = useState<Options>();
  const [selected, setSelected] = useState<string[]>([]);
  const [quoteId, setQuoteId] = useState("");
  const [step, setStep] = useState<Step>("loading");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [returnUrl, setReturnUrl] = useState("/cars");

  useEffect(() => {
    const storedReturnUrl = sessionStorage.getItem(PAID_COMPARISON_RETURN_URL_STORAGE_KEY) ?? "";
    if (storedReturnUrl.startsWith("/") && !storedReturnUrl.startsWith("//")) Promise.resolve().then(() => setReturnUrl(storedReturnUrl));
    const value = sessionStorage.getItem(PAID_COMPARISON_HANDOFF_STORAGE_KEY) ?? "";
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
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const result = await post<{ paymentPageUrl: string }>("/api/payments/iyzico/checkout", {
        quoteId,
        buyer: {
          name: form.get("name"), surname: form.get("surname"), identityNumber: form.get("identityNumber"),
          email: form.get("email"), gsmNumber: form.get("gsmNumber"),
          billingAddress: { address: form.get("address"), city: form.get("city") },
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
      sessionStorage.removeItem(PAID_COMPARISON_HANDOFF_STORAGE_KEY);
      formElement.reset();
      window.location.assign(safeIyzicoUrl(result.paymentPageUrl));
    } catch (error) { setMessage((error as Error).message); setBusy(false); }
  }

  return <main className="min-h-screen bg-[#f7f8f5] text-stone-950">
    <header className="border-b border-stone-200 bg-white"><div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5"><Link href="/cars" className="text-lg font-bold tracking-tight">EXPIYA <span className="font-light text-emerald-700">CARS</span></Link><p className="hidden text-xs font-medium uppercase tracking-[.22em] text-stone-500 sm:block">Experience · Powered by You</p></div></header>
    <div className="mx-auto max-w-5xl px-5 py-8 sm:py-14"><header><Link href={returnUrl} className="mb-6 inline-flex min-h-11 items-center rounded-full border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-800 transition hover:border-stone-500">← Araç kararıma dön</Link><p className="text-xs font-semibold uppercase tracking-[.28em] text-emerald-700">Kişisel karşılaştırma</p><h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-[-.04em] text-stone-950 sm:text-5xl">3 araç karar doğrulama raporu</h1><p className="mt-5 max-w-2xl leading-7 text-stone-600">Karar kartındaki aracın yanında aynı sınıftan iki aracı sen seç. KDV dâhil tek fiyat: <strong className="text-stone-950">349 TL</strong>.</p><Link href="/cars/paid-comparison/sample" className="mt-4 inline-block text-sm font-semibold text-emerald-700 underline underline-offset-4">Satın almadan önce örnek raporu gör</Link></header>
    {step === "loading" && <p className="mt-10">Seçenekler hazırlanıyor…</p>}
    {step === "error" && <section className="mt-8 rounded-2xl border p-5"><p>{message}</p><Link className="mt-4 inline-block underline" href={returnUrl}>Araç kararıma dön</Link></section>}
    {step === "select" && options && <section className="mt-8">
      <h2 className="text-xl font-semibold">Kararın + iki alternatif</h2>
      <VehicleCard vehicle={options.decision} selected label="Karar kartın" />
      <p className="mt-7 text-sm text-neutral-600">{options.comparisonClass} sınıfından tam iki araç seç ({selected.length}/2).</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">{options.alternatives.map((vehicle) => <VehicleCard key={vehicle.exactVariantId} vehicle={vehicle} selected={selected.includes(vehicle.exactVariantId)} onClick={() => toggle(vehicle.exactVariantId)} />)}</div>
      {message && <p className="mt-4 text-sm text-red-700">{message}</p>}
      {!checkoutEnabled ? <p role="status" className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Rapor satın alma özelliği yakında kullanıma açılacak. Şu anda ödeme alınmıyor.</p> : null}
      <button disabled={!checkoutEnabled || selected.length !== 2 || busy} onClick={continueToCheckout} className="mt-6 min-h-14 w-full rounded-full bg-emerald-700 px-6 font-semibold text-white shadow-[0_12px_30px_rgba(4,120,87,.18)] transition hover:bg-emerald-800 disabled:bg-stone-300 disabled:text-stone-600">{busy ? "Hazırlanıyor…" : checkoutEnabled ? "Seçimi onayla — 349 TL" : "Satın alma yakında açılacak"}</button>
    </section>}
    {step === "checkout" && <form onSubmit={pay} className="mt-8 space-y-5">
      <section className="rounded-2xl border p-5"><h2 className="text-xl font-semibold">İletişim ve fatura</h2><p className="mt-2 text-sm text-neutral-600">Rapor teslimi ve ödeme kaydı için gereken en az bilgiyi istiyoruz. Kart numarası, son kullanma tarihi ve CVV yalnızca iyzico’nun güvenli sayfasında alınır; Expiya’da saklanmaz.</p><div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field name="name" label="Ad" /><Field name="surname" label="Soyad" /><Field name="email" label="Raporun gönderileceği e-posta" type="email" /><Field name="gsmNumber" label="Telefon (+90…)" />
      </div><div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4"><h3 className="font-semibold text-neutral-900">Fatura için gerekli bilgiler</h3><p className="mt-2 text-xs leading-5 text-neutral-600">iyzico ödeme başlangıcında alıcı kimliği ve fatura adresi ister. Bu bilgiler karttan Expiya’ya otomatik aktarılmaz.</p><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field name="identityNumber" label="T.C. kimlik numarası" inputMode="numeric" /><Field name="city" label="Şehir" /><Field name="address" label="Fatura adresi" wide /></div></div></section>
      <section className="rounded-2xl border p-5 space-y-4"><h2 className="text-lg font-semibold">Sözleşmeler ve teslim</h2>
        <LegalConsent name="preInformationAccepted" title="Ön bilgilendirme" text={legalTexts.preInformation}>Ön bilgilendirmeyi okudum ve kabul ediyorum.</LegalConsent>
        <LegalConsent name="distanceContractAccepted" title="Mesafeli satış sözleşmesi" text={legalTexts.distanceContract}>Mesafeli satış sözleşmesini okudum ve kabul ediyorum.</LegalConsent>
        <LegalConsent name="immediatePerformanceAccepted" title="Hizmetin hemen başlaması" text={legalTexts.immediatePerformance}>Ödeme sonrası kişiselleştirilmiş raporun hemen hazırlanmasını talep ediyorum.</LegalConsent>
        <details className="text-sm text-neutral-600"><summary className="cursor-pointer">İade ve teslim ayrıntıları</summary><p className="mt-2">Rapor tesliminden itibaren 24 saat içinde kolay iade talebi iletebilirsin. Bu politika yasal haklarını sınırlamaz. Rapor üretilemezse tam iade süreci başlatılır.</p></details>
      </section>
      {message && <p className="text-sm text-red-700">{message}</p>}
      <button disabled={busy} className="min-h-14 w-full rounded-full bg-emerald-700 px-6 font-semibold text-white shadow-[0_12px_30px_rgba(4,120,87,.18)] transition hover:bg-emerald-800 disabled:opacity-50">{busy ? "iyzico’ya bağlanıyor…" : "Güvenli ödemeye geç — 349 TL"}</button>
    </form>}
    </div></main>;
}

function VehicleCard({ vehicle, selected, label, onClick }: { vehicle: Vehicle; selected: boolean; label?: string; onClick?: () => void }) {
  return <button type="button" onClick={onClick} disabled={!onClick} className={`mt-3 w-full overflow-hidden rounded-3xl border bg-white text-left shadow-sm transition ${selected ? "border-emerald-600 ring-1 ring-emerald-600" : "border-stone-200 hover:-translate-y-0.5 hover:border-stone-400 hover:shadow-lg"}`}><div className="relative aspect-[16/9] w-full overflow-hidden bg-stone-100"><Image src={vehicle.imageUrl} alt={vehicle.imageAlt} fill sizes="(min-width: 640px) 360px, 100vw" className="object-cover transition duration-500 hover:scale-[1.02]" /></div><div className="p-5"><span className="text-xs font-semibold uppercase tracking-[.16em] text-emerald-700">{label ?? (selected ? "Seçildi" : "Alternatif")}</span><strong className="mt-2 block text-stone-950">{vehicle.brand} {vehicle.model} {vehicle.trim}</strong><span className="mt-2 block text-sm leading-6 text-stone-600">{vehicle.fuelType} · {money(vehicle.amountTry)} · fiyat tarihi {dateOnly(vehicle.priceValidFrom)}</span>{vehicle.imageStatus === "REPRESENTATIVE" ? <span className="mt-2 block text-xs text-stone-500">Temsilî model görseli</span> : null}</div></button>;
}
function Field({ name, label, type = "text", inputMode, wide, required = true }: { name: string; label: string; type?: string; inputMode?: "numeric"; wide?: boolean; required?: boolean }) {
  const [error, setError] = useState("");
  return <label className={wide ? "sm:col-span-2" : ""}><span className="mb-1 block text-sm font-medium">{label}</span><input required={required} name={name} type={type} inputMode={inputMode} aria-describedby={error ? `${name}-error` : undefined} aria-invalid={Boolean(error)} onInvalid={(event) => { const message = required && event.currentTarget.validity.valueMissing ? "Bu alan zorunludur." : "Bu alanı geçerli biçimde doldurun."; event.currentTarget.setCustomValidity(message); setError(message); }} onInput={(event) => { event.currentTarget.setCustomValidity(""); setError(""); }} className="min-h-11 w-full rounded-xl border border-neutral-300 bg-transparent px-3 aria-invalid:border-red-600" />{error && <span id={`${name}-error`} className="mt-1 block text-xs font-medium text-red-700">{error}</span>}</label>;
}
function LegalConsent({ name, title, text, children }: { name: string; title: string; text: string; children: React.ReactNode }) {
  const [error, setError] = useState("");
  return <div><details className="mb-2 rounded-xl bg-neutral-50 p-3 text-sm text-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"><summary className="cursor-pointer font-medium">{title}</summary><p className="mt-2 leading-6">{text}</p></details><label className="flex gap-3 text-sm"><input required name={name} type="checkbox" aria-describedby={error ? `${name}-error` : undefined} aria-invalid={Boolean(error)} onInvalid={(event) => { event.currentTarget.setCustomValidity("Bu alan zorunludur."); setError("Bu alan zorunludur."); }} onInput={(event) => { event.currentTarget.setCustomValidity(""); setError(""); }} className="mt-1 size-4" /><span>{children}</span></label>{error && <p id={`${name}-error`} className="ml-7 mt-1 text-xs font-medium text-red-700">{error}</p>}</div>;
}
