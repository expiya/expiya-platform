import type { EquipmentFeatureCode } from "./equipmentEvidence";

export type EquipmentDailyLifeContext = "SAFETY_SUPPORT" | "PARKING" | "URBAN" | "LONG_DISTANCE" | "FAMILY" | "WINTER" | "SUMMER" | "COMFORT" | "CONVENIENCE" | "CONNECTIVITY" | "NIGHT_DRIVING" | "OFF_ROAD";

export interface EquipmentDailyLifeEntry {
  readonly featureCode: EquipmentFeatureCode;
  readonly labelTr: string;
  readonly category: string;
  readonly usageContexts: readonly EquipmentDailyLifeContext[];
  readonly dailyLifeBenefit: string;
  readonly userFacingExplanation: string;
  readonly caveat: string;
  readonly authority: "OWNER_EDITORIAL_DRAFT" | "OWNER_EDITORIAL";
  readonly decisionUse: "EXPLANATION_ONLY";
}

export interface EquipmentDailyLifeLayer {
  readonly schemaVersion: "1.0.0";
  readonly releaseVersion: string;
  readonly compatibleCatalogRelease: "v0.55.4";
  readonly compatibleCatalogFingerprint: `sha256:${string}`;
  readonly compatibleEquipmentVocabularyVersion: "1.1.0";
  readonly sourceAuthority: "OWNER_EDITORIAL_DRAFT" | "OWNER_EDITORIAL";
  readonly runtimeAuthority: "DISABLED_PENDING_OWNER_APPROVAL_AND_EQUIPMENT_ACTIVATION" | "EXPLANATION_ONLY";
  readonly generatedAt: string;
  readonly entries: readonly EquipmentDailyLifeEntry[];
  readonly presentationPolicy: {
    readonly confirmedFactRequires: "VERIFIED_STANDARD_EXACT_VARIANT_CLEAR";
    readonly optionalWordingRequiresStockConfirmation: true;
    readonly packageWordingRequiresPackageConfirmation: true;
    readonly associationOnlyCannotConfirmPresence: true;
    readonly unknownCannotConfirmAbsence: true;
    readonly safetyGuaranteesForbidden: true;
  };
}
