import { createHash } from "node:crypto";

import type { EquipmentPilotManifest, EquipmentPilotVariant } from "@/types/equipmentEvidence";

export const EQUIPMENT_PILOT_SELECTION_POLICY_VERSION = "1.0.1" as const;
export type PilotPriceSegment = "MAINSTREAM" | "MID" | "HIGH";
export interface CatalogPilotRecord { readonly variant: { readonly id: string; readonly brand: { readonly value: string }; readonly model: { readonly value: string }; readonly trim: { readonly value: string }; readonly modelYear: { readonly value: number }; readonly bodyStyle: { readonly value: string }; readonly vehicleUseClass?: { readonly value: string }; readonly powertrain: { readonly fuelType: { readonly value: string } } } }
const hash = (value: string) => createHash("sha256").update(`equipment-pilot-v1.0.1|${value}`).digest("hex");
const familyKey = (item: CatalogPilotRecord) => `${item.variant.brand.value}|${item.variant.model.value}`.normalize("NFKC").toLocaleLowerCase("tr-TR");
const familyId = (key: string) => `family-${createHash("sha256").update(key).digest("hex").slice(0, 16)}`;
const body = (pattern: RegExp) => (item: CatalogPilotRecord) => pattern.test(item.variant.bodyStyle.value);
const fuel = (value: string) => (item: CatalogPilotRecord) => item.variant.powertrain.fuelType.value === value;
const required: readonly [string, number, (item: CatalogPilotRecord) => boolean][] = [
  ["BODY_SEDAN", 3, body(/sedan/iu)], ["BODY_HATCHBACK", 3, body(/hatchback/iu)], ["BODY_SUV_CROSSOVER", 5, body(/suv|crossover/iu)],
  ["BODY_COUPE_LIFTBACK", 1, body(/coupe|liftback/iu)], ["BODY_MPV_PASSENGER", 1, body(/^mpv$/iu)], ["BODY_PASSENGER_VAN", 1, body(/passenger van/iu)],
  ["BODY_PANEL_VAN", 1, body(/panel van/iu)], ["BODY_PICKUP_OFFROAD", 1, body(/pickup|off.?road/iu)],
  ["FUEL_GASOLINE", 3, fuel("GASOLINE")], ["FUEL_DIESEL", 3, fuel("DIESEL")], ["FUEL_HEV", 3, fuel("HEV")], ["FUEL_PHEV", 2, fuel("PHEV")],
  ["FUEL_MHEV", 2, fuel("MHEV")], ["FUEL_LPG", 1, fuel("LPG")], ["FUEL_BEV", 5, fuel("BEV")],
];

export function selectEquipmentPilot(input: { records: readonly CatalogPilotRecord[]; priceSegments: Readonly<Record<string, PilotPriceSegment>>; catalogFingerprint: `sha256:${string}`; generatedAt: string; count?: number }): EquipmentPilotManifest {
  const target = input.count ?? 28, ordered = [...input.records].sort((a, b) => hash(a.variant.id).localeCompare(hash(b.variant.id)));
  const selected = new Map<string, { record: CatalogPilotRecord; axes: string[]; pair?: { familyId: string; otherId: string } }>(), familyCounts = new Map<string, number>();
  const canAdd = (record: CatalogPilotRecord) => (familyCounts.get(familyKey(record)) ?? 0) < 2 && !(record.variant.powertrain.fuelType.value === "BEV" && [...selected.values()].filter((item) => item.record.variant.powertrain.fuelType.value === "BEV").length >= 10);
  const add = (record: CatalogPilotRecord, axis: string) => { const current = selected.get(record.variant.id); if (current) { if (!current.axes.includes(axis)) current.axes.push(axis); return true; } if (!canAdd(record)) return false; selected.set(record.variant.id, { record, axes: [axis] }); const key = familyKey(record); familyCounts.set(key, (familyCounts.get(key) ?? 0) + 1); return true; };
  const groups = new Map<string, CatalogPilotRecord[]>(); for (const item of ordered) { const key = `${familyKey(item)}|${item.variant.modelYear.value}`; groups.set(key, [...(groups.get(key) ?? []), item]); }
  const pairs = [...groups.entries()].filter(([, items]) => new Set(items.map((item) => item.variant.trim.value)).size >= 2).sort(([a], [b]) => hash(a).localeCompare(hash(b))).slice(0, 3);
  if (pairs.length < 3) throw new Error("PILOT_AXIS_UNSATISFIED:PAIRED_TRIM_PACKAGE_PROJECTION");
  for (const [key, items] of pairs) { const [first, second] = [...items].sort((a, b) => hash(a.variant.id).localeCompare(hash(b.variant.id))).slice(0, 2); if (!first || !second) throw new Error("PILOT_AXIS_UNSATISFIED:PAIRED_TRIM_PACKAGE_PROJECTION"); add(first, "PAIRED_TRIM_PACKAGE_PROJECTION"); add(second, "PAIRED_TRIM_PACKAGE_PROJECTION"); const id = familyId(key); selected.get(first.variant.id)!.pair = { familyId: id, otherId: second.variant.id }; selected.get(second.variant.id)!.pair = { familyId: id, otherId: first.variant.id }; }
  for (const [axis, minimum, predicate] of required) while ([...selected.values()].filter(({ record }) => predicate(record)).length < minimum) { const candidate = ordered.find((item) => !selected.has(item.variant.id) && predicate(item) && canAdd(item)); if (!candidate) throw new Error(`PILOT_AXIS_UNSATISFIED:${axis}`); add(candidate, axis); }
  for (const segment of ["MAINSTREAM", "MID", "HIGH"] as const) if (![...selected.values()].some(({ record }) => input.priceSegments[record.variant.id] === segment)) { const candidate = ordered.find((item) => !selected.has(item.variant.id) && input.priceSegments[item.variant.id] === segment && canAdd(item)); if (!candidate) throw new Error(`PILOT_AXIS_UNSATISFIED:PRICE_${segment}`); add(candidate, `PRICE_${segment}`); }
  while (new Set([...selected.values()].map(({ record }) => record.variant.brand.value)).size < 10) { const brands = new Set([...selected.values()].map(({ record }) => record.variant.brand.value)); const candidate = ordered.find((item) => !selected.has(item.variant.id) && !brands.has(item.variant.brand.value) && canAdd(item)); if (!candidate) throw new Error("PILOT_AXIS_UNSATISFIED:BRAND_DIVERSITY"); add(candidate, "BRAND_DIVERSITY"); }
  for (const item of ordered) { if (selected.size >= target) break; const brands = new Set([...selected.values()].map(({ record }) => record.variant.brand.value)); if (!brands.has(item.variant.brand.value) && brands.size >= 16) continue; add(item, "STRATIFIED_DETERMINISTIC_FILL"); }
  if (selected.size !== target) throw new Error("PILOT_DIVERSITY_UNSATISFIED");
  const variants: EquipmentPilotVariant[] = [...selected.values()].map(({ record, axes, pair }) => ({ exactVariantId: record.variant.id, canonicalBrand: record.variant.brand.value, canonicalModel: record.variant.model.value, trim: record.variant.trim.value, modelYear: record.variant.modelYear.value, bodyStyle: record.variant.bodyStyle.value, vehicleUseClass: record.variant.vehicleUseClass?.value ?? "UNSPECIFIED", fuelType: record.variant.powertrain.fuelType.value, priceSegment: input.priceSegments[record.variant.id] ?? "UNSEGMENTED", selectionReason: [...axes].sort().join("+"), testAxes: [...axes].sort(), ...(pair ? { pairedFamilyId: pair.familyId, pairedExactVariantId: pair.otherId, pairedDifferenceReason: `CATALOG_TRIM_DIFF:${record.variant.trim.value}`, expectedProjectionBoundary: "FAMILY_EVIDENCE_MUST_NOT_PROJECT_WITHOUT_EXACT_TRIM_OR_PACKAGE_LINK" } : {}) })).sort((a, b) => a.exactVariantId.localeCompare(b.exactVariantId));
  return { pilotId: "EE-PILOT-001", manifestVersion: "1.0.1", selectionPolicyVersion: "1.0.1", lifecycleState: "PREPARED", supersedesPilotId: "pilot-v1.0.0-catalog-v0.55.1-2026-08-18", catalogRelease: "v0.55.1", catalogFingerprint: input.catalogFingerprint, generatedAt: input.generatedAt, researchStartedAt: null, completedAt: null, immutableSelection: true, variants };
}
