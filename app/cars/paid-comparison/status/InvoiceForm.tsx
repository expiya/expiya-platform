"use client";

import { useState, type FormEvent } from "react";

type SubmitState = "IDLE" | "SENDING" | "ISSUED" | "REVIEW_REQUIRED" | "ERROR";

export default function InvoiceForm() {
  const [state, setState] = useState<SubmitState>("IDLE");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "SENDING" || state === "ISSUED" || state === "REVIEW_REQUIRED") return;
    setState("SENDING");
    setMessage("");
    const formElement = event.currentTarget;
    try {
      const response = await fetch("/api/cars/paid-comparison/invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(formElement).entries())),
        cache: "no-store",
      });
      const result = await response.json() as { status?: string; message?: string };
      if (response.ok && result.status === "ISSUED") {
        formElement.reset();
        setState("ISSUED");
      } else if (result.status === "REVIEW_REQUIRED") setState("REVIEW_REQUIRED");
      else setState("ERROR");
      setMessage(result.message ?? "Fatura işlemi tamamlanamadı.");
    } catch {
      setState("ERROR");
      setMessage("Bağlantı kurulamadı. Ödeme tekrarı yapmayın; daha sonra yeniden kontrol edin.");
    }
  }

  if (state === "ISSUED" || state === "REVIEW_REQUIRED") {
    return <p className={`mt-6 rounded-2xl p-4 text-sm ${state === "ISSUED" ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`} role="status">{message}</p>;
  }

  const inputClass = "mt-1 w-full rounded-xl border border-stone-300 bg-white px-3 py-2";
  return <form onSubmit={submit} className="mt-7 space-y-4 rounded-2xl border border-stone-200 bg-stone-50 p-5" autoComplete="off">
    <div><h2 className="font-semibold text-stone-950">Fatura bilgileri</h2><p className="mt-1 text-xs leading-5 text-stone-600">Bilgiler fatura oluşturmak için doğrudan Logo İşbaşı&apos;na aktarılır. TCKN/VKN ve açık adres Expiya veritabanında saklanmaz.</p></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm">Ad<input name="firstName" required maxLength={80} className={inputClass} /></label>
      <label className="text-sm">Soyad<input name="lastName" required maxLength={80} className={inputClass} /></label>
      <label className="text-sm">TCKN veya VKN<input name="identityNumber" required inputMode="numeric" pattern="[0-9]{10,11}" minLength={10} maxLength={11} className={inputClass} /></label>
      <label className="text-sm">Telefon<input name="phone" required type="tel" placeholder="+905xxxxxxxxx" pattern="\+90[0-9]{10}" className={inputClass} /></label>
      <label className="text-sm sm:col-span-2">E-posta<input name="email" required type="email" maxLength={254} className={inputClass} /></label>
      <label className="text-sm sm:col-span-2">Fatura adresi<textarea name="address" required minLength={5} maxLength={500} rows={3} className={inputClass} /></label>
      <label className="text-sm">İl<input name="city" required maxLength={100} className={inputClass} /></label>
      <label className="text-sm">İlçe<input name="district" required maxLength={100} className={inputClass} /></label>
      <label className="text-sm sm:col-span-2">Vergi dairesi <span className="text-stone-500">(kurumsal için)</span><input name="taxOffice" maxLength={100} className={inputClass} /></label>
    </div>
    {message && <p className="text-sm text-red-700" role="alert">{message}</p>}
    <button disabled={state === "SENDING"} className="min-h-11 rounded-full bg-stone-900 px-5 text-sm font-semibold text-white disabled:opacity-60">{state === "SENDING" ? "Gönderiliyor…" : "Faturamı oluştur"}</button>
  </form>;
}
