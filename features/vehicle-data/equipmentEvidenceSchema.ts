import { z } from "zod";

import { EQUIPMENT_FEATURE_CODES } from "@/types/equipmentEvidence";
import type { EquipmentEvidenceLayer, EquipmentEvidenceManifest } from "@/types/equipmentEvidence";

export const equipmentFeatureCodeSchema = z.enum(EQUIPMENT_FEATURE_CODES);
export const availabilitySchema = z.enum(["STANDARD", "OPTIONAL", "PACKAGE_DEPENDENT", "NOT_AVAILABLE", "UNKNOWN"]);
export const provisionModeSchema = z.enum(["INCLUDED", "FACTORY_OPTION", "PACKAGE_OPTION", "NOT_OFFERED", "UNRESOLVED"]);
export const decisionUseSchema = z.enum(["HARD_FILTER_ELIGIBLE", "HARD_FILTER_AFTER_CONFIRMATION", "SOFT_PREFERENCE", "EXPLANATION_ONLY"]);
export const sourceAuthoritySchema = z.enum(["OFFICIAL_MANUFACTURER", "TR_DISTRIBUTOR", "OFFICIAL_BROCHURE", "OFFICIAL_CONFIGURATOR", "OFFICIAL_PRICE_EQUIPMENT_LIST"]);
const cohortPolicySchema = z.enum(["ALL_ACTIVE_VARIANTS_V1", "PASSENGER_CABIN_V1", "TAILGATE_BODY_V1", "OFF_ROAD_ARCHITECTURE_V1"]);

const featureDefinitionSchema = z.object({ featureCode: equipmentFeatureCodeSchema, category: z.enum(["ADAS", "PARKING", "OCCUPANT_SAFETY", "CABIN_COMFORT", "ACCESS", "CONNECTIVITY", "LIGHTING", "OFF_ROAD"]), defaultDecisionUse: decisionUseSchema, labelTr: z.string().min(1), cohortPolicyId: cohortPolicySchema }).strict();
const aliasSchema = z.object({ aliasId: z.string().min(1), featureCode: equipmentFeatureCodeSchema.optional(), normalizedPhrases: z.array(z.string().min(1)).min(1), ambiguityClass: z.enum(["DIRECT", "NEEDS_CONFIRMATION", "GENERIC_NOT_BINDABLE"]), defaultDecisionUse: z.enum(["SOFT_PREFERENCE", "EXPLANATION_ONLY"]) }).strict();
const sourceSchema = z.object({
  sourceId: z.string().regex(/^SRC-[0-9]+$/u), registryRelease: z.string().min(1),
  sourceType: z.enum(["OFFICIAL_WEB", "OFFICIAL_TECH_SPEC", "OFFICIAL_BROCHURE", "OFFICIAL_CONFIGURATOR", "OFFICIAL_PRICE_LIST", "OFFICIAL_EQUIPMENT_LIST"]),
  sourceAuthority: sourceAuthoritySchema, originalUrl: z.string().url(), artifactReference: z.string().min(1),
  artifactSha256: z.string().regex(/^sha256:[a-f0-9]{64}$/u), observedAt: z.string().datetime(), publishedAt: z.string().datetime().optional(), effectiveAt: z.string().datetime().optional(),
}).strict();
const locatorSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("PDF_PAGE"), pageNumber: z.number().int().positive(), section: z.string().min(1).optional(), table: z.string().min(1).optional(), row: z.string().min(1).optional(), column: z.string().min(1).optional() }).strict(),
  z.object({ kind: z.literal("HTML_SECTION"), heading: z.string().min(1).optional(), table: z.string().min(1).optional(), row: z.string().min(1).optional(), column: z.string().min(1).optional(), elementReference: z.string().min(1).optional() }).strict(),
  z.object({ kind: z.literal("CONFIGURATOR_PATH"), steps: z.array(z.string().min(1)).min(1), selectionState: z.string().min(1).optional() }).strict(),
  z.object({ kind: z.literal("STRUCTURED_RECORD"), recordPath: z.string().min(1) }).strict(),
]);
const derivedArtifactSchema = z.object({ derivedArtifactId: z.string().min(1), artifactReference: z.string().min(1), artifactSha256: z.string().regex(/^sha256:[a-f0-9]{64}$/u), parentSourceId: z.string().regex(/^SRC-[0-9]+$/u), parentArtifactReference: z.string().min(1), parentArtifactSha256: z.string().regex(/^sha256:[a-f0-9]{64}$/u), extractionPolicyId: z.string().min(1), extractionPolicyVersion: z.string().min(1), generatedAt: z.string().datetime() }).strict();
const assertionSchema = z.object({
  assertionId: z.string().min(1), featureCode: equipmentFeatureCodeSchema, exactVariantId: z.string().min(1).optional(), canonicalTrimId: z.string().min(1).optional(), canonicalPackageId: z.string().min(1).optional(),
  sourceApplicability: z.enum(["EXACT_VARIANT", "EXACT_TRIM", "MODEL_YEAR_TRIM", "MODEL_FAMILY", "UNRESOLVED"]), source: sourceSchema, locator: locatorSchema, derivedArtifact: derivedArtifactSchema.optional(), semanticMappingId: z.string().min(1).optional(), market: z.string().min(2),
  modelYearFrom: z.number().int().optional(), modelYearTo: z.number().int().optional(), packageName: z.string().min(1).optional(), evidencePolarity: z.enum(["POSITIVE", "NEGATIVE", "UNRESOLVED"]),
  negativeEvidenceReason: z.enum(["OFFICIAL_EQUIPMENT_MATRIX_EXPLICIT_ABSENCE", "OFFICIAL_CONFIGURATOR_EXPLICIT_EXCLUSION", "OFFICIAL_DOCUMENT_EXPLICIT_NOT_OFFERED"]).optional(),
  availabilityStatus: availabilitySchema, provisionMode: provisionModeSchema, verificationState: z.enum(["VERIFIED", "PROVISIONAL", "UNVERIFIED"]), confidence: z.enum(["HIGH", "MEDIUM", "LOW"]), conflictState: z.enum(["CLEAR", "CONFLICTING", "SUPERSEDED"]), supersedesAssertionId: z.string().min(1).optional(),
}).strict();
const packageLinkSchema = z.object({ linkId: z.string().min(1), exactVariantId: z.string().min(1), packageName: z.string().min(1), canonicalPackageId: z.string().min(1), market: z.literal("TR"), modelYearFrom: z.number().int(), modelYearTo: z.number().int(), mandatoryInCanonicalVariant: z.boolean(), assertionIds: z.array(z.string().min(1)).min(1), verificationState: z.enum(["VERIFIED", "PROVISIONAL"]) }).strict();
const trimLinkSchema = z.object({ linkId: z.string().min(1), exactVariantId: z.string().min(1), canonicalTrimId: z.string().min(1), market: z.literal("TR"), modelYearFrom: z.number().int(), modelYearTo: z.number().int(), assertionIds: z.array(z.string().min(1)).min(1), verificationState: z.enum(["VERIFIED", "PROVISIONAL"]), supersedesTrimLinkId: z.string().min(1).optional() }).strict();
const researchLedgerSchema = z.object({ ledgerEntryId: z.string().min(1), exactVariantId: z.string().min(1), featureCode: equipmentFeatureCodeSchema, disposition: z.enum(["NOT_RESEARCHED", "RESEARCHED_INCONCLUSIVE", "RESEARCHED_CONCLUSIVE"]), researchCycleId: z.string().min(1), updatedAt: z.string().datetime(), sourceIds: z.array(z.string().min(1)), assertionIds: z.array(z.string().min(1)), collectorRole: z.literal("EQUIPMENT_COLLECTOR_PRIMARY"), collectorInstanceId: z.string().min(1) }).strict();
const reviewEventSchema = z.object({ reviewEventId: z.string().min(1), subjectType: z.enum(["ASSERTION", "TRIM_LINK", "PACKAGE_LINK"]), subjectId: z.string().min(1), fromState: z.enum(["COLLECTED", "SECOND_REVIEW_REQUIRED", "SECOND_REVIEW_PASSED", "CONFLICT_REVIEW_REQUIRED", "OWNER_APPROVAL_REQUIRED", "APPROVED"]).optional(), toState: z.enum(["COLLECTED", "SECOND_REVIEW_REQUIRED", "SECOND_REVIEW_PASSED", "CONFLICT_REVIEW_REQUIRED", "OWNER_APPROVAL_REQUIRED", "APPROVED"]), actorRole: z.enum(["EQUIPMENT_COLLECTOR_PRIMARY", "EQUIPMENT_REVIEWER_SECONDARY", "EQUIPMENT_OWNER_APPROVER"]), actorInstanceId: z.string().min(1), reviewedAt: z.string().datetime(), reasonCode: z.string().min(1), supersedesReviewEventId: z.string().min(1).optional() }).strict();
const projectionSchema = z.object({ exactVariantId: z.string().min(1), featureCode: equipmentFeatureCodeSchema, availabilityStatus: availabilitySchema, provisionMode: provisionModeSchema, decisionUse: decisionUseSchema, assertionIds: z.array(z.string().min(1)).min(1), projectionAuthority: z.enum(["EXACT_VERIFIED", "PACKAGE_VERIFIED", "INSUFFICIENT"]), conflictState: z.enum(["CLEAR", "CONFLICTING"]) }).strict();

export const equipmentEvidenceLayerSchema = z.object({
  schemaVersion: z.literal("1.2.1"), releaseVersion: z.string().min(1), compatibleCatalogRelease: z.string().regex(/^v[0-9]+\.[0-9]+\.[0-9]+$/u), compatibleCatalogFingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/u), market: z.literal("TR"), vocabularyVersion: z.literal("1.1.0"), cohortPolicyVersion: z.literal("1.0.0"), collectionProtocolVersion: z.literal("1.0.1"), canonicalIdentityPolicyVersion: z.literal("1.0.0"),
  state: z.enum(["PILOT_EMPTY", "COLLECTING", "PILOT_VERIFIED_DATA", "READY"]), generatedAt: z.string().datetime(), featureDefinitions: z.array(featureDefinitionSchema), intentAliases: z.array(aliasSchema), assertions: z.array(assertionSchema), packageVariantLinks: z.array(packageLinkSchema), trimVariantLinks: z.array(trimLinkSchema), researchLedger: z.array(researchLedgerSchema), reviewEvents: z.array(reviewEventSchema), projections: z.array(projectionSchema),
}).strict();
export const equipmentEvidenceManifestSchema = z.object({
  releaseVersion: z.string().min(1), schemaVersion: z.literal("1.2.1"), compatibleCatalogRelease: z.string().regex(/^v[0-9]+\.[0-9]+\.[0-9]+$/u), compatibleCatalogFingerprint: z.string().regex(/^sha256:[a-f0-9]{64}$/u), payloadSha256: z.string().regex(/^sha256:[a-f0-9]{64}$/u), vocabularyVersion: z.literal("1.1.0"), cohortPolicyVersion: z.literal("1.0.0"), collectionProtocolVersion: z.literal("1.0.1"), canonicalIdentityPolicyVersion: z.literal("1.0.0"), featureCount: z.number().int().nonnegative(), aliasCount: z.number().int().nonnegative(), assertionCount: z.number().int().nonnegative(), packageLinkCount: z.number().int().nonnegative(), trimLinkCount: z.number().int().nonnegative(), researchLedgerCount: z.number().int().nonnegative(), reviewEventCount: z.number().int().nonnegative(), projectionCount: z.number().int().nonnegative(), variantCoverageCount: z.number().int().nonnegative(), validationStatus: z.literal("VALIDATED"), generatedAt: z.string().datetime(), declaredLimitations: z.array(z.string().min(1)),
}).strict();

export const parseEquipmentEvidenceLayer = (input: unknown): EquipmentEvidenceLayer => equipmentEvidenceLayerSchema.parse(input) as EquipmentEvidenceLayer;
export const parseEquipmentEvidenceManifest = (input: unknown): EquipmentEvidenceManifest => equipmentEvidenceManifestSchema.parse(input) as EquipmentEvidenceManifest;
