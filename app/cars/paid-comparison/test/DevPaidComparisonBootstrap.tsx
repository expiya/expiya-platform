"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { storePaidComparisonHandoff, storePaidComparisonReturnUrl } from "@/features/paid-comparison/clientContract";

export default function DevPaidComparisonBootstrap() {
  const router = useRouter();
  const [message, setMessage] = useState("Katalogdan fotoğraflı örnek araçlar hazırlanıyor…");

  useEffect(() => {
    fetch("/api/cars/paid-comparison/dev-bootstrap", { method: "POST", headers: { "Content-Type": "application/json" } })
      .then(async (response) => {
        const payload = await response.json() as { token?: string; title?: string; message?: string };
        if (!response.ok || !payload.token) throw new Error(payload.message ?? "Test karşılaştırması hazırlanamadı.");
        storePaidComparisonHandoff(sessionStorage, payload.token);
        storePaidComparisonReturnUrl(sessionStorage, "/");
        setMessage(`${payload.title ?? "Örnek araç"} ile karşılaştırma açılıyor…`);
        router.replace("/cars/paid-comparison");
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Test karşılaştırması hazırlanamadı."));
  }, [router]);

  return <main className="mx-auto flex min-h-screen max-w-xl items-center px-5 py-16"><section className="w-full rounded-3xl border border-emerald-200 bg-emerald-50 p-7 text-center"><p className="text-sm font-semibold text-emerald-800">Expiya Cars · Yerel test</p><h1 className="mt-2 text-2xl font-semibold text-neutral-950">3 araçlık örnek karşılaştırma hazırlanıyor</h1><p className="mt-4 text-sm leading-6 text-neutral-700" aria-live="polite">{message}</p></section></main>;
}
