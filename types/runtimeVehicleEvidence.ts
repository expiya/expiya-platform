export type RuntimeVehicleCandidateId = string & {
  readonly __brand: "RuntimeVehicleCandidateId";
};

export type VehicleEvidenceFactKey = "seats" | "cargo_volume_l";

export interface VehicleCandidateIdentityMapRecord {
  readonly runtimeVehicleCandidateId: RuntimeVehicleCandidateId;
  readonly vehicleVariantId: string;
  readonly configurationId: string;
  readonly mappingStatus: "VERIFIED_ONE_TO_ONE";
}

export interface VehicleEvidenceFactResolution {
  readonly status: "AVAILABLE" | "MISSING" | "UNRESOLVED" | "CONFLICT";
  readonly runtimeVehicleCandidateId: RuntimeVehicleCandidateId;
  readonly configurationId: string;
  readonly factKey: VehicleEvidenceFactKey;
  readonly value?: number;
  readonly valueMin?: number;
  readonly valueMax?: number;
  readonly rangeSemantics?: "MIN_MAX";
  readonly unit?: string;
  readonly measurementContext?: string;
  readonly factId?: string;
  readonly evidenceState?: "VERIFIED";
  readonly applicability?: "EXACT";
  readonly assertionIds: readonly string[];
  readonly sourceIds: readonly string[];
  readonly limitations: readonly string[];
  readonly artifactVersion: string;
}

export interface VehicleEvidenceReadPort {
  getArtifactIdentity(): {
    readonly artifactVersion: string;
    readonly artifactHash: string;
    readonly catalogReleaseVersion: string;
    readonly catalogPayloadHash: string;
    readonly datasetVersion: string;
    readonly datasetReleaseHash: string;
    readonly mappingVersion: string;
    readonly mappingHash: string;
    readonly dictionaryRevision: string;
    readonly dictionaryHash: string;
  };
  resolveCatalogVariantId(vehicleVariantId: string): RuntimeVehicleCandidateId | undefined;
  readFact(
    runtimeVehicleCandidateId: RuntimeVehicleCandidateId,
    factKey: VehicleEvidenceFactKey,
  ): VehicleEvidenceFactResolution;
}
