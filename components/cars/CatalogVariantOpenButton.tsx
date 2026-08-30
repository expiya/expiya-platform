"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CatalogVariantOpenButton({ exactVariantId, mode = "CTA" }: { readonly exactVariantId: string; readonly mode?: "CTA" | "IMAGE" }) {
  const router = useRouter();
  const [status, setStatus] = useState<"IDLE" | "LOADING" | "ERROR">("IDLE");
  async function open() {
    if (status === "LOADING") return;
    setStatus("LOADING");
    try {
      sessionStorage.setItem("expiya:catalog-return-url", `${window.location.pathname}${window.location.search}`);
      const response = await fetch("/api/cars/catalog/handoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exactVariantId }) });
      const payload = await response.json() as { token?: string; message?: string };
      if (!response.ok || !payload.token) throw new Error(payload.message ?? "Araç sayfası açılamadı.");
      router.push(`/cars/variant/${encodeURIComponent(exactVariantId)}?handoff=${encodeURIComponent(payload.token)}`);
    } catch { setStatus("ERROR"); }
  }
  if (mode === "IMAGE") return <button type="button" aria-label="Aracı incele" onClick={() => void open()} disabled={status === "LOADING"} className="absolute inset-0 z-10 cursor-pointer rounded-t-[1.5rem] focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-emerald-700"><span className="sr-only">{status === "LOADING" ? "Araç açılıyor" : "Aracı incele"}</span></button>;
  return <div className="min-w-28"><button type="button" onClick={() => void open()} disabled={status === "LOADING"} className="w-full rounded-xl bg-emerald-700 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-wait disabled:opacity-60">{status === "LOADING" ? "Açılıyor…" : "Aracı incele"}</button>{status === "ERROR" ? <p role="alert" className="mt-1 text-xs text-rose-700">Geçiş hazırlanamadı. Tekrar dene.</p> : null}</div>;
}
