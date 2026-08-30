"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type Vehicle = { exactVariantId: string; role: string; identity: { brand: string; model: string; trim: string }; price: { value: number | null; validFrom: string | null }; imageUrl?: string; imageStatus?: string };
type Report = { vehicles: Vehicle[] };
const money = (value: number | null) => value === null ? "Fiyat doğrulanamadı" : new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(value);

export function UnlockedReportVehicles({ currentExactVariantId }: { currentExactVariantId: string }) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  useEffect(() => { void fetch("/api/cars/paid-comparison/report", { cache: "no-store" }).then(async response => response.ok ? response.json() as Promise<Report> : undefined).then(report => { if (report?.vehicles.some(vehicle => vehicle.exactVariantId === currentExactVariantId)) setVehicles(report.vehicles); }).catch(() => undefined); }, [currentExactVariantId]);
  if (vehicles.length !== 3) return null;
  return <section className="border-y border-stone-200 bg-[#f7f8f5] px-5 py-12 sm:px-8" aria-labelledby="unlocked-report-vehicles-title"><div className="mx-auto max-w-7xl"><p className="text-xs font-semibold uppercase tracking-[.28em] text-emerald-700">Satın alınan karşılaştırma</p><h2 id="unlocked-report-vehicles-title" className="mt-3 text-3xl font-semibold tracking-tight">Karşılaştırmayla açılan araçların</h2><p className="mt-3 max-w-3xl leading-7 text-stone-600">İlk kararın değişmedi. Raporda karşılaştırdığın iki alternatifin detaylarına ve satış adımlarına da artık bu ekrandan erişebilirsin.</p><div className="mt-7 grid gap-4 md:grid-cols-3">{vehicles.map(vehicle => <article key={vehicle.exactVariantId} className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${vehicle.exactVariantId === currentExactVariantId ? "border-emerald-500 ring-1 ring-emerald-500" : "border-stone-200"}`}><div className="relative aspect-[16/9] bg-stone-100">{vehicle.imageUrl ? <Image src={vehicle.imageUrl} alt={`${vehicle.identity.brand} ${vehicle.identity.model} araç görseli`} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-contain p-3" /> : null}</div><div className="p-5"><span className="text-xs font-semibold uppercase tracking-[.16em] text-emerald-700">{vehicle.role === "DECISION_CARD" ? "İlk karar" : "Raporla açıldı"}</span><h3 className="mt-2 font-semibold text-stone-950">{vehicle.identity.brand} {vehicle.identity.model}</h3><p className="mt-1 text-sm text-stone-600">{vehicle.identity.trim}</p><p className="mt-3 font-semibold">{money(vehicle.price.value)}</p><Link href={`/cars/paid-comparison/vehicle/${encodeURIComponent(vehicle.exactVariantId)}`} className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-stone-950 px-5 text-sm font-semibold text-white">Araç sayfasını aç</Link></div></article>)}</div></div></section>;
}
