import "server-only";

import { evaluateV3Catalog } from "@/features/decision/v3/catalogAdapter.server";
import type { CatalogVariantSnapshot } from "@/features/decision/v2/catalog/types";
import { resolveVehicleImage } from "@/features/vehicle-data/resolveVehicleImage";

export const CATALOG_PAGE_SIZE = 24;

export type CatalogSort = "BRAND_ASC" | "PRICE_ASC" | "PRICE_DESC" | "YEAR_DESC" | "SEATS_DESC";
export const DEFAULT_CATALOG_CLASS = "PASSENGER";
export const DEFAULT_CATALOG_SORT: CatalogSort = "PRICE_ASC";
export interface CatalogBrowserQuery {
  readonly q: string;
  readonly brand: string;
  readonly useClass: string;
  readonly bodyStyle: string;
  readonly fuelType: string;
  readonly minPriceTry?: number;
  readonly maxPriceTry?: number;
  readonly sort: CatalogSort;
  readonly page: number;
}

export interface CatalogBrowserRow {
  readonly id: string;
  readonly image: string;
  readonly imageStatus: "EXACT" | "REPRESENTATIVE" | "APPROXIMATE" | "PLACEHOLDER";
  readonly brand: string;
  readonly model: string;
  readonly trim: string;
  readonly modelYear: number;
  readonly useClass: string;
  readonly bodyStyle: string;
  readonly fuelType: string;
  readonly transmission: string;
  readonly seats?: number;
  readonly priceDisplay: string;
  readonly priceDateDisplay?: string;
  readonly priceStatus: "VERIFIED" | "EXPIRED" | "INTERNAL_ONLY" | "UNAVAILABLE";
}

const fuelLabels: Readonly<Record<string, string>> = {
  GASOLINE: "Benzin", DIESEL: "Dizel", LPG: "LPG", MHEV: "Hafif hibrit", HEV: "Hibrit", PHEV: "Şarj edilebilir hibrit", BEV: "Elektrikli", HYDROGEN: "Hidrojen",
};
const useClassLabels: Readonly<Record<string, string>> = { PASSENGER: "Binek", LIGHT_COMMERCIAL: "Hafif ticari", HEAVY_COMMERCIAL: "Ağır ticari" };
const bodyLabels: Readonly<Record<string, string>> = {
  HATCHBACK: "Hatchback", SEDAN: "Sedan", SUV: "SUV", CROSSOVER: "Crossover", MPV: "MPV", "PASSENGER VAN": "Yolcu vanı", PANELVAN: "Panelvan", "PANEL VAN": "Panelvan", PICKUP: "Pick-up", "PICK-UP": "Pick-up", "STATION WAGON": "Station wagon", COUPE: "Coupé", CABRIO: "Cabrio",
};

const normalize = (value: string) => value.toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/\p{M}+/gu, "").replace(/ı/gu, "i");
const labelBody = (value: string) => bodyLabels[value.toLocaleUpperCase("tr-TR")] ?? value;
const labelUseClass = (value?: string) => value ? useClassLabels[value] ?? value : "Belirtilmemiş";
const publicPrice = (variant: CatalogVariantSnapshot, now: Date) => {
  const price = variant.activeNewPrice;
  if (!price) return { display: "Güncel fiyat doğrulanıyor", status: "UNAVAILABLE" as const };
  if (price.consumerVisibility !== "PUBLIC" || !price.realizationSafe || !["LIST", "CAMPAIGN"].includes(price.priceType)) return { display: "Güncel fiyat doğrulanıyor", status: "INTERNAL_ONLY" as const };
  const expired = Boolean(price.validUntil && Date.parse(price.validUntil) < now.getTime());
  return { display: `${price.amountTry.toLocaleString("tr-TR")} TL`, status: expired ? "EXPIRED" as const : "VERIFIED" as const };
};
const formatDate = (value?: string) => value && !Number.isNaN(Date.parse(value)) ? new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Istanbul" }).format(new Date(value)) : undefined;

export function parseCatalogBrowserQuery(input: Record<string, string | string[] | undefined>): CatalogBrowserQuery {
  const one = (key: string) => String(Array.isArray(input[key]) ? input[key]?.[0] ?? "" : input[key] ?? "").trim().slice(0, 100);
  const money = (key: string) => { const value = Number(one(key).replace(/[^\d]/gu, "")); return Number.isSafeInteger(value) && value > 0 ? value : undefined; };
  const requestedSort = one("sort");
  const sort: CatalogSort = ["BRAND_ASC", "PRICE_ASC", "PRICE_DESC", "YEAR_DESC", "SEATS_DESC"].includes(requestedSort) ? requestedSort as CatalogSort : DEFAULT_CATALOG_SORT;
  const useClass = Object.hasOwn(input, "class") ? one("class") : DEFAULT_CATALOG_CLASS;
  return { q: one("q"), brand: one("brand"), useClass, bodyStyle: one("body"), fuelType: one("fuel"), minPriceTry: money("minPrice"), maxPriceTry: money("maxPrice"), sort, page: Math.max(1, Math.min(100, Number(one("page")) || 1)) };
}

function matchesQuery(variant: CatalogVariantSnapshot, query: CatalogBrowserQuery): boolean {
  const haystack = normalize(`${variant.brand} ${variant.model} ${variant.trim}`);
  if (query.q && !haystack.includes(normalize(query.q))) return false;
  if (query.brand && variant.brand !== query.brand) return false;
  if (query.useClass && variant.decisionFacts.vehicleUseClass?.value !== query.useClass) return false;
  if (query.bodyStyle && variant.decisionFacts.bodyStyle.value !== query.bodyStyle) return false;
  if (query.fuelType && variant.decisionFacts.powertrain.fuelType.value !== query.fuelType) return false;
  const internalPrice = variant.activeNewPrice?.amountTry;
  if (query.minPriceTry && (internalPrice === undefined || internalPrice < query.minPriceTry)) return false;
  if (query.maxPriceTry && (internalPrice === undefined || internalPrice > query.maxPriceTry)) return false;
  return true;
}

function compareVariants(left: CatalogVariantSnapshot, right: CatalogVariantSnapshot, sort: CatalogSort): number {
  const leftPrice = left.activeNewPrice?.amountTry; const rightPrice = right.activeNewPrice?.amountTry;
  if (sort === "PRICE_ASC") return (leftPrice ?? Number.POSITIVE_INFINITY) - (rightPrice ?? Number.POSITIVE_INFINITY) || left.id.localeCompare(right.id);
  if (sort === "PRICE_DESC") return (rightPrice ?? Number.NEGATIVE_INFINITY) - (leftPrice ?? Number.NEGATIVE_INFINITY) || left.id.localeCompare(right.id);
  if (sort === "YEAR_DESC") return right.decisionFacts.modelYear.value - left.decisionFacts.modelYear.value || left.id.localeCompare(right.id);
  if (sort === "SEATS_DESC") return (right.decisionFacts.dimensions.seats?.value ?? -1) - (left.decisionFacts.dimensions.seats?.value ?? -1) || left.id.localeCompare(right.id);
  return left.brand.localeCompare(right.brand, "tr") || left.model.localeCompare(right.model, "tr") || left.trim.localeCompare(right.trim, "tr");
}

export async function getCatalogBrowserPage(query: CatalogBrowserQuery, now = new Date()) {
  const catalog = await evaluateV3Catalog([], now);
  const all = catalog.variants;
  const brands = [...new Set(all.map((item) => item.brand))].sort((a, b) => a.localeCompare(b, "tr"));
  const useClasses = [...new Set(all.flatMap((item) => item.decisionFacts.vehicleUseClass ? [item.decisionFacts.vehicleUseClass.value] : []))].sort();
  const bodyStyles = [...new Set(all.map((item) => item.decisionFacts.bodyStyle.value))].sort((a, b) => a.localeCompare(b, "tr"));
  const fuelTypes = [...new Set(all.map((item) => item.decisionFacts.powertrain.fuelType.value))].sort();
  const filtered = all.filter((item) => matchesQuery(item, query)).sort((a, b) => compareVariants(a, b, query.sort));
  const pageCount = Math.max(1, Math.ceil(filtered.length / CATALOG_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  const selected = filtered.slice((page - 1) * CATALOG_PAGE_SIZE, page * CATALOG_PAGE_SIZE);
  const rows: CatalogBrowserRow[] = selected.map((variant) => {
    const image = resolveVehicleImage({ variantId: variant.id, brand: variant.brand, model: variant.model, bodyStyle: variant.decisionFacts.bodyStyle.value, modelYear: variant.decisionFacts.modelYear.value });
    const price = publicPrice(variant, now);
    return { id: variant.id, image: image.path, imageStatus: image.status, brand: variant.brand, model: variant.model, trim: variant.trim, modelYear: variant.decisionFacts.modelYear.value, useClass: labelUseClass(variant.decisionFacts.vehicleUseClass?.value), bodyStyle: labelBody(variant.decisionFacts.bodyStyle.value), fuelType: fuelLabels[variant.decisionFacts.powertrain.fuelType.value] ?? variant.decisionFacts.powertrain.fuelType.value, transmission: variant.decisionFacts.powertrain.transmission.value, seats: variant.decisionFacts.dimensions.seats?.value, priceDisplay: price.display, priceDateDisplay: price.status === "VERIFIED" || price.status === "EXPIRED" ? formatDate(variant.activeNewPrice?.validFrom) : undefined, priceStatus: price.status };
  });
  return { rows, total: filtered.length, initialCount: all.length, brandCount: brands.length, modelCount: new Set(all.map((item) => `${item.brand}\u0000${item.model}`)).size, classCount: useClasses.length, page, pageCount, facets: { brands, useClasses: useClasses.map((value) => ({ value, label: labelUseClass(value) })), bodyStyles: bodyStyles.map((value) => ({ value, label: labelBody(value) })), fuelTypes: fuelTypes.map((value) => ({ value, label: fuelLabels[value] ?? value })) } };
}
