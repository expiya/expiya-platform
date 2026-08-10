"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { createDecisionDetail } from "@/features/decision/createDecisionDetail";
import { saveFeedback } from "@/features/decision/feedback/saveFeedback";
import { getDecision } from "@/features/decision/getDecision";

export default function DecisionDetailPage() {
  const params = useParams<{ id: string }>();
  const decisionId = params.id;
  const decision = getDecision(decisionId);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  if (!decision) {
    return (
      <main className="min-h-screen p-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-bold">Decision Not Found</h1>
          <p className="mt-4 text-neutral-600">
            No decision exists for ID {decisionId}.
          </p>
        </div>
      </main>
    );
  }

  const detail = createDecisionDetail(decision);

  function handleFeedback(helpful: boolean) {
    saveFeedback({
      decisionId: detail.decisionId,
      helpful,
    });
    setFeedbackSubmitted(true);
  }

  return (
    <main className="min-h-screen p-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="text-4xl font-bold">Decision Detail</h1>

        <div className="mt-8 space-y-6 rounded-xl border border-neutral-200 p-6">
          <div>
            <p className="text-sm text-neutral-500">Decision ID</p>
            <p className="mt-1 font-medium">{detail.decisionId}</p>
          </div>

          <div>
            <p className="text-sm text-neutral-500">Score</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {detail.score} / 100
            </p>
          </div>

          <div>
            <p className="text-sm text-neutral-500">Recommendation</p>
            <p className="mt-1 font-medium">{detail.recommendation}</p>
          </div>

          <div>
            <p className="text-sm text-neutral-500">Confidence</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {detail.confidence.value}%
            </p>
            <p className="mt-1 font-medium">{detail.confidence.level}</p>
            <p className="mt-1 text-sm text-neutral-600">
              {detail.confidence.explanation}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-neutral-700">
              Why this decision?
            </p>
            <ul className="mt-2 space-y-1 text-sm text-neutral-600">
              {detail.reasons.map((reason) => (
                <li key={reason}>• {reason}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-sm font-medium text-neutral-700">
              How Expiya reached this decision
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-neutral-600">
              {detail.trace.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="border-t border-neutral-200 pt-6">
            <p className="text-sm font-medium text-neutral-700">
              Was this decision helpful?
            </p>

            {feedbackSubmitted ? (
              <p className="mt-3 text-sm text-neutral-600">
                Thanks for your feedback.
              </p>
            ) : (
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => handleFeedback(true)}
                  className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:border-black"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => handleFeedback(false)}
                  className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium transition hover:border-black"
                >
                  No
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
