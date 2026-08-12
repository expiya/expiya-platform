"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { saveFeedback } from "@/features/decision/feedback/saveFeedback";
import type { PersistedCarsConversation } from "@/types/carsConversation";
import type { RecommendedCar } from "@/types/recommendation";

const storageKey = "expiya:cars-conversation:v4";
const reasonTranslations: Record<string, string> = {
  "Recent model year": "Yeni model yılı",
  "Older model year": "Eski model yılı",
  "Low mileage": "Düşük kilometre",
  "High mileage": "Yüksek kilometre",
  "Competitive price": "Rekabetçi fiyat",
  "Premium pricing": "Yüksek fiyat seviyesi",
};

function readRecommendation(decisionId: string): RecommendedCar | null {
  try {
    const conversation = JSON.parse(
      localStorage.getItem(storageKey) ?? "null",
    ) as PersistedCarsConversation | null;
    if (!conversation || conversation.version !== 4) return null;
    return conversation.messages
      .flatMap((message) => message.recommendations ?? [])
      .find((item) => item.decision.decisionId === decisionId) ?? null;
  } catch {
    return null;
  }
}

export default function DecisionDetailPage() {
  const params = useParams<{ id: string }>();
  const decisionId = params.id;
  const [recommendation, setRecommendation] = useState<RecommendedCar | null>();
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setRecommendation(readRecommendation(decisionId)));
  }, [decisionId]);

  if (recommendation === undefined) {
    return <main className="min-h-screen bg-neutral-50" aria-label="Karar yükleniyor" />;
  }

  if (!recommendation) {
    return (
      <main className="min-h-screen bg-neutral-50 p-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold">Karar bulunamadı</h1>
          <p className="mt-4 text-neutral-600">
            Bu karar bu tarayıcıdaki mevcut görüşmede bulunmuyor.
          </p>
          <Link href="/" className="mt-6 inline-flex rounded-xl bg-black px-5 py-3 font-semibold text-white">
            Yeni görüşme başlat
          </Link>
        </div>
      </main>
    );
  }

  const { car, decision } = recommendation;

  function handleFeedback(helpful: boolean) {
    saveFeedback({ decisionId, helpful });
    setFeedbackSubmitted(true);
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-5 sm:p-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/analysis" className="text-sm font-semibold text-neutral-600 hover:text-black">
          ← Görüşmeye dön
        </Link>
        <h1 className="mt-5 text-4xl font-bold">Karar detayı</h1>

        <article className="mt-8 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
          <div className="relative aspect-[16/9]">
            <Image src={car.image} alt={`${car.brand} ${car.model}`} fill priority sizes="(max-width: 900px) 100vw, 850px" className="object-cover" />
          </div>
          <div className="p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">Önerilen araç</p>
            <h2 className="mt-2 text-3xl font-bold">{car.brand} {car.model}</h2>
            <p className="mt-2 text-neutral-600">{car.year} · {car.fuel === "Electric" ? "Elektrik" : "Benzin"} · {car.transmission === "Automatic" ? "Otomatik" : "Manuel"}</p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-neutral-100 p-5">
                <p className="text-sm text-neutral-500">Karar puanı</p>
                <p className="mt-1 text-3xl font-semibold">{decision.score} / 100</p>
              </div>
              <div className="rounded-2xl bg-neutral-100 p-5">
                <p className="text-sm text-neutral-500">Güven</p>
                <p className="mt-1 text-3xl font-semibold">%{decision.confidence.value}</p>
              </div>
            </div>

            <section className="mt-8">
              <h3 className="text-lg font-semibold">Bu kararın dayanakları</h3>
              <ul className="mt-3 space-y-2 text-neutral-700">
                {decision.reasons.map((reason) => <li key={reason}>• {reasonTranslations[reason] ?? reason}</li>)}
              </ul>
            </section>

            <section className="mt-8 border-t border-neutral-200 pt-6">
              <h3 className="font-semibold">Bu karar yardımcı oldu mu?</h3>
              {feedbackSubmitted ? (
                <p className="mt-3 text-neutral-600">Geri bildiriminiz için teşekkürler.</p>
              ) : (
                <div className="mt-3 flex gap-3">
                  <button type="button" onClick={() => handleFeedback(true)} className="rounded-xl border border-neutral-300 px-4 py-2 font-medium hover:border-black">Evet</button>
                  <button type="button" onClick={() => handleFeedback(false)} className="rounded-xl border border-neutral-300 px-4 py-2 font-medium hover:border-black">Hayır</button>
                </div>
              )}
            </section>
          </div>
        </article>
      </div>
    </main>
  );
}
