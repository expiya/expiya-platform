"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Status = "QUEUED" | "RUNNING" | "READY" | "FAILED" | "REFUND_REQUIRED";
type StatusResponse = { status: Status; emailDelivery?: "TEST_MODE" | "QUEUED" | "SENT" | "FAILED"; maskedEmail?: string };

export default function StatusPanel({ paymentSucceeded }: { paymentSucceeded: boolean }) {
  const [status, setStatus] = useState<Status | undefined>();
  const [delivery, setDelivery] = useState<StatusResponse>();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  useEffect(() => {
    if (!paymentSucceeded) return;
    let active = true;
    const load = async () => {
      const response = await fetch("/api/cars/paid-comparison/status", { cache: "no-store" });
      if (active && response.ok) { const body = await response.json() as StatusResponse; setStatus(body.status); setDelivery(body); }
    };
    void load();
    const interval = window.setInterval(load, 10_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [paymentSucceeded]);
  useEffect(() => { if (!paymentSucceeded || status === "READY" || status === "FAILED" || status === "REFUND_REQUIRED") return; const interval = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1_000); return () => window.clearInterval(interval); }, [paymentSucceeded, status]);
  if (!paymentSucceeded) return null;
  const copy = status === "READY" ? "Raporun hazır. Aşağıdaki güvenli bağlantıdan görüntüleyebilirsin."
    : status === "RUNNING" ? "Doğrulanmış verilerle raporun hazırlanıyor."
      : status === "FAILED" || status === "REFUND_REQUIRED" ? "Rapor üretiminde sorun oluştu. Yeniden ücret alınmadan kontrol ve gerekirse iade süreci başlatılacak."
        : "Raporun üretim sırasına alındı.";
  const progress = status === "READY" ? 100 : Math.min(92, 8 + elapsedSeconds * 1.4);
  return <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 p-5 text-sm leading-6" aria-live="polite"><div className="flex items-center gap-5">{status !== "FAILED" && status !== "REFUND_REQUIRED" && <div className="relative size-20 shrink-0" role="progressbar" aria-label="Rapor hazırlık göstergesi" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><svg viewBox="0 0 80 80" className="-rotate-90"><circle cx="40" cy="40" r="34" fill="white" stroke="#e7e5e4" strokeWidth="7"/><circle cx="40" cy="40" r="34" fill="none" stroke="#047857" strokeWidth="7" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100-progress} className="transition-all duration-700"/></svg><span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-emerald-800">{status === "READY" ? "Hazır" : `${elapsedSeconds} sn`}</span></div>}<div><p className="font-medium text-stone-950">{copy}</p>{status !== "READY" && status !== "FAILED" && status !== "REFUND_REQUIRED" && <p className="mt-1 text-xs text-stone-500">Bu, geçen süreyi gösteren hazırlık göstergesidir; kesin teslim süresi taahhüdü değildir.</p>}</div></div>{status === "READY" && delivery?.emailDelivery === "SENT" && <p className="mt-3 text-emerald-800">PDF ayrıca {delivery.maskedEmail} adresine gönderildi.</p>}{status === "READY" && delivery?.emailDelivery === "TEST_MODE" && <p className="mt-3 text-amber-800">Sandbox testinde e-posta teslimi {delivery.maskedEmail} için kaydedildi; gerçek e-posta gönderilmedi.</p>}{status === "READY" && <Link href="/cars/paid-comparison/report" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-emerald-700 px-5 font-semibold text-white">PDF raporu görüntüle</Link>}</div>;
}
