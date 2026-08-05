"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const query = searchParams.get("query") ?? "";

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(`/result?query=${encodeURIComponent(query)}`);
    }, 3000);

    return () => clearTimeout(timer);
  }, [router, query]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-neutral-50 px-6">
      <div className="w-full max-w-2xl rounded-3xl border border-neutral-200 bg-white p-10 shadow-sm">

        <h1 className="text-center text-4xl font-bold">
          🤖 AI is analyzing...
        </h1>

        <div className="mt-8 rounded-xl bg-neutral-100 p-4">
          <p className="text-sm text-neutral-500">
            Your request
          </p>

          <p className="mt-2 whitespace-pre-wrap text-lg">
            {query}
          </p>
        </div>

        <p className="mt-8">🔍 Searching listings...</p>
        <p className="mt-3">⭐ Reading owner reviews...</p>
        <p className="mt-3">📊 Comparing market prices...</p>
        <p className="mt-3">🧠 Calculating Expiya AI Score...</p>

      </div>
    </main>
  );
}