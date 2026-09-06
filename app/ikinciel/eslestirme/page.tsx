import { Suspense } from "react";
import { UsedCarsMatcherDemo } from "@/components/used-cars/UsedCarsMatcherDemo";

export default function UsedCarsMatchingPage() { return <Suspense fallback={<main className="mx-auto max-w-7xl px-5 py-16">Eşleştirme hazırlanıyor…</main>}><UsedCarsMatcherDemo /></Suspense>; }
