import { productionVehicleMediaAssets } from "@/data/production/vehicleMediaAssets";
import type { VehicleMediaAsset } from "@/types/vehicleMedia";
import { isPublishableVehicleMediaAsset } from "@/features/vehicle-data/validateVehicleMediaAsset";
import type { GovernedMediaDisposition } from "@/features/media/governedProductMedia";

export const PRODUCTION_VEHICLE_PLACEHOLDER = "/cars/owned-representative.svg";

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
  readonly disposition?: GovernedMediaDisposition;
  readonly linkTarget?: string;
  readonly disclosure?: string;
}

const normalize = (value: string | undefined) => value?.trim().toLocaleUpperCase("tr-TR");

function matches(asset: VehicleMediaAsset, identity: VehicleImageIdentity): boolean {
  if (asset.market !== "TR" || !isPublishableVehicleMediaAsset(asset)) return false;
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

const eligibleAssetsCache = new WeakMap<object, readonly VehicleMediaAsset[]>();

function eligibleAssets(assets: readonly VehicleMediaAsset[]): readonly VehicleMediaAsset[] {
  const cached = eligibleAssetsCache.get(assets);
  if (cached) return cached;
  const eligible = assets.filter((candidate) => candidate.market === "TR" && isPublishableVehicleMediaAsset(candidate)
    && candidate.isPrimary && candidate.kind === "HERO_EXTERIOR");
  eligibleAssetsCache.set(assets, eligible);
  return eligible;
}

export function resolveVehicleGallery(identity: VehicleImageIdentity, assets: readonly VehicleMediaAsset[] = productionVehicleMediaAssets): readonly ResolvedVehicleImage[] {
  return assets.filter((candidate) => matches(candidate, identity)).sort((left, right) => Number(right.isPrimary) - Number(left.isPrimary) || authorityPriority(right) - authorityPriority(left) || scopePriority[right.scope] - scopePriority[left.scope] || left.id.localeCompare(right.id)).filter((asset, index, all) => all.findIndex((candidate) => candidate.storagePath === asset.storagePath) === index).map((asset) => ({ path: asset.storagePath, status: asset.scope === "VARIANT" ? "EXACT" as const : "REPRESENTATIVE" as const, assetId: asset.id, attributionText: asset.attributionText, representedModel: asset.scope === "VARIANT" ? undefined : `${asset.brand} ${asset.model}` }));
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
    return {
      path: PRODUCTION_VEHICLE_PLACEHOLDER,
      status: "REPRESENTATIVE",
      assetId: "owned-representative:vehicle",
      attributionText: "Expiya görseli",
      representedModel: "genel araç illüstrasyonu",
      disposition: "OWNED_REPRESENTATIVE",
      disclosure: "Temsilî illüstrasyon; önerilen aracın birebir fotoğrafı değildir.",
    };
  }
  const disposition = asset.governance?.disposition ?? (asset.scope === "VARIANT" ? "EXACT_LICENSED" : "MODEL_FAMILY_LICENSED");
  return {
    path: asset.storagePath,
    status: asset.scope === "VARIANT" ? "EXACT" : "REPRESENTATIVE",
    assetId: asset.id,
    attributionText: asset.attributionText,
    representedModel: asset.scope === "VARIANT" ? undefined : `${asset.brand} ${asset.model}`,
    disposition,
    linkTarget: asset.governance?.requiredLinkTarget ?? undefined,
    disclosure: asset.governance?.requiredDisclosure ?? undefined,
  };
}
