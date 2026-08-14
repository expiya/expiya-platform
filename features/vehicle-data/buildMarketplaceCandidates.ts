import { createHash } from "node:crypto";

import { normalizeCatalogToken, type ManualCatalogCandidate } from "@/features/vehicle-data/manualCatalogCandidates";

export interface MarketplaceVehicleObservation {
  readonly brand: string;
  readonly model: string;
  readonly year?: number;
  readonly fuel?: string;
  readonly transmission?: string;
  readonly engine?: string;
  readonly trim?: string;
}

function deterministicUuid(value: string): string {
  const hash = createHash("sha256").update(value).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export function buildMarketplaceCandidates(
  observations: readonly MarketplaceVehicleObservation[],
  sourceUrl: string,
  capturedAt: string,
): readonly ManualCatalogCandidate[] {
  const grouped = new Map<string, { observation: MarketplaceVehicleObservation; count: number; firstRow: number }>();
  observations.forEach((observation, index) => {
    const fingerprintInput = [observation.brand, observation.model, observation.year, observation.fuel,
      observation.transmission, observation.engine, observation.trim]
      .map((value) => normalizeCatalogToken(String(value ?? ""))).join("|");
    const fingerprint = createHash("sha256").update(fingerprintInput).digest("hex");
    const existing = grouped.get(fingerprint);
    if (existing) existing.count += 1;
    else grouped.set(fingerprint, { observation, count: 1, firstRow: index + 2 });
  });

  return [...grouped.entries()].map(([fingerprint, { observation, count, firstRow }]) => ({
    id: deterministicUuid(`${sourceUrl}|${capturedAt}|${fingerprint}`),
    sourceRowNumber: firstRow,
    sourcePlatform: "OTHER",
    capturedAt,
    brandRaw: observation.brand,
    modelRaw: observation.model,
    yearFrom: observation.year,
    yearUntil: observation.year,
    fuelRaw: observation.fuel,
    transmissionRaw: observation.transmission,
    engineRaw: observation.engine,
    trimRaw: observation.trim,
    occurrenceCount: count,
    sourceCategoryUrl: sourceUrl,
    notes: "Minimal public catalogue candidate; listing identity, price, mileage, seller and personal data intentionally excluded",
    usageAttestation: "PUBLIC_PAGE_ROBOTS_ALLOWED_TERMS_UNRESOLVED",
    normalizedBrand: normalizeCatalogToken(observation.brand),
    normalizedModel: normalizeCatalogToken(observation.model),
    aliasText: [observation.brand, observation.model, observation.engine, observation.transmission,
      observation.trim, observation.year].filter(Boolean).join(" "),
    fingerprint,
  }));
}
