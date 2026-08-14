import type {
  RuntimeVehicleCandidateId,
  VehicleEvidenceReadPort,
} from "@/types/runtimeVehicleEvidence";

export type VehicleEvidenceTypeBIdentityResolution =
  | {
      readonly status: "RESOLVED";
      readonly optionIds: readonly RuntimeVehicleCandidateId[];
    }
  | {
      readonly status: "UNRESOLVED";
      readonly reason: "CATALOG_VARIANT_NOT_IN_ACTIVE_ARTIFACT";
      readonly vehicleVariantId: string;
    };

export function resolveVehicleEvidenceTypeBIdentity(
  vehicleVariantIds: readonly string[],
  port: VehicleEvidenceReadPort,
): VehicleEvidenceTypeBIdentityResolution {
  const optionIds: RuntimeVehicleCandidateId[] = [];
  for (const vehicleVariantId of vehicleVariantIds) {
    const optionId = port.resolveCatalogVariantId(vehicleVariantId);
    if (!optionId) {
      return {
        status: "UNRESOLVED",
        reason: "CATALOG_VARIANT_NOT_IN_ACTIVE_ARTIFACT",
        vehicleVariantId,
      };
    }
    optionIds.push(optionId);
  }
  return { status: "RESOLVED", optionIds: Object.freeze(optionIds) };
}
