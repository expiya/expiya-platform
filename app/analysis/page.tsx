"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CarCard } from "@/components/cars/CarCard";
import { getRecommendedCars } from "@/features/recommendation/getRecommendedCars";
import { createDecisionContext } from "@/features/decision/context/createDecisionContext";

function AnalysisContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query") ?? "";
const decisionContext = createDecisionContext(query);
  const recommendedCars = getRecommendedCars(decisionContext);

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-4xl font-bold tracking-tight">
          Expiya Decision Engine
        </h1>

        <p className="mt-6 text-neutral-600">
          User Request
        </p>

        <div className="mt-2 rounded-xl border p-6">
          {decisionContext.decisionNeed}
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

export default function AnalysisPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AnalysisContent />
    </Suspense>
  );
}