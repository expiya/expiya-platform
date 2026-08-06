import { RecommendedCar } from "@/types/recommendation";

interface CarCardProps {
  recommendedCar: RecommendedCar;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("tr-TR").format(price);
}

function formatKm(km: number): string {
  return new Intl.NumberFormat("tr-TR").format(km);
}

export function CarCard({ recommendedCar }: CarCardProps) {
  const { car, decision, isTopPick } = recommendedCar;

  return (
    <article className="rounded-xl border border-neutral-200 p-6">
      {isTopPick && (
        <span className="mb-3 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-800">
          🏆 Top Pick
        </span>
      )}

      <h2 className="text-xl font-semibold tracking-tight">
        {car.brand} {car.model}
      </h2>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-neutral-500">Year</dt>
          <dd className="mt-0.5 font-medium">{car.year}</dd>
        </div>

        <div>
          <dt className="text-neutral-500">Price</dt>
          <dd className="mt-0.5 font-medium">{formatPrice(car.price)} ₺</dd>
        </div>

        <div>
          <dt className="text-neutral-500">KM</dt>
          <dd className="mt-0.5 font-medium">{formatKm(car.km)}</dd>
        </div>

        <div>
          <dt className="text-neutral-500">Fuel</dt>
          <dd className="mt-0.5 font-medium">{car.fuel}</dd>
        </div>

        <div>
          <dt className="text-neutral-500">Transmission</dt>
          <dd className="mt-0.5 font-medium">{car.transmission}</dd>
        </div>
      </dl>

      <div className="mt-6 border-t border-neutral-200 pt-4">
        <p className="text-sm text-neutral-500">Decision Score</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight">
          {decision.score} / 100
        </p>
        <p className="mt-1 text-sm text-neutral-600">
          {decision.recommendation}
        </p>

        {decision.reasons.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-neutral-700">Why?</p>
            <ul className="mt-2 space-y-1 text-sm text-neutral-600">
              {decision.reasons.map((reason) => (
                <li key={reason.code}>• {reason.message}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-6">
        <p className="text-xs text-neutral-400">Decision ID</p>
        <p className="text-xs text-neutral-400">{decision.decisionId}</p>
      </div>
    </article>
  );
}
