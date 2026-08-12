"use client";

import { Suspense, useId } from "react";
import { useSearchParams } from "next/navigation";
import { createDecisionContext } from "@/features/decision/context/createDecisionContext";
import { runCarsRuntime } from "@/features/decision/runtime/runCarsRuntime";

function AnalysisContent() {
  const searchParams = useSearchParams();
  const query = searchParams.get("query") ?? "";
  const runtimeReference = useId();
  const decisionContext = createDecisionContext(query);
  const runtimeResult = runCarsRuntime({
    requestId: `analysis-request-${runtimeReference}`,
    contextReference: `analysis-context-${runtimeReference}`,
    dependencies: {},
  });

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

        <section className="mt-12" aria-live="polite">
          <h2 className="text-2xl font-semibold tracking-tight">
            Decision Status
          </h2>

          <div className="mt-6 rounded-xl border p-6">
            {runtimeResult.status}
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
