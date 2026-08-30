"use client";

import { useState } from "react";

const format = (value: string | number | undefined) => {
  const digits = String(value ?? "").replace(/\D/gu, "").slice(0, 9);
  return digits ? Number(digits).toLocaleString("tr-TR") : "";
};

export function CatalogPriceInput({ defaultValue }: { readonly defaultValue?: number }) {
  const [value, setValue] = useState(() => format(defaultValue));
  return <input aria-label="En yüksek fiyat" inputMode="numeric" name="maxPrice" value={value} onChange={(event) => setValue(format(event.target.value))} placeholder="Örn. 3.000.000 TL" className="min-h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 text-sm text-stone-900 shadow-[0_1px_0_rgba(28,25,23,.03)] outline-none transition hover:border-stone-300 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100" />;
}
