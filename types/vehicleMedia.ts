export type VehicleMediaScope = "VARIANT" | "GENERATION_BODY" | "MODEL_BODY" | "MODEL";
export type VehicleMediaKind = "HERO_EXTERIOR" | "EXTERIOR" | "INTERIOR" | "CARGO";
export type VehicleMediaPublicationState = "CANDIDATE" | "RIGHTS_REVIEW" | "PUBLISHED" | "REJECTED";
export type VehicleMediaUsagePermission = "OPEN_LICENSE" | "LICENSED" | "WRITTEN_PERMISSION";

/** A publishable media record. Candidate URLs must remain outside runtime resolution. */
export interface VehicleMediaAsset {
  readonly id: string;
  readonly market: "TR";
  readonly scope: VehicleMediaScope;
  readonly variantId?: string;
  readonly brand: string;
  readonly model: string;
  readonly generation?: string;
  readonly bodyStyle?: string;
  readonly modelYearFrom?: number;
  readonly modelYearTo?: number;
  readonly kind: VehicleMediaKind;
  readonly storagePath: string;
  readonly sourcePageUrl: string;
  readonly originalAssetUrl?: string;
  readonly rightsHolder: string;
  readonly usagePermission: VehicleMediaUsagePermission;
  readonly licenseName?: string;
  readonly licenseUrl?: string;
  readonly attributionText?: string;
  readonly publicationState: VehicleMediaPublicationState;
  readonly isPrimary: boolean;
  readonly reviewedAt: string;
  readonly fileHash?: string;
  readonly applicabilityNotes: readonly string[];
}
