import { productionVehicleMediaAssets } from "@/data/production/vehicleMediaAssets";
import type { VehicleMediaAsset } from "@/types/vehicleMedia";
import { isPublishableVehicleMediaAsset } from "@/features/vehicle-data/validateVehicleMediaAsset";

export const PRODUCTION_VEHICLE_PLACEHOLDER = "/cars/production-placeholder.svg";

export interface VehicleImageIdentity {
  readonly variantId: string;
  readonly brand: string;
  readonly model: string;
  readonly generation?: string;
  readonly bodyStyle: string;
  readonly modelYear: number;
}

export interface ResolvedVehicleImage {
  readonly path: string;
  readonly status: "EXACT" | "REPRESENTATIVE" | "APPROXIMATE" | "PLACEHOLDER";
  readonly assetId?: string;
  readonly attributionText?: string;
  readonly representedModel?: string;
}

const normalize = (value: string | undefined) => value?.trim().toLocaleUpperCase("tr-TR");

function matches(asset: VehicleMediaAsset, identity: VehicleImageIdentity): boolean {
  if (asset.market !== "TR" || !isPublishableVehicleMediaAsset(asset) || !asset.isPrimary || asset.kind !== "HERO_EXTERIOR") return false;
  if (normalize(asset.brand) !== normalize(identity.brand) || normalize(asset.model) !== normalize(identity.model)) return false;
  if (asset.modelYearFrom && identity.modelYear < asset.modelYearFrom) return false;
  if (asset.modelYearTo && identity.modelYear > asset.modelYearTo) return false;
  if (asset.scope === "VARIANT") return asset.variantId === identity.variantId;
  if (asset.scope === "GENERATION_BODY") return Boolean(asset.generation) && normalize(asset.generation) === normalize(identity.generation)
    && normalize(asset.bodyStyle) === normalize(identity.bodyStyle);
  if (asset.scope === "MODEL_BODY") return normalize(asset.bodyStyle) === normalize(identity.bodyStyle);
  return asset.scope === "MODEL";
}

const scopePriority: Readonly<Record<VehicleMediaAsset["scope"], number>> = {
  VARIANT: 4, GENERATION_BODY: 3, MODEL_BODY: 2, MODEL: 1,
};

const authorityPriority = (asset: VehicleMediaAsset) => asset.sourceAuthority === "OFFICIAL_MANUFACTURER_OR_DISTRIBUTOR" ? 10 : 0;

const comparableTokens = (value: string) => new Set(normalize(value)?.replace(/[^A-Z0-9ÇĞİÖŞÜ]+/g, " ").split(" ")
  .filter((token) => token.length > 1 && !["YENİ", "NEW", "ELECTRIC", "ELEKTRİK", "HYBRID", "HİBRİT"].includes(token)) ?? []);

function similarityScore(asset: VehicleMediaAsset, identity: VehicleImageIdentity): number {
  const targetTokens = comparableTokens(identity.model), assetTokens = comparableTokens(asset.model);
  const commonTokens = [...targetTokens].filter((token) => assetTokens.has(token)).length;
  const unionSize = new Set([...targetTokens, ...assetTokens]).size || 1;
  const bodyScore = normalize(asset.bodyStyle) === normalize(identity.bodyStyle) ? 100 : 0;
  const brandScore = normalize(asset.brand) === normalize(identity.brand) ? 200 : 0;
  const generationScore = identity.generation && normalize(asset.generation) === normalize(identity.generation) ? 30 : 0;
  const familyScore = Math.round((commonTokens / unionSize) * 60);
  const assetYear = asset.modelYearFrom ?? asset.modelYearTo ?? identity.modelYear;
  const yearScore = Math.max(0, 10 - Math.abs(identity.modelYear - assetYear));
  return brandScore + bodyScore + generationScore + familyScore + yearScore;
}

const eligibleAssetsCache = new WeakMap<object, readonly VehicleMediaAsset[]>();

function eligibleAssets(assets: readonly VehicleMediaAsset[]): readonly VehicleMediaAsset[] {
  const cached = eligibleAssetsCache.get(assets);
  if (cached) return cached;
  const eligible = assets.filter((candidate) => candidate.market === "TR" && isPublishableVehicleMediaAsset(candidate)
    && candidate.isPrimary && candidate.kind === "HERO_EXTERIOR");
  eligibleAssetsCache.set(assets, eligible);
  return eligible;
}

export function resolveVehicleImage(
  identity: VehicleImageIdentity,
  assets: readonly VehicleMediaAsset[] = productionVehicleMediaAssets,
): ResolvedVehicleImage {
  const candidates = eligibleAssets(assets);
  const asset = candidates.filter((candidate) => matches(candidate, identity))
    .sort((left, right) => authorityPriority(right) - authorityPriority(left)
      || scopePriority[right.scope] - scopePriority[left.scope])[0];
  if (!asset) {
    let fallback: VehicleMediaAsset | undefined;
    let fallbackScore = Number.NEGATIVE_INFINITY;
    for (const candidate of candidates) {
      const score = similarityScore(candidate, identity);
      if (score > fallbackScore || (score === fallbackScore && candidate.id.localeCompare(fallback?.id ?? "", "en") < 0)) {
        fallback = candidate;
        fallbackScore = score;
      }
    }
    if (!fallback) return { path: PRODUCTION_VEHICLE_PLACEHOLDER, status: "PLACEHOLDER" };
    return {
      path: fallback.storagePath,
      status: "APPROXIMATE",
      assetId: fallback.id,
      attributionText: fallback.attributionText,
      representedModel: `${fallback.brand} ${fallback.model}`,
    };
  }
  return {
    path: asset.storagePath,
    status: asset.scope === "VARIANT" ? "EXACT" : "REPRESENTATIVE",
    assetId: asset.id,
    attributionText: asset.attributionText,
    representedModel: asset.scope === "VARIANT" ? undefined : `${asset.brand} ${asset.model}`,
  };
}
