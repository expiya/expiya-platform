"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { saveFeedback } from "@/features/decision/feedback/saveFeedback";
import { VehicleImageDisclosure } from "@/components/cars/VehicleImageDisclosure";
import { interpretRecommendation } from "@/features/decision/interpretRecommendation";
import type { PersistedCarsConversation } from "@/types/carsConversation";
import type { RecommendedCar } from "@/types/recommendation";
import type { DecisionSafePublicCard } from "@/features/decision/v2/presentation/publicCardSchema";
import type { V3PublicResponse } from "@/features/decision/v3/types";

const storageKey = "expiya:cars-conversation:v5";
const legacyStorageKey = "expiya:cars-conversation:v4";
const reasonTranslations: Record<string, string> = {
  "Recent model year": "Yeni model yılı",
  "Older model year": "Eski model yılı",
  "Low mileage": "Düşük kilometre",
  "High mileage": "Yüksek kilometre",
  "Competitive price": "Rekabetçi fiyat",
  "Premium pricing": "Yüksek fiyat seviyesi",
  "Yük taşıma amacına uygun gövde tipi": "Yük taşıma amacına uygun gövde tipi",
  "Düzenli yolcu taşıma amacına uygun gövde tipi": "Düzenli yolcu taşıma amacına uygun gövde tipi",
  "Çekme ihtiyacına uygun araç sınıfı": "Çekme ihtiyacına uygun araç sınıfı",
  "Arazi kullanımına uygun araç sınıfı": "Arazi kullanımına uygun araç sınıfı",
  "Aile kullanımına uygun gövde tipi": "Aile kullanımına uygun gövde tipi",
  "Dar alan ve park ihtiyacına uygun kompakt gövde": "Dar alan ve park ihtiyacına uygun kompakt gövde",
  "Klasik araç isteğiyle uyumlu model yılı": "Klasik araç isteğiyle uyumlu model yılı",
  "Performans odaklı kullanıma uygun araç sınıfı": "Performans odaklı kullanıma uygun araç sınıfı",
};
const fuelTranslations: Record<string, string> = {
  Gasoline: "Benzin",
  Diesel: "Dizel",
  Hybrid: "Hibrit",
  Electric: "Elektrik",
};

function readRecommendation(decisionId: string): RecommendedCar | null {
  try {
    const conversation = JSON.parse(
      sessionStorage.getItem(storageKey) ?? sessionStorage.getItem(legacyStorageKey) ?? "null",
    ) as PersistedCarsConversation | null;
    if (!conversation || (conversation.version !== 4 && conversation.version !== 5)) return null;
    return conversation.messages
      .flatMap((message) => message.recommendations ?? [])
      .find((item) => item.decision.decisionId === decisionId) ?? null;
  } catch {
    return null;
  }
}

function readV2Card(decisionId: string): DecisionSafePublicCard | null {
  if (!decisionId.startsWith("v2-")) return null;
  try {
    const exactVariantId = decodeURIComponent(decisionId.slice(3));
    const conversation = JSON.parse(
      sessionStorage.getItem(storageKey) ?? sessionStorage.getItem(legacyStorageKey) ?? "null",
    ) as PersistedCarsConversation | null;
    return conversation?.messages.flatMap((message) => message.v2Cards ?? []).find((card) => card.exactVariantId === exactVariantId) ?? null;
  } catch {
    return null;
  }
}

function V2DecisionDetail({ card }: { readonly card: DecisionSafePublicCard }) {
  const details = [card.modelYear, card.fuelLabel, card.transmissionLabel, card.bodyTypeLabel].filter(Boolean).join(" · ");
  return <main className="min-h-screen bg-neutral-50 p-5 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50 sm:p-10">
    <div className="mx-auto max-w-4xl">
      <Link href="/analysis" className="text-sm font-semibold text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white">← Görüşmeye dön</Link>
      <article className="mt-6 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="relative aspect-[16/9]"><Image src={card.image} alt={`${card.brand} ${card.model}`} fill priority sizes="(max-width: 900px) 100vw, 850px" className="object-cover" /></div>
        <div className="space-y-5 p-6 sm:p-8">
          {card.imageStatus !== "EXACT" ? <p className="text-sm text-neutral-500">Temsilî görsel{card.representedModel ? `: ${card.representedModel}` : ""}</p> : null}
          {card.imageAttribution ? <p className="text-xs text-neutral-500">Görsel: {card.imageAttribution}</p> : null}
          <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">Önerilen araç</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">{card.title}</h1>{details ? <p className="mt-2 text-neutral-600 dark:text-neutral-300">{details}</p> : null}</div>
          {card.verifiedPublicPrice ? <p className="text-2xl font-semibold">{card.verifiedPublicPrice.amountTry.toLocaleString("tr-TR")} TL</p> : <p className="text-neutral-600 dark:text-neutral-300">Güncel fiyat doğrulanıyor.</p>}
          <div className="rounded-2xl bg-neutral-950 p-5 text-white"><p className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-400">Kısa yorum</p><p className="mt-2 text-lg leading-7">{card.decisionSummary.recommendation}</p></div>
          <section><h2 className="text-xl font-semibold">Neden öne çıktı?</h2><ul className="mt-3 list-disc space-y-2 pl-5">{card.decisionSummary.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul></section>
          {card.caveats.length ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"><h2 className="font-semibold">Dikkat edilmesi gerekenler</h2>{card.caveats.map((caveat) => <p key={caveat} className="mt-2 text-sm">{caveat}</p>)}</section> : null}
        </div>
      </article>
    </div>
  </main>;
}

type V3DecisionCard = NonNullable<V3PublicResponse["recommendations"]>[number];

function readV3Card(decisionId: string): V3DecisionCard | null {
  if (!decisionId.startsWith("v3-")) return null;
  try {
    const exactVariantId = decodeURIComponent(decisionId.slice(3));
    const conversation = JSON.parse(sessionStorage.getItem("expiya:cars-conversation:v3.8-pilot") ?? "null") as { messages?: readonly { recommendations?: V3PublicResponse["recommendations"] }[] } | null;
    return conversation?.messages?.flatMap((message) => message.recommendations ?? []).find((card) => card.id === exactVariantId) ?? null;
  } catch {
    return null;
  }
}

function V3DecisionDetail({ card }: { readonly card: V3DecisionCard }) {
  return <main className="min-h-screen bg-neutral-50 p-5 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50 sm:p-10">
    <div className="mx-auto max-w-4xl">
      <Link href="/analysis?pilot=v3.8" className="text-sm font-semibold text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white">← Görüşmeye dön</Link>
      <article className="mt-6 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="relative aspect-[16/9]"><Image src={card.image} alt={`${card.title} araç görseli`} fill priority sizes="(max-width: 900px) 100vw, 850px" className="object-cover" /></div>
        <div className="space-y-5 p-6 sm:p-8">
          {card.imageStatus !== "EXACT" ? <p className="text-sm text-neutral-500">{card.imageStatus === "PLACEHOLDER" ? "Araç görseli hazırlanıyor." : `Temsilî görsel${card.representedModel ? `: ${card.representedModel}` : ""}`}</p> : null}
          {card.imageAttribution ? <p className="text-xs text-neutral-500">Görsel: {card.imageAttribution}</p> : null}
          <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500">Önerilen araç</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">{card.title}</h1></div>
          {card.badge ? <p className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{card.badge}</p> : null}
          {card.warning ? <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">{card.warning}</p> : null}
          <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">Bu sayfa mevcut görüşmede seçilen exact varyantı gösterir. Satış danışmanı geçişi güvenli görüşme bağlamı içinde yapılır.</p>
        </div>
      </article>
    </div>
  </main>;
}

function readConversation(): PersistedCarsConversation | null {
  try {
    return JSON.parse(sessionStorage.getItem(storageKey) ?? sessionStorage.getItem(legacyStorageKey) ?? "null") as PersistedCarsConversation | null;
  } catch { return null; }
}

function updateDecisionMessage(
  decisionId: string,
  patch: Pick<PersistedCarsConversation["messages"][number], "satisfaction" | "sellerResearchRequest">,
): void {
  const conversation = JSON.parse(sessionStorage.getItem(storageKey) ?? sessionStorage.getItem(legacyStorageKey) ?? "null") as PersistedCarsConversation | null;
  if (!conversation || (conversation.version !== 4 && conversation.version !== 5)) return;
  const messages = conversation.messages.map((message) => (
    message.recommendations?.some((item) => item.decision.decisionId === decisionId)
      ? { ...message, ...patch }
      : message
  ));
  sessionStorage.setItem(storageKey, JSON.stringify({ ...conversation, messages }));
}

export default function DecisionDetailPage() {
  const params = useParams<{ id: string }>();
  const decisionId = params.id;
  const [recommendation, setRecommendation] = useState<RecommendedCar | null>();
  const [v2Card, setV2Card] = useState<DecisionSafePublicCard | null>();
  const [v3Card, setV3Card] = useState<V3DecisionCard | null>();
  const [feedback, setFeedback] = useState<"HELPFUL" | "NOT_HELPFUL">();
  const [showLocation, setShowLocation] = useState(false);
  const [province, setProvince] = useState("");
  const [district, setDistrict] = useState("");
  const [sellerRequest, setSellerRequest] = useState<{ province: string; district: string }>();

  useEffect(() => {
    queueMicrotask(() => {
      setRecommendation(readRecommendation(decisionId));
      setV2Card(readV2Card(decisionId));
      setV3Card(readV3Card(decisionId));
    });
  }, [decisionId]);

  if (recommendation === undefined || v2Card === undefined || v3Card === undefined) {
    return <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950" aria-label="Karar yükleniyor" />;
  }

  if (!recommendation && v2Card) return <V2DecisionDetail card={v2Card} />;
  if (!recommendation && v3Card) return <V3DecisionDetail card={v3Card} />;

  if (!recommendation) {
    return (
      <main className="min-h-screen bg-neutral-50 p-10 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold">Karar bulunamadı</h1>
          <p className="mt-4 text-neutral-600 dark:text-neutral-300">
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
  const interpretation = interpretRecommendation(recommendation);

  function handleFeedback(helpful: boolean) {
    saveFeedback({ decisionId, helpful });
    updateDecisionMessage(decisionId, { satisfaction: helpful ? "HELPFUL" : "NOT_HELPFUL" });
    setFeedback(helpful ? "HELPFUL" : "NOT_HELPFUL");
  }

  function recordProductEvent(eventName: "SELLER_RESEARCH_OPENED" | "SELLER_RESEARCH_SUBMITTED", location?: { province: string; district: string }) {
    const conversation = readConversation();
    void fetch("/api/product-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName,
        conversationId: conversation?.conversationId,
        decisionId,
        carId: car.id,
        ...location,
      }),
    });
  }

  function handleSellerRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const request = { province: province.trim(), district: district.trim() };
    if (!request.province || !request.district) return;
    updateDecisionMessage(decisionId, {
      sellerResearchRequest: { ...request, status: "PLANNED_V0_2" },
    });
    recordProductEvent("SELLER_RESEARCH_SUBMITTED", request);
    setSellerRequest(request);
  }

  return (
    <main className="min-h-screen bg-neutral-50 p-5 text-neutral-950 dark:bg-neutral-950 dark:text-neutral-50 sm:p-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/analysis" className="text-sm font-semibold text-neutral-600 hover:text-black dark:text-neutral-300 dark:hover:text-white">
          ← Görüşmeye dön
        </Link>
        <h1 className="mt-5 text-4xl font-bold">Bu araç sizin için ne ifade ediyor?</h1>

        <article className="mt-8 overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="relative aspect-[16/9]">
            <Image src={car.image} alt={`${car.brand} ${car.model}`} fill priority sizes="(max-width: 900px) 100vw, 850px" className="object-cover" />
          </div>
          <VehicleImageDisclosure
            imageStatus={car.imageStatus}
            imageRepresentativeOf={car.imageRepresentativeOf}
            imageAttribution={car.imageAttribution}
            locale="tr"
          />
          <div className="p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">Önerilen araç</p>
            <h2 className="mt-2 text-3xl font-bold">{car.brand} {car.model}</h2>
            <p className="mt-2 text-neutral-600 dark:text-neutral-300">{car.year} · {fuelTranslations[car.fuel]} · {car.transmission === "Automatic" ? "Otomatik" : "Manuel"}</p>

            <div className="mt-6 rounded-2xl bg-neutral-950 p-5 text-white">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-400">Kısa yorum</p>
              <p className="mt-2 text-lg leading-7">{interpretation.verdict}</p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-neutral-100 p-5 dark:bg-neutral-800">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Karar puanı</p>
                <p className="mt-1 text-3xl font-semibold">{decision.score} / 100</p>
              </div>
              <div className="rounded-2xl bg-neutral-100 p-5 dark:bg-neutral-800">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Güven</p>
                <p className="mt-1 text-3xl font-semibold">%{decision.confidence.value}</p>
              </div>
            </div>

            <section className="mt-8 grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/40">
                <h3 className="text-lg font-semibold text-emerald-950 dark:text-emerald-200">İyi tarafları</h3>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-emerald-950 dark:text-emerald-100">
                  {interpretation.strengths.map((item) => <li key={item}>✓ {item}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/40">
                <h3 className="text-lg font-semibold text-amber-950 dark:text-amber-200">Dikkat edilmesi gerekenler</h3>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-amber-950 dark:text-amber-100">
                  {interpretation.tradeoffs.map((item) => <li key={item}>! {item}</li>)}
                </ul>
              </div>
            </section>

            {interpretation.experienceAnalysis ? (
              <section className="mt-8 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700 sm:p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-neutral-400">Gerçek tüketici deneyimi</p>
                <h3 className="mt-2 text-xl font-semibold">Olumsuz yorum ve şikâyet sinyalleri</h3>
                <p className="mt-3 leading-7 text-neutral-700 dark:text-neutral-200">{interpretation.experienceAnalysis.summary}</p>

                <div className="mt-5 flex flex-wrap gap-2">
                  {interpretation.experienceAnalysis.recurringConcerns.map((theme) => (
                    <span key={theme} className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 dark:bg-red-950/60 dark:text-red-200">{theme}</span>
                  ))}
                </div>

                <h4 className="mt-6 font-semibold">Test sürüşünde ve ekspertizde neye bakmalı?</h4>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-neutral-700 dark:text-neutral-200">
                  {interpretation.experienceAnalysis.testDriveChecks.map((item) => <li key={item}>• {item}</li>)}
                </ul>

                <div className="mt-6 rounded-xl bg-neutral-100 p-4 text-sm leading-6 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
                  <strong>Veriyi doğru okuyalım:</strong> {interpretation.experienceAnalysis.evidenceNote}
                </div>
                <a href={recommendation.consumerExperience?.sourceUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex font-semibold underline">
                  Ham kaynağı incele
                </a>
              </section>
            ) : (
              <section className="mt-8 rounded-2xl border border-dashed border-neutral-300 p-5 dark:border-neutral-700">
                <h3 className="font-semibold">Gerçek kullanıcı deneyimi verisi henüz yok</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-600 dark:text-neutral-300">Bu araç için doğrulanmış olumlu/olumsuz yorum kaynağı bağlanmadığından kullanıcı görüşü uydurmuyoruz. Şimdiki yorum yalnızca katalog özelliklerine dayanıyor.</p>
              </section>
            )}

            <details className="mt-8 rounded-2xl border border-neutral-200 p-5 dark:border-neutral-700">
              <summary className="cursor-pointer font-semibold">Teknik puanın dayanaklarını göster</summary>
              <ul className="mt-3 space-y-2 text-neutral-700 dark:text-neutral-200">
                {decision.reasons.map((reason) => <li key={reason}>• {reasonTranslations[reason] ?? reason}</li>)}
              </ul>
              <p className="mt-4 text-sm leading-6 text-neutral-500 dark:text-neutral-400">Karar puanı araç kalitesinin mutlak ölçüsü değildir; model yılı, kilometre ve fiyat gibi katalog değişkenleriyle adayları karşılaştırmak için kullanılır.</p>
            </details>

            {!feedback && <section className="mt-8 border-t border-neutral-200 pt-6 dark:border-neutral-700">
              <h3 className="font-semibold">Bu karar yardımcı oldu mu?</h3>
              <div className="mt-3 flex gap-3">
                <button type="button" onClick={() => handleFeedback(true)} className="rounded-xl border border-neutral-300 px-4 py-2 font-medium hover:border-black dark:border-neutral-600 dark:hover:border-white">Evet</button>
                <button type="button" onClick={() => handleFeedback(false)} className="rounded-xl border border-neutral-300 px-4 py-2 font-medium hover:border-black dark:border-neutral-600 dark:hover:border-white">Hayır</button>
              </div>
            </section>
            }

            {feedback === "NOT_HELPFUL" && <p className="mt-8 border-t border-neutral-200 pt-6 text-neutral-600 dark:border-neutral-700 dark:text-neutral-300">Geri bildiriminiz kaydedildi. Görüşmeye dönüp beklentinizi düzeltebilirsiniz.</p>}

            {feedback === "HELPFUL" && <section className="mt-8 rounded-2xl bg-neutral-950 p-5 text-white sm:p-6">
              <h3 className="text-lg font-semibold">Bu aracı Türkiye’nin güvenilir satıcılarında araştırmamı ister misiniz?</h3>
              {sellerRequest ? (
                <div className="mt-4 text-sm leading-6 text-neutral-200">
                  <p>{car.brand} {car.model} için konumunuza göre satıcı, fiyat teklifi ve test sürüşü araştırması v0.2’de açılacak.</p>
                  <p className="mt-2 font-medium text-white">Talep kaydedildi: {sellerRequest.province} / {sellerRequest.district}</p>
                </div>
              ) : showLocation ? (
                <form onSubmit={handleSellerRequest} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                  <label className="sr-only" htmlFor="seller-province">İl</label>
                  <input id="seller-province" value={province} onChange={(event) => setProvince(event.target.value)} placeholder="İl" className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 placeholder:text-neutral-600 focus:border-white focus:outline-none" />
                  <label className="sr-only" htmlFor="seller-district">İlçe</label>
                  <input id="seller-district" value={district} onChange={(event) => setDistrict(event.target.value)} placeholder="İlçe" className="rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-950 placeholder:text-neutral-600 focus:border-white focus:outline-none" />
                  <button type="submit" disabled={!province.trim() || !district.trim()} className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black disabled:opacity-50">Kaydet</button>
                </form>
              ) : (
                <button type="button" onClick={() => { setShowLocation(true); recordProductEvent("SELLER_RESEARCH_OPENED"); }} className="mt-4 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black">Evet, konumumu paylaşayım</button>
              )}
            </section>}
          </div>
        </article>
      </div>
    </main>
  );
}
