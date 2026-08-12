import Image from "next/image";
import Link from "next/link";

import type { RecommendedCar } from "@/types/recommendation";

interface CarCardProps {
  recommendedCar: RecommendedCar;
  locale?: "tr" | "en";
}

const fuelTranslations: Record<string, string> = {
  Gasoline: "Benzin",
  Diesel: "Dizel",
  Hybrid: "Hibrit",
  Electric: "Elektrik",
};

export function CarCard({ recommendedCar, locale = "tr" }: CarCardProps) {
  const { car, decision, isTopPick } = recommendedCar;
  const isTurkish = locale === "tr";
  const title = `${car.brand} ${car.model}`;

  return (
    <Link
      href={`/decision/${decision.decisionId}`}
      aria-label={`${title} ${isTurkish ? "karar ayrıntısını aç" : "open decision details"}`}
      className="group block overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-neutral-400 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-black dark:border-neutral-700 dark:bg-neutral-900 dark:hover:border-neutral-500 dark:focus-visible:outline-white"
    >
      <article>
        <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
          <Image
            src={car.image}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-300 group-hover:scale-[1.025]"
          />
          {isTopPick && (
            <span className="absolute left-3 top-3 rounded-full bg-black/85 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
              {isTurkish ? "En güçlü aday" : "Top candidate"}
            </span>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">{title}</h2>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {car.year} · {isTurkish ? fuelTranslations[car.fuel] : car.fuel}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-neutral-500 dark:text-neutral-400">{isTurkish ? "Güven" : "Confidence"}</p>
              <p className="mt-0.5 text-xl font-bold text-neutral-950 dark:text-neutral-50">%{decision.confidence.value}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-sm dark:border-neutral-800">
            <span className="text-neutral-500 dark:text-neutral-400">{isTurkish ? "Ayrıntılı analizi aç" : "Open detailed analysis"}</span>
            <span aria-hidden="true" className="text-lg transition group-hover:translate-x-1">→</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
