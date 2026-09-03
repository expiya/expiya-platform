export const EQUIPMENT_FEATURE_CODES = [
  "AUTONOMOUS_EMERGENCY_BRAKING", "FORWARD_COLLISION_WARNING", "LANE_DEPARTURE_WARNING", "LANE_KEEP_ASSIST",
  "LANE_CENTERING_ASSIST", "ADAPTIVE_CRUISE_CONTROL", "BLIND_SPOT_MONITOR", "REAR_CROSS_TRAFFIC_ALERT",
  "TRAFFIC_SIGN_RECOGNITION", "DRIVER_ATTENTION_MONITOR", "HIGH_BEAM_ASSIST", "REAR_VIEW_CAMERA",
  "SURROUND_VIEW_CAMERA_360", "FRONT_PARKING_SENSORS", "REAR_PARKING_SENSORS", "AUTOMATIC_PARK_ASSIST",
  "ISOFIX_REAR_OUTER", "ISOFIX_FRONT_PASSENGER", "FRONT_SIDE_CURTAIN_AIRBAG_COVERAGE", "CENTER_AIRBAG",
  "REAR_SEAT_OCCUPANT_ALERT", "HEATED_FRONT_SEATS", "HEATED_REAR_SEATS", "VENTILATED_FRONT_SEATS",
  "POWER_DRIVER_SEAT", "POWER_FRONT_PASSENGER_SEAT", "DRIVER_SEAT_MEMORY", "HEATED_STEERING_WHEEL",
  "DUAL_ZONE_CLIMATE_CONTROL", "THREE_ZONE_CLIMATE_CONTROL", "FOUR_ZONE_CLIMATE_CONTROL", "KEYLESS_ENTRY",
  "KEYLESS_START", "POWER_TAILGATE", "HANDS_FREE_TAILGATE", "PANORAMIC_GLASS_ROOF", "APPLE_CARPLAY",
  "WIRELESS_APPLE_CARPLAY", "ANDROID_AUTO", "WIRELESS_ANDROID_AUTO", "WIRELESS_PHONE_CHARGING", "LED_HEADLIGHTS",
  "ADAPTIVE_HEADLIGHTS", "MATRIX_LED_HEADLIGHTS", "AUTOMATIC_HIGH_BEAM", "HILL_DESCENT_CONTROL",
  "TERRAIN_DRIVE_MODES", "LOW_RANGE_TRANSFER_CASE", "LOCKING_REAR_DIFFERENTIAL", "LOCKING_CENTER_DIFFERENTIAL",
  "CRAWL_CONTROL",
] as const;

export type EquipmentFeatureCode = typeof EQUIPMENT_FEATURE_CODES[number];
export type EquipmentAvailabilityStatus = "STANDARD" | "OPTIONAL" | "PACKAGE_DEPENDENT" | "NOT_AVAILABLE" | "UNKNOWN";
export type EquipmentProvisionMode = "INCLUDED" | "FACTORY_OPTION" | "PACKAGE_OPTION" | "NOT_OFFERED" | "UNRESOLVED";
export type EquipmentDecisionUse = "HARD_FILTER_ELIGIBLE" | "HARD_FILTER_AFTER_CONFIRMATION" | "SOFT_PREFERENCE" | "EXPLANATION_ONLY";
export type EquipmentSourceApplicability = "EXACT_VARIANT" | "EXACT_TRIM" | "MODEL_YEAR_TRIM" | "MODEL_FAMILY" | "UNRESOLVED";
export type EquipmentSourceAuthority = "OFFICIAL_MANUFACTURER" | "TR_DISTRIBUTOR" | "OFFICIAL_BROCHURE" | "OFFICIAL_CONFIGURATOR" | "OFFICIAL_PRICE_EQUIPMENT_LIST" | "OFFICIAL_OWNER_MANUAL" | "OFFICIAL_VIN_DOCUMENT";
export type EquipmentVerificationState = "VERIFIED" | "PROVISIONAL" | "UNVERIFIED";
export type EquipmentConfidence = "HIGH" | "MEDIUM" | "LOW";
export type EquipmentConflictState = "CLEAR" | "CONFLICTING" | "SUPERSEDED";
export type EquipmentNegativeEvidenceReason = "OFFICIAL_EQUIPMENT_MATRIX_EXPLICIT_ABSENCE" | "OFFICIAL_CONFIGURATOR_EXPLICIT_EXCLUSION" | "OFFICIAL_DOCUMENT_EXPLICIT_NOT_OFFERED";
export type EquipmentCohortPolicyId = "ALL_ACTIVE_VARIANTS_V1" | "PASSENGER_CABIN_V1" | "TAILGATE_BODY_V1" | "OFF_ROAD_ARCHITECTURE_V1";
export type EquipmentResearchDisposition = "NOT_RESEARCHED" | "RESEARCHED_INCONCLUSIVE" | "RESEARCHED_CONCLUSIVE";
export type EquipmentReviewState = "COLLECTED" | "SECOND_REVIEW_REQUIRED" | "SECOND_REVIEW_PASSED" | "CONFLICT_REVIEW_REQUIRED" | "OWNER_APPROVAL_REQUIRED" | "APPROVED";
export type EquipmentOperationalRole = "EQUIPMENT_COLLECTOR_PRIMARY" | "EQUIPMENT_REVIEWER_SECONDARY" | "EQUIPMENT_OWNER_APPROVER";
export type EquipmentPilotLifecycleState = "PREPARED" | "COLLECTING" | "REVIEWING" | "COMPLETED" | "SUPERSEDED_BEFORE_COLLECTION" | "SUPERSEDED_BY_CATALOG_PATCH" | "ABORTED";
export type EquipmentEvidenceLocator =
  | { readonly kind: "PDF_PAGE"; readonly pageNumber: number; readonly section?: string; readonly table?: string; readonly row?: string; readonly column?: string }
  | { readonly kind: "HTML_SECTION"; readonly heading?: string; readonly table?: string; readonly row?: string; readonly column?: string; readonly elementReference?: string }
  | { readonly kind: "CONFIGURATOR_PATH"; readonly steps: readonly string[]; readonly selectionState?: string }
  | { readonly kind: "STRUCTURED_RECORD"; readonly recordPath: string };

export interface EquipmentDerivedArtifactProvenance {
  readonly derivedArtifactId: string;
  readonly artifactReference: string;
  readonly artifactSha256: `sha256:${string}`;
  readonly parentSourceId: string;
  readonly parentArtifactReference: string;
  readonly parentArtifactSha256: `sha256:${string}`;
  readonly extractionPolicyId: string;
  readonly extractionPolicyVersion: string;
  readonly generatedAt: string;
}

export interface EquipmentFeatureDefinition {
  readonly featureCode: EquipmentFeatureCode;
  readonly category: "ADAS" | "PARKING" | "OCCUPANT_SAFETY" | "CABIN_COMFORT" | "ACCESS" | "CONNECTIVITY" | "LIGHTING" | "OFF_ROAD" | "CARGO" | "TOWING" | "CAPACITY" | "CHARGING" | "MAINTENANCE" | "WHEELS_TYRES";
  readonly defaultDecisionUse: EquipmentDecisionUse;
  readonly labelTr: string;
  readonly cohortPolicyId: EquipmentCohortPolicyId;
}

export interface EquipmentIntentAlias {
  readonly aliasId: string;
  readonly featureCode?: EquipmentFeatureCode;
  readonly normalizedPhrases: readonly string[];
  readonly ambiguityClass: "DIRECT" | "NEEDS_CONFIRMATION" | "GENERIC_NOT_BINDABLE";
  readonly defaultDecisionUse: "SOFT_PREFERENCE" | "EXPLANATION_ONLY";
}

export interface EquipmentEvidenceAssertion {
  readonly assertionId: string;
  readonly featureCode: EquipmentFeatureCode;
  readonly exactVariantId?: string;
  readonly canonicalTrimId?: string;
  readonly canonicalPackageId?: string;
  readonly sourceApplicability: EquipmentSourceApplicability;
  readonly source: EquipmentSourceProvenance;
  readonly locator: EquipmentEvidenceLocator;
  readonly derivedArtifact?: EquipmentDerivedArtifactProvenance;
  readonly semanticMappingId?: string;
  readonly market: string;
  readonly modelYearFrom?: number;
  readonly modelYearTo?: number;
  readonly packageName?: string;
  readonly evidencePolarity: "POSITIVE" | "NEGATIVE" | "UNRESOLVED";
  readonly negativeEvidenceReason?: EquipmentNegativeEvidenceReason;
  readonly availabilityStatus: EquipmentAvailabilityStatus;
  readonly provisionMode: EquipmentProvisionMode;
  readonly verificationState: EquipmentVerificationState;
  readonly confidence: EquipmentConfidence;
  readonly conflictState: EquipmentConflictState;
  readonly supersedesAssertionId?: string;
}

export interface EquipmentPackageVariantLink {
  readonly linkId: string;
  readonly exactVariantId: string;
  readonly packageName: string;
  readonly canonicalPackageId: string;
  readonly market: "TR";
  readonly modelYearFrom: number;
  readonly modelYearTo: number;
  readonly mandatoryInCanonicalVariant: boolean;
  readonly assertionIds: readonly string[];
  readonly verificationState: "VERIFIED" | "PROVISIONAL";
}

export interface EquipmentTrimVariantLink {
  readonly linkId: string; readonly exactVariantId: string; readonly canonicalTrimId: string; readonly market: "TR";
  readonly modelYearFrom: number; readonly modelYearTo: number; readonly assertionIds: readonly string[]; readonly verificationState: "VERIFIED" | "PROVISIONAL";
  readonly supersedesTrimLinkId?: string;
}

export interface EquipmentResearchLedgerEntry {
  readonly ledgerEntryId: string; readonly exactVariantId: string; readonly featureCode: EquipmentFeatureCode;
  readonly disposition: EquipmentResearchDisposition; readonly researchCycleId: string; readonly updatedAt: string;
  readonly sourceIds: readonly string[]; readonly assertionIds: readonly string[]; readonly collectorRole: "EQUIPMENT_COLLECTOR_PRIMARY"; readonly collectorInstanceId: string;
}
export interface EquipmentReviewEvent {
  readonly reviewEventId: string; readonly subjectType: "ASSERTION" | "TRIM_LINK" | "PACKAGE_LINK"; readonly subjectId: string;
  readonly fromState?: EquipmentReviewState; readonly toState: EquipmentReviewState; readonly actorRole: EquipmentOperationalRole; readonly actorInstanceId: string;
  readonly reviewedAt: string; readonly reasonCode: string; readonly supersedesReviewEventId?: string;
}

export interface EquipmentPilotVariant {
  readonly exactVariantId: string; readonly canonicalBrand: string; readonly canonicalModel: string; readonly trim: string;
  readonly modelYear: number; readonly bodyStyle: string; readonly vehicleUseClass: string; readonly fuelType: string;
  readonly priceSegment: "MAINSTREAM" | "MID" | "HIGH" | "UNSEGMENTED"; readonly selectionReason: string; readonly testAxes: readonly string[];
  readonly pairedFamilyId?: string; readonly pairedExactVariantId?: string; readonly pairedDifferenceReason?: string; readonly expectedProjectionBoundary?: string;
}
export interface EquipmentPilotManifest {
  readonly pilotId: string; readonly manifestVersion: string; readonly selectionPolicyVersion: "1.0.1"; readonly lifecycleState: EquipmentPilotLifecycleState;
  readonly supersedesPilotId: string; readonly catalogRelease: `v${number}.${number}.${number}`; readonly catalogFingerprint: `sha256:${string}`;
  readonly generatedAt: string; readonly researchStartedAt: null; readonly completedAt: null; readonly immutableSelection: true;
  readonly variants: readonly EquipmentPilotVariant[];
}
export interface EquipmentPilotMatrixRow {
  readonly exactVariantId: string; readonly featureCode: EquipmentFeatureCode; readonly disposition: "NOT_RESEARCHED";
}

export interface EquipmentSourceProvenance {
  readonly sourceId: string; readonly registryRelease: string; readonly sourceType: "OFFICIAL_WEB" | "OFFICIAL_TECH_SPEC" | "OFFICIAL_BROCHURE" | "OFFICIAL_CONFIGURATOR" | "OFFICIAL_PRICE_LIST" | "OFFICIAL_EQUIPMENT_LIST" | "OFFICIAL_OWNER_MANUAL" | "OFFICIAL_INFOTAINMENT_MANUAL" | "OFFICIAL_QUICK_REFERENCE_GUIDE" | "OFFICIAL_VIN_DOCUMENT" | "OFFICIAL_SERVICE_SCHEDULE";
  readonly sourceAuthority: EquipmentSourceAuthority; readonly originalUrl: string; readonly artifactReference: string;
  readonly artifactSha256: `sha256:${string}`; readonly observedAt: string; readonly publishedAt?: string; readonly effectiveAt?: string;
}

export interface ExactVariantEquipmentProjection {
  readonly exactVariantId: string;
  readonly featureCode: EquipmentFeatureCode;
  readonly availabilityStatus: EquipmentAvailabilityStatus;
  readonly provisionMode: EquipmentProvisionMode;
  readonly decisionUse: EquipmentDecisionUse;
  readonly assertionIds: readonly string[];
  readonly projectionAuthority: "EXACT_VERIFIED" | "PACKAGE_VERIFIED" | "INSUFFICIENT";
  readonly conflictState: "CLEAR" | "CONFLICTING";
}

export interface EquipmentEvidenceLayer {
  readonly schemaVersion: "1.2.1";
  readonly releaseVersion: string;
  readonly compatibleCatalogRelease: `v${number}.${number}.${number}`;
  readonly compatibleCatalogFingerprint: `sha256:${string}`;
  readonly market: "TR";
  readonly vocabularyVersion: "1.1.0";
  readonly cohortPolicyVersion: "1.0.0";
  readonly collectionProtocolVersion: "1.0.1";
  readonly canonicalIdentityPolicyVersion: "1.0.0";
  readonly state: "PILOT_EMPTY" | "COLLECTING" | "PILOT_VERIFIED_DATA" | "READY";
  readonly generatedAt: string;
  readonly featureDefinitions: readonly EquipmentFeatureDefinition[];
  readonly intentAliases: readonly EquipmentIntentAlias[];
  readonly assertions: readonly EquipmentEvidenceAssertion[];
  readonly packageVariantLinks: readonly EquipmentPackageVariantLink[];
  readonly trimVariantLinks: readonly EquipmentTrimVariantLink[];
  readonly researchLedger: readonly EquipmentResearchLedgerEntry[];
  readonly reviewEvents: readonly EquipmentReviewEvent[];
  readonly projections: readonly ExactVariantEquipmentProjection[];
}

export interface EquipmentOwnerApprovalEvent {
  readonly approvalEventId: string;
  readonly action: "APPROVE" | "REVOKE";
  readonly subjectType: "ASSERTION" | "TRIM_LINK";
  readonly subjectId: string;
  readonly passedSecondReviewEventId: string;
  readonly actorRole: "EQUIPMENT_OWNER_APPROVER";
  readonly actorInstanceId: string;
  readonly occurredAt: string;
  readonly reasonCode: string;
  readonly policyVersion: string;
  readonly inputFingerprint: `sha256:${string}`;
}

export interface EquipmentVerificationMaterialization {
  readonly materializationId: string;
  readonly sourceAssertionId: string;
  readonly exactVariantId: string;
  readonly featureCode: EquipmentFeatureCode;
  readonly terminalSupersessionChain: readonly string[];
  readonly passedSecondReviewEventId: string;
  readonly ownerApprovalEventId: string;
  readonly availabilityStatus: EquipmentAvailabilityStatus;
  readonly standardOrOptional: "STANDARD" | "OPTIONAL" | "PACKAGE_DEPENDENT" | "NOT_AVAILABLE";
  readonly marketApplicability: "TR";
  readonly modelYearApplicability: { readonly from: number; readonly to: number };
  readonly source: EquipmentSourceProvenance;
  readonly derivedArtifact?: EquipmentDerivedArtifactProvenance;
  readonly confidence: EquipmentConfidence;
  readonly verificationState: "VERIFIED";
  readonly materializedAt: string;
  readonly policyVersion: string;
  readonly catalogRelease: "v0.55.2";
  readonly catalogFingerprint: `sha256:${string}`;
}

export interface EquipmentVerifiedTrimLinkMaterialization {
  readonly materializationId: string;
  readonly sourceTrimLinkId: string;
  readonly exactVariantId: string;
  readonly canonicalTrimId: string;
  readonly terminalSupersessionChain: readonly string[];
  readonly passedSecondReviewEventId: string;
  readonly ownerApprovalEventId: string;
  readonly marketApplicability: "TR";
  readonly modelYearApplicability: { readonly from: number; readonly to: number };
  readonly verificationState: "VERIFIED";
  readonly materializedAt: string;
  readonly policyVersion: string;
  readonly catalogRelease: "v0.55.2";
  readonly catalogFingerprint: `sha256:${string}`;
}

export type EquipmentAssociationObservationType = "LISTED_FOR_EXACT_TRIM";
export type EquipmentAssociationProvisionKnowledge = "PROVISION_UNRESOLVED";
export type EquipmentAssociationDecisionUse = "EVIDENCE_ONLY" | "CONFIRMATION_REQUIRED";

export interface EquipmentAssociationObservation {
  readonly observationId: string;
  readonly observationType: EquipmentAssociationObservationType;
  readonly exactVariantId: string;
  readonly featureCode: EquipmentFeatureCode;
  readonly provisionKnowledge: EquipmentAssociationProvisionKnowledge;
  readonly sourceId: string;
  readonly sourceRowId: string;
  readonly supportingSourceRowIds: readonly string[];
  readonly semanticMappingId: string;
  readonly semanticMappingIds: readonly string[];
  readonly marketApplicability: "TR";
  readonly modelYearApplicability: readonly number[];
  readonly trimApplicability: string;
  readonly powertrainApplicability: string;
  readonly verificationState: "PROVISIONAL";
  readonly reviewState: "SECOND_REVIEW_REQUIRED";
  readonly decisionUse: EquipmentAssociationDecisionUse;
  readonly confidence: "MEDIUM" | "LOW";
  readonly conflictState: "CLEAR" | "CONFLICTING" | "SUPERSEDED";
  readonly collectorActorId: string;
  readonly contentFingerprint: `sha256:${string}`;
  readonly createdAt: string;
}

export interface EquipmentAssociationOwnerApprovalEvent {
  readonly eventId: string;
  readonly eventType: "OWNER_APPROVAL_GRANTED";
  readonly actorId: string;
  readonly actorRole: "EQUIPMENT_OWNER_APPROVER";
  readonly subjectType: "ASSOCIATION_OBSERVATION" | "TRIM_LINK";
  readonly subjectId: string;
  readonly exactVariantId: string;
  readonly sourceIndependentReviewEventId: string;
  readonly sourceContentFingerprint: `sha256:${string}`;
  readonly approvalManifestId: string;
  readonly approvalManifestChecksum: `sha256:${string}`;
  readonly approvalAttestationId: string;
  readonly governancePolicyVersion: string;
  readonly decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED";
  readonly createdAt: string;
}

export interface ReviewedEquipmentAssociationMaterialization {
  readonly materializationId: string;
  readonly materializationType: "REVIEWED_EQUIPMENT_ASSOCIATION";
  readonly sourceObservationId: string;
  readonly sourceObservationFingerprint: `sha256:${string}`;
  readonly exactVariantId: string;
  readonly featureCode: EquipmentFeatureCode;
  readonly observationType: "LISTED_FOR_EXACT_TRIM";
  readonly provisionKnowledge: "PROVISION_UNRESOLVED";
  readonly decisionUse: "CONFIRMATION_REQUIRED";
  readonly sourceId: string;
  readonly sourceRowId: string;
  readonly semanticMappingId: string;
  readonly trimApplicability: string;
  readonly powertrainApplicability: string;
  readonly marketApplicability: "TR";
  readonly modelYearApplicability: readonly number[];
  readonly correctionTransitionId: string;
  readonly historicalConflictAssertionId: string;
  readonly independentReviewEventId: string;
  readonly ownerApprovalEventId: string;
  readonly approvalManifestId: string;
  readonly approvalManifestChecksum: `sha256:${string}`;
  readonly materializationState: "REVIEWED";
  readonly catalogRelease: "v0.55.2";
  readonly catalogFingerprint: `sha256:${string}`;
  readonly policyVersion: string;
  readonly materializedAt: string;
  readonly decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED";
}

export interface ReviewedEquipmentTrimLinkMaterialization {
  readonly materializationId: string;
  readonly materializationType: "VERIFIED_TRIM_LINK";
  readonly sourceTrimLinkId: string;
  readonly exactVariantId: string;
  readonly canonicalTrimId: string;
  readonly officialTrimName: string;
  readonly powertrain: string;
  readonly transmission: string;
  readonly marketApplicability: "TR";
  readonly modelYearApplicability: readonly number[];
  readonly identitySourceIds: readonly string[];
  readonly independentReviewEventId: string;
  readonly ownerApprovalEventId: string;
  readonly approvalManifestId: string;
  readonly approvalManifestChecksum: `sha256:${string}`;
  readonly contentFingerprint: `sha256:${string}`;
  readonly materializationState: "VERIFIED";
  readonly catalogRelease: "v0.55.2";
  readonly catalogFingerprint: `sha256:${string}`;
  readonly policyVersion: string;
  readonly materializedAt: string;
  readonly decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED";
}

export interface EquipmentEvidenceManifest {
  readonly releaseVersion: string;
  readonly schemaVersion: "1.2.1";
  readonly compatibleCatalogRelease: `v${number}.${number}.${number}`;
  readonly compatibleCatalogFingerprint: `sha256:${string}`;
  readonly payloadSha256: `sha256:${string}`;
  readonly vocabularyVersion: "1.1.0";
  readonly cohortPolicyVersion: "1.0.0";
  readonly collectionProtocolVersion: "1.0.1";
  readonly canonicalIdentityPolicyVersion: "1.0.0";
  readonly featureCount: number;
  readonly aliasCount: number;
  readonly assertionCount: number;
  readonly packageLinkCount: number;
  readonly trimLinkCount: number;
  readonly researchLedgerCount: number;
  readonly reviewEventCount: number;
  readonly projectionCount: number;
  readonly variantCoverageCount: number;
  readonly validationStatus: "VALIDATED";
  readonly generatedAt: string;
  readonly declaredLimitations: readonly string[];
}

export interface EquipmentFeatureCoverage {
  readonly featureCode: EquipmentFeatureCode; readonly cohortPolicyId: EquipmentCohortPolicyId; readonly eligibleVariantCount: number;
  readonly notResearchedCount: number; readonly researchedInconclusiveCount: number; readonly researchedConclusiveCount: number;
  readonly explicitStatusCount: number; readonly standardCount: number; readonly optionalCount: number; readonly packageDependentCount: number;
  readonly notAvailableCount: number; readonly unknownCount: number; readonly conflictingCount: number; readonly featureCoverageRate: number;
}

export interface EquipmentIntentMatch {
  readonly aliasId: string; readonly featureCode?: EquipmentFeatureCode; readonly ambiguityClass: EquipmentIntentAlias["ambiguityClass"];
  readonly polarity: "AFFIRMED" | "NEGATED" | "UNCERTAIN"; readonly requiresConfirmation: boolean; readonly matchedPhrase: string;
}

export type EquipmentRequirementActivation = "NOT_REQUESTED" | "SOFT_PREFERENCE" | "HARD_REQUIREMENT";
export type EquipmentCandidateEffect = "NO_EFFECT" | "SOFT_SIGNAL" | "HARD_PASS" | "HARD_FAIL";
