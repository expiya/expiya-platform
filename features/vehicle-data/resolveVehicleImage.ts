import { productionVehicleMediaAssets } from "@/data/production/vehicleMediaAssets";
import type { VehicleMediaAsset } from "@/types/vehicleMedia";

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
  readonly status: "EXACT" | "REPRESENTATIVE" | "PLACEHOLDER";
  readonly assetId?: string;
  readonly attributionText?: string;
}

const normalize = (value: string | undefined) => value?.trim().toLocaleUpperCase("tr-TR");

function matches(asset: VehicleMediaAsset, identity: VehicleImageIdentity): boolean {
  if (asset.market !== "TR" || asset.publicationState !== "PUBLISHED" || !asset.isPrimary || asset.kind !== "HERO_EXTERIOR") return false;
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

export function resolveVehicleImage(
  identity: VehicleImageIdentity,
  assets: readonly VehicleMediaAsset[] = productionVehicleMediaAssets,
): ResolvedVehicleImage {
  const asset = assets.filter((candidate) => matches(candidate, identity))
    .sort((left, right) => scopePriority[right.scope] - scopePriority[left.scope])[0];
  if (!asset) return { path: PRODUCTION_VEHICLE_PLACEHOLDER, status: "PLACEHOLDER" };
  return {
    path: asset.storagePath,
    status: asset.scope === "VARIANT" ? "EXACT" : "REPRESENTATIVE",
    assetId: asset.id,
    attributionText: asset.attributionText,
  };
}
