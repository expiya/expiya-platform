"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ResultContent() {
  const searchParams = useSearchParams();
  const query =
    searchParams.get("query") ?? "No vehicle description provided.";

  return (
    <main className="min-h-screen bg-neutral-50">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="rounded-3xl border border-neutral-200 bg-white p-10 shadow-sm">
          <div className="text-center">
            <div className="text-6xl">🚗</div>

            <h1 className="mt-4 text-4xl font-bold">
              Expiya AI Recommendation
            </h1>

            <p className="mt-3 text-neutral-600">
              Based on your request, our AI has prepared the following
              recommendation.
            </p>
          </div>

          <div className="mt-10 rounded-2xl bg-neutral-100 p-6">
            <h2 className="text-lg font-semibold">
              Your Request
            </h2>

            <p className="mt-3 whitespace-pre-wrap text-neutral-700">
              {query}
            </p>
          </div>

          <div className="mt-10 rounded-2xl border border-neutral-200 p-6">
            <h2 className="text-3xl font-bold">
              Toyota Corolla Hybrid
            </h2>

            <p className="mt-2 text-neutral-600">
              2023 • Automatic • Hybrid • Under 60,000 km
            </p>

            <div className="mt-6 inline-flex rounded-full bg-green-100 px-6 py-3">
              <span className="text-2xl font-bold text-green-700">
                AI Score: 91 / 100
              </span>
            </div>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl bg-green-50 p-5">
              <h3 className="text-xl font-bold text-green-700">
                ✅ Pros
              </h3>

              <ul className="mt-4 space-y-2 text-neutral-700">
                <li>Reliable engine</li>
                <li>Excellent fuel economy</li>
                <li>Strong resale value</li>
                <li>Low maintenance cost</li>
              </ul>
            </div>

            <div className="rounded-2xl bg-red-50 p-5">
              <h3 className="text-xl font-bold text-red-600">
                ❌ Cons
              </h3>

              <ul className="mt-4 space-y-2 text-neutral-700">
                <li>Average interior quality</li>
                <li>Road noise at highway speed</li>
                <li>Limited luggage capacity</li>
              </ul>
            </div>

            <div className="rounded-2xl bg-orange-50 p-5">
              <h3 className="text-xl font-bold text-orange-600">
                ⚠ Risks
              </h3>

              <ul className="mt-4 space-y-2 text-neutral-700">
                <li>Verify accident history</li>
                <li>Check maintenance records</li>
                <li>Confirm mileage accuracy</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 rounded-2xl bg-neutral-900 p-8 text-white">
            <h2 className="text-2xl font-bold">
              Expiya Verdict
            </h2>

            <p className="mt-4 leading-8 text-neutral-300">
              This vehicle appears to be an excellent buying opportunity.
              It offers high reliability, low ownership costs and strong
              resale value. Before purchasing, verify the service history,
              mileage and accident records.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResultContent />
    </Suspense>
  );
}