"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PAID_COMPARISON_RETURN_URL_STORAGE_KEY } from "@/features/paid-comparison/clientContract";

export default function ReportNavigation() {
  const [returnUrl, setReturnUrl] = useState("/");
  useEffect(() => { const stored = sessionStorage.getItem(PAID_COMPARISON_RETURN_URL_STORAGE_KEY) ?? ""; if (stored.startsWith("/") && !stored.startsWith("//")) Promise.resolve().then(() => setReturnUrl(stored)); }, []);
  return <Link href={returnUrl} className="inline-flex min-h-11 items-center rounded-full border border-stone-300 bg-white px-5 text-sm font-semibold text-stone-700 transition hover:border-stone-500">← Araç kararına dön</Link>;
}
