"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { storePaidComparisonHandoff } from "@/features/paid-comparison/clientContract";

type PaidComparisonOfferProps = {
  readonly conversationId: string;
  readonly offerId: string;
  readonly selectedExactVariantId: string;
} & (
  | { readonly phase2Token: string; readonly stateToken?: never }
  | { readonly phase2Token?: never; readonly stateToken: string }
);

export function PaidComparisonOffer(props: PaidComparisonOfferProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"IDLE" | "LOADING" | "ERROR">("IDLE");

  async function beginComparison() {
    if (status === "LOADING") return;
    setStatus("LOADING");

    void fetch("/api/product-events", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "paid_comparison_offer_clicked",
        conversationId: props.conversationId,
        decisionId: `v3-${props.selectedExactVariantId}`,
        carId: props.selectedExactVariantId,
      }),
    });

    try {
      let token = props.phase2Token;
      if (!token) {
        const response = await fetch("/api/cars/sales-advisor/handoff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: props.conversationId,
            stateToken: props.stateToken,
            offerId: props.offerId,
            selectedExactVariantId: props.selectedExactVariantId,
          }),
        });
        const payload = await response.json() as { token?: string; error?: string };
        if (!response.ok || !payload.token) throw new Error(payload.error);
        token = payload.token;
      }

      storePaidComparisonHandoff(sessionStorage, token);
      router.push("/cars/paid-comparison");
    } catch {
      setStatus("ERROR");
    }
  }

  return (
    <section
      aria-labelledby="paid-comparison-title"
      aria-describedby="paid-comparison-description paid-comparison-trust"
      className="mt-8 overflow-hidden rounded-3xl border border-sky-200 bg-gradient-to-br from-sky-50 via-white to-emerald-50 shadow-[0_18px_45px_-32px_rgba(2,132,199,0.45)]"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-800">
            <svg viewBox="0 0 24 24" fill="none" className="size-6" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 7.5h16M7.5 4v7M16.5 4v7M5 14h4l1.5 2h3L15 14h4v5H5v-5Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-800">Kişisel Araç Karşılaştırma Raporu</p>
              <span className="rounded-full border border-sky-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-800">İsteğe bağlı · Ücretli</span>
            </div>
            <h2 id="paid-comparison-title" className="mt-2 text-xl font-semibold leading-tight text-neutral-950 sm:text-2xl">
              Kararını ayrıntılı karşılaştırmayla doğrula
            </h2>
          </div>
        </div>

        <p id="paid-comparison-description" className="mt-4 text-sm leading-6 text-neutral-700 sm:text-base sm:leading-7">
          Önerdiğimiz araç rapora otomatik eklenir. Aynı sınıftan senin seçeceğin 2 araçla ihtiyaçlarına göre ayrıntılı karşılaştırılır.
        </p>
        <p className="mt-3 text-sm leading-6 text-neutral-600">
          Donanım, teknik özellikler, kullanım uygunluğu, maliyet göstergeleri ve araçlar arasındaki önemli farklar tek raporda. Raporu web üzerinde açabilir veya A4 PDF olarak indirebilirsin.
        </p>
        <ul className="mt-4 grid gap-2 text-sm leading-5 text-neutral-700 sm:grid-cols-2">
          <li className="rounded-xl bg-white/80 px-3 py-2">✓ İstersen verdiğin e-posta adresine gönderilir.</li>
          <li className="rounded-xl bg-white/80 px-3 py-2">✓ Sonrasında 3 araç için satış ve test sürüşü aksiyonlarına geçebilirsin.</li>
        </ul>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-sky-100 pt-5">
          <div>
            <p className="text-xs font-medium text-neutral-500">3 araçlık kişisel rapor</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">349 TL <span className="text-sm font-semibold text-neutral-600">— KDV dahil</span></p>
          </div>
          <p id="paid-comparison-trust" className="max-w-xs text-xs leading-5 text-neutral-600">
            Ödeme öncesinde karşılaştırılacak 3 aracı görebilirsin.
          </p>
        </div>

        {status === "ERROR" ? (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800">
            Karşılaştırma başlangıcı hazırlanamadı. Bağlantını kontrol edip yeniden deneyebilirsin.
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <button
            type="button"
            onClick={() => void beginComparison()}
            disabled={status === "LOADING"}
            aria-busy={status === "LOADING"}
            className="min-h-12 rounded-2xl bg-sky-700 px-5 py-3 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 disabled:cursor-wait disabled:bg-sky-500"
          >
            {status === "LOADING" ? "Karşılaştırma hazırlanıyor…" : status === "ERROR" ? "Yeniden dene" : "2 araç seç ve karşılaştır"}
          </button>
          <Link
            href="/cars/paid-comparison/sample"
            className="min-h-11 rounded-xl px-3 py-3 text-center text-sm font-semibold text-sky-800 underline decoration-sky-300 underline-offset-4 transition hover:text-sky-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          >
            Örnek raporu incele
          </Link>
        </div>
      </div>
    </section>
  );
}
