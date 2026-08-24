import type { VehiclePersonaTrait } from "@/types/vehiclePersona";

export const VEHICLE_PERSONA_SAFE_TRAIT_VOCABULARY = [
  "DESIGN", "DRIVING_ENGAGEMENT", "COMFORT", "PRACTICALITY", "TECHNOLOGY", "PRESTIGE", "VALUE",
  "ADVENTURE", "FAMILY", "URBAN", "COMMERCIAL", "SUSTAINABILITY", "MINIMALISM",
] as const satisfies readonly VehiclePersonaTrait[];

export type SafePersonaMatchStatus = "MATCHED" | "AMBIGUOUS" | "UNMATCHED";
export type SafePersonaReviewStatus = "PROGRAMMATIC_DRAFT" | "OWNER_REVIEW_REQUIRED" | "OWNER_APPROVED";
export type SafeTraitDerivationReason =
  | "NEUTRAL_DESIGN_CHARACTER" | "NEUTRAL_DRIVING_CHARACTER" | "NEUTRAL_TECHNOLOGY_CHARACTER"
  | "NEUTRAL_PRESTIGE_CHARACTER" | "CANONICAL_COMMERCIAL_ARCHITECTURE"
  | "ELECTRIFIED_SUSTAINABILITY_CHARACTER" | "NEUTRAL_ADVENTURE_CHARACTER"
  | "NEUTRAL_URBAN_CHARACTER" | "NEUTRAL_MINIMALISM_CHARACTER" | "OWNER_REVIEWED_EDITORIAL_CHARACTER";

export interface SafePersonaSourceReference {
  readonly personaDatasetVersion: string;
  readonly brand: string;
  readonly seriesGroup: string;
}

export interface SafePersonaFamilyProjection {
  readonly familyId: string;
  readonly canonicalBrand: string;
  readonly canonicalModel: string;
  readonly sourceSeriesGroup: string | null;
  readonly traits: readonly VehiclePersonaTrait[];
  readonly traitDerivations?: readonly { readonly trait: VehiclePersonaTrait; readonly reasonCode: SafeTraitDerivationReason }[];
  readonly matchAuthority: "DETERMINISTIC_CATALOG_MATCH";
  readonly matchStatus: SafePersonaMatchStatus;
  readonly reviewStatus: SafePersonaReviewStatus;
  readonly ownerDecision?: "APPROVE" | "KEEP_EMPTY";
  readonly sourceReference?: SafePersonaSourceReference;
}

export interface SafePersonaVariantProjection {
  readonly exactVariantId: string;
  readonly familyId: string;
  readonly traits: readonly VehiclePersonaTrait[];
  readonly authority: "OWNER_EDITORIAL";
  readonly decisionUse: "SOFT_PREFERENCE_ONLY";
}

export interface VehiclePersonaSafeTraitRelease {
  readonly schemaVersion: "1.0.0" | "1.1.0";
  readonly releaseVersion: string;
  readonly compatibleCatalogRelease: string;
  readonly compatibleCatalogFingerprint: string;
  readonly sourcePersonaDatasetVersion: string;
  readonly sourcePersonaSchemaVersion: string;
  readonly authority: "OWNER_EDITORIAL";
  readonly decisionUse: "SOFT_PREFERENCE_ONLY";
  readonly traitVocabulary: readonly VehiclePersonaTrait[];
  readonly families: readonly SafePersonaFamilyProjection[];
  readonly variants: readonly SafePersonaVariantProjection[];
  readonly generatedAt: string;
  readonly approval?: {
    readonly authority: "PRODUCT_OWNER";
    readonly reference: string;
    readonly approvedSourceRelease: string;
    readonly approvedProposedSafeTraitsChecksum: string;
    readonly approvedAt: string;
    readonly sanitizationPolicyVersion: string;
    readonly scope: "SANITIZED_PROJECTION_ONLY";
  };
}

export interface VehiclePersonaSafeTraitManifest {
  readonly releaseVersion: string;
  readonly schemaVersion: "1.0.0" | "1.1.0";
  readonly authority: "OWNER_EDITORIAL";
  readonly decisionUse: "SOFT_PREFERENCE_ONLY";
  readonly compatibleCatalogRelease: string;
  readonly compatibleCatalogFingerprint: string;
  readonly sourcePersonaDatasetVersion: string;
  readonly sourceSafeDraftRelease?: string;
  readonly sanitizationPolicyVersion?: string;
  readonly ownerApprovalReference?: string;
  readonly approvedNonEmptyFamilyCount?: number;
  readonly keepEmptyFamilyCount?: number;
  readonly approval?: VehiclePersonaSafeTraitRelease["approval"];
  readonly familyCount: number;
  readonly variantCount: number;
  readonly matchCounts: Readonly<Record<SafePersonaMatchStatus, number>>;
  readonly emptyTraitFamilyCount: number;
  readonly emptyTraitVariantCount: number;
  readonly reviewCounts: Readonly<Record<SafePersonaReviewStatus, number>>;
  readonly traitDistribution: Readonly<Record<VehiclePersonaTrait, number>>;
  readonly payloadSha256: string;
  readonly validationStatus: "VALIDATED";
  readonly declaredLimitations: readonly string[];
}

export interface VehiclePersonaSafeTraitPointer {
  readonly state: "ACTIVE";
  readonly activeReleaseVersion: string;
  readonly compatibleCatalogRelease: string;
  readonly compatibleCatalogFingerprint: string;
  readonly payloadSha256: string;
  readonly schemaVersion: "1.0.0" | "1.1.0";
}
