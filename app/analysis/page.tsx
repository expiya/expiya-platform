"use client";

import { useSearchParams } from "next/navigation";
import { CarCard } from "@/components/cars/CarCard";
import { getRecommendedCars } from "@/features/recommendation/getRecommendedCars";

export default function AnalysisPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query");
  const recommendedCars = getRecommendedCars();

  return (
    <main className="min-h-screen p-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-4xl font-bold">
          Expiya Decision Engine
        </h1>

        <p className="mt-6 text-neutral-600">
          User Request
        </p>

        <div className="mt-2 rounded-xl border p-6">
          {query}
        </div>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight">
            Recommended Cars
          </h2>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {recommendedCars.map((recommendedCar) => (
              <CarCard
                key={recommendedCar.car.id}
                recommendedCar={recommendedCar}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
