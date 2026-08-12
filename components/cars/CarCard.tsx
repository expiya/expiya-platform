import Link from "next/link";
import Image from "next/image";
import { RecommendedCar } from "@/types/recommendation";
interface CarCardProps {
  recommendedCar: RecommendedCar;
  locale?: "tr" | "en";
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("tr-TR").format(price);
}

function formatKm(km: number): string {
  return new Intl.NumberFormat("tr-TR").format(km);
}

const translations: Record<string, string> = {
  "Top Pick": "En Güçlü Seçim",
  Year: "Yıl",
  Price: "Fiyat",
  Fuel: "Yakıt",
  Transmission: "Şanzıman",
  "Decision Score": "Karar Puanı",
  Confidence: "Güven",
  "Why?": "Neden?",
  "Inspect Decision": "Kararı İncele",
  Excellent: "Mükemmel",
  "Very Good": "Çok İyi",
  Good: "İyi",
  "Consider Carefully": "Dikkatle Değerlendir",
  High: "Yüksek",
  Medium: "Orta",
  Low: "Düşük",
  "Recent model year": "Yeni model yılı",
  "Older model year": "Eski model yılı",
  "Low mileage": "Düşük kilometre",
  "High mileage": "Yüksek kilometre",
  "Competitive price": "Rekabetçi fiyat",
  "Premium pricing": "Yüksek fiyat seviyesi",
  "Based on multiple supporting factors.": "Birden fazla destekleyici etkene dayanıyor.",
  "Based on limited supporting factors.": "Sınırlı sayıdaki destekleyici etkene dayanıyor.",
  "Limited decision evidence available.": "Karar kanıtı henüz sınırlı.",
  Gasoline: "Benzin",
  Diesel: "Dizel",
  Hybrid: "Hibrit",
  Electric: "Elektrik",
  Automatic: "Otomatik",
  Manual: "Manuel",
};

export function CarCard({ recommendedCar, locale = "tr" }: CarCardProps) {
  const { car, decision, isTopPick } = recommendedCar;
  const t = (value: string) => locale === "tr" ? translations[value] ?? value : value;

  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
      <div className="relative aspect-[16/9] bg-neutral-100">
        <Image
          src={car.image}
          alt={`${car.brand} ${car.model}`}
          fill
          sizes="(max-width: 768px) 100vw, 520px"
          className="object-cover"
        />
      </div>
      <div className="p-6">
      {isTopPick && (
        <span className="mb-3 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-800">
          🏆 {t("Top Pick")}
        </span>
      )}

      <h2 className="text-xl font-semibold tracking-tight">
        {car.brand} {car.model}
      </h2>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-neutral-500">{t("Year")}</dt>
          <dd className="mt-0.5 font-medium">{car.year}</dd>
        </div>

        <div>
          <dt className="text-neutral-500">{t("Price")}</dt>
          <dd className="mt-0.5 font-medium">{formatPrice(car.price)} ₺</dd>
        </div>

        <div>
          <dt className="text-neutral-500">KM</dt>
          <dd className="mt-0.5 font-medium">{formatKm(car.km)}</dd>
        </div>

        <div>
          <dt className="text-neutral-500">{t("Fuel")}</dt>
          <dd className="mt-0.5 font-medium">{t(car.fuel)}</dd>
        </div>

        <div>
          <dt className="text-neutral-500">{t("Transmission")}</dt>
          <dd className="mt-0.5 font-medium">{t(car.transmission)}</dd>
        </div>
      </dl>

      <div className="mt-6 border-t border-neutral-200 pt-4">
        <p className="text-sm text-neutral-500">{t("Decision Score")}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">
          {decision.score} / 100
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          {t(decision.recommendation)}
        </p>

        <div className="mt-4">
          <p className="text-sm text-neutral-500">{t("Confidence")}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {decision.confidence.value}%
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            {t(decision.confidence.level)}
          </p>
          <p className="mt-1 text-sm text-neutral-600">
            {t(decision.confidence.explanation)}
          </p>
        </div>

        {decision.reasons.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-neutral-700">{t("Why?")}</p>
            <ul className="mt-2 space-y-1 text-sm text-neutral-600">
              {decision.reasons.map((reason) => (
                <li key={reason}>• {t(reason)}</li>
              ))}
            </ul>
          </div>
        )}
        <Link
  href={`/decision/${decision.decisionId}`}
  className="mt-6 inline-flex rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
>
  {t("Inspect Decision")}
</Link>
      </div>
      </div>
    </article>
  );
}
