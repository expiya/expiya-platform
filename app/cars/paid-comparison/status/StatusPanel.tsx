"use client";

import { useEffect, useState } from "react";

type Status = "QUEUED" | "RUNNING" | "READY" | "FAILED" | "REFUND_REQUIRED";

export default function StatusPanel({ paymentSucceeded }: { paymentSucceeded: boolean }) {
  const [status, setStatus] = useState<Status | undefined>();
  useEffect(() => {
    if (!paymentSucceeded) return;
    let active = true;
    const load = async () => {
      const response = await fetch("/api/cars/paid-comparison/status", { cache: "no-store" });
      if (active && response.ok) setStatus((await response.json()).status);
    };
    void load();
    const interval = window.setInterval(load, 10_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [paymentSucceeded]);
  if (!paymentSucceeded) return null;
  const copy = status === "READY" ? "Raporun hazır. Güvenli görüntüleme bağlantısı bir sonraki geliştirme diliminde etkinleşecek."
    : status === "RUNNING" ? "Doğrulanmış verilerle raporun hazırlanıyor."
      : status === "FAILED" || status === "REFUND_REQUIRED" ? "Rapor üretiminde sorun oluştu. Yeniden ücret alınmadan kontrol ve gerekirse iade süreci başlatılacak."
        : "Raporun üretim sırasına alındı.";
  return <p className="mt-4 rounded-xl bg-neutral-100 p-4 text-sm dark:bg-neutral-900" aria-live="polite">{copy}</p>;
}
