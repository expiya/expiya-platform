import type { GovernedProductMedia } from "@/features/media/governedProductMedia";

export type VehicleMediaScope = "VARIANT" | "GENERATION_BODY" | "MODEL_BODY" | "MODEL";
export type VehicleMediaKind = "HERO_EXTERIOR" | "EXTERIOR" | "INTERIOR" | "CARGO";
export type VehicleMediaPublicationState = "CANDIDATE" | "RIGHTS_REVIEW" | "PUBLISHED" | "REJECTED";
export type VehicleMediaUsagePermission = "OPEN_LICENSE" | "LICENSED" | "WRITTEN_PERMISSION" | "OWNER_ATTESTED" | "REMOTE_PREVIEW";

export interface VehicleMediaIdentityVerification {
  readonly status: "VERIFIED_EXACT";
  readonly method: "GOVERNED_REFERENCE_PIXEL_SIMILARITY_V1";
  readonly similarityScore: number;
  readonly threshold: 0.95;
  readonly metadataExact: true;
  readonly governedReferenceAssetId: string;
  readonly governedReferenceFileHash: `sha256:${string}`;
  readonly candidateFileHash: `sha256:${string}`;
  readonly verifiedAt: string;
}

export interface VehicleMediaOwnerAttestation {
  /** Stable identifier for the person or organization making the declaration. */
  readonly attestedBy: string;
  readonly attestedAt: string;
  readonly statement: string;
  /** Ticket, signed document, upload record, or other auditable evidence reference. */
  readonly evidenceReference: string;
  readonly permittedUses: readonly ["COMMERCIAL_DISPLAY", ...string[]];
}

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
  readonly sourceAuthority?: "OFFICIAL_MANUFACTURER_OR_DISTRIBUTOR" | "OPEN_MEDIA_REPOSITORY" | "OTHER";
  readonly usagePermission: VehicleMediaUsagePermission;
  readonly ownerAttestation?: VehicleMediaOwnerAttestation;
  readonly licenseName?: string;
  readonly licenseUrl?: string;
  readonly attributionText?: string;
  readonly publicationState: VehicleMediaPublicationState;
  readonly isPrimary: boolean;
  readonly reviewedAt: string;
  readonly fileHash?: string;
  /** Required before an open-license discovery can enter runtime resolution. */
  readonly identityVerification?: VehicleMediaIdentityVerification;
  readonly applicabilityNotes: readonly string[];
  /** New governed contract. Legacy OPEN_LICENSE records are normalized at the authority boundary. */
  readonly governance?: GovernedProductMedia;
}
