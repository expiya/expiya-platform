"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  return (
    <main className="min-h-screen bg-gradient-to-b from-white to-neutral-50">
      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 py-24 text-center">

        <div className="rounded-full border border-neutral-300 px-4 py-2 text-sm text-neutral-600">
          Expiya Cars MVP v0.1
        </div>

        <h1 className="mt-8 text-5xl font-bold tracking-tight sm:text-6xl">
          Find your next car
          <br />
          with AI
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-neutral-600">
          Describe the car you are looking for and let Expiya analyze the best
          buying option for you.
        </p>

        <textarea
  value={query}
  onChange={(e) => setQuery(e.target.value)}
  placeholder="Example: I'm looking for a 2023 Toyota Corolla Hybrid under 60,000 km with an automatic transmission."
  className="mt-10 h-40 w-full max-w-3xl rounded-2xl border border-neutral-300 p-6 text-lg outline-none focus:border-black"
/>

        <button
  onClick={() =>
    router.push(`/analysis?query=${encodeURIComponent(query)}`)
  }
  className="mt-8 rounded-xl bg-black px-8 py-4 font-semibold text-white transition hover:bg-neutral-800"
>
  Analyze My Next Car
</button>

      </section>
    </main>
  );
}