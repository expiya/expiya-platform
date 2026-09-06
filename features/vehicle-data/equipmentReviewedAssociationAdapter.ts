import { createHash } from "node:crypto";

import { z } from "zod";

import { EQUIPMENT_FEATURE_CODES } from "@/types/equipmentEvidence";
import type { EquipmentFeatureCode, ReviewedEquipmentAssociationMaterialization } from "@/types/equipmentEvidence";
import { validateReviewedAssociationMaterialization } from "./equipmentReviewedAssociationRelease";

const digestSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/u);
const releaseSchema = z.string().regex(/^v[0-9]+\.[0-9]+\.[0-9]+$/u);
const identifierSchema = z.string().min(1);
const featureCodeSchema = z.enum(EQUIPMENT_FEATURE_CODES);
const availabilitySchema = z.enum(["STANDARD", "OPTIONAL", "PACKAGE_DEPENDENT", "NOT_AVAILABLE"]);
const provisionModeSchema = z.enum(["INCLUDED", "FACTORY_OPTION", "PACKAGE_OPTION", "NOT_OFFERED"]);
const decisionAuthoritySchema = z.literal("SHADOW_AND_EXPLANATION_DISABLED");
const compactSchemaVersionSchema = z.enum(["1.1.0-rc", "1.2.0-rc", "1.3.0"]);
const modelYearApplicabilitySchema = z.union([
  z.object({ from: z.number().int(), to: z.number().int() }).strict(),
  z.array(z.number().int()).min(1),
]);
const sourceReferenceSchema = z.object({ sourceId: identifierSchema, artifactSha256: digestSchema }).passthrough();
const rawSourceReferenceSchema = z.object({ sourceId: identifierSchema, artifactReference: identifierSchema, artifactSha256: digestSchema }).strict();
const locatorSchema = z.object({ kind: z.literal("PDF_PAGE"), pageNumber: z.number().int().positive(), row: identifierSchema.optional(), column: identifierSchema.optional() }).passthrough();

const featureDefinitionSchema = z.object({
  featureCode: featureCodeSchema,
  category: z.enum(["ADAS", "PARKING", "OCCUPANT_SAFETY", "CABIN_COMFORT", "ACCESS", "CONNECTIVITY", "LIGHTING", "OFF_ROAD"]),
  defaultDecisionUse: z.enum(["HARD_FILTER_ELIGIBLE", "HARD_FILTER_AFTER_CONFIRMATION", "SOFT_PREFERENCE", "EXPLANATION_ONLY"]),
  labelTr: identifierSchema,
  cohortPolicyId: z.enum(["ALL_ACTIVE_VARIANTS_V1", "PASSENGER_CABIN_V1", "TAILGATE_BODY_V1", "OFF_ROAD_ARCHITECTURE_V1"]),
}).strict();
const aliasSchema = z.object({
  aliasId: identifierSchema,
  featureCode: featureCodeSchema.optional(),
  normalizedPhrases: z.array(identifierSchema).min(1),
  ambiguityClass: z.enum(["DIRECT", "NEEDS_CONFIRMATION", "GENERIC_NOT_BINDABLE"]),
  defaultDecisionUse: z.enum(["SOFT_PREFERENCE", "EXPLANATION_ONLY"]),
}).strict();

const verifiedAssertionSchema = z.object({
  materializationId: identifierSchema,
  materializationType: z.literal("VERIFIED_EQUIPMENT_ASSERTION"),
  sourceAssertionId: identifierSchema,
  exactVariantId: identifierSchema,
  featureCode: featureCodeSchema,
  availabilityStatus: availabilitySchema,
  standardOrOptional: availabilitySchema,
  provisionMode: provisionModeSchema.optional(),
  marketApplicability: z.literal("TR"),
  modelYearApplicability: modelYearApplicabilitySchema,
  verificationState: z.literal("VERIFIED"),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
  decisionAuthority: decisionAuthoritySchema,
  catalogRelease: releaseSchema,
  catalogFingerprint: digestSchema,
  terminalSupersessionChain: z.array(identifierSchema).min(1),
  ownerApprovalEventId: identifierSchema,
  approvalManifestId: identifierSchema,
  approvalManifestChecksum: digestSchema,
  policyVersion: identifierSchema,
  materializedAt: z.string().datetime({ offset: true }),
  rawSourceReferences: z.array(rawSourceReferenceSchema).min(1).optional(),
  sourceReferences: z.array(sourceReferenceSchema).min(1).optional(),
  derivedArtifactReferences: z.array(z.object({ artifactReference: identifierSchema, artifactSha256: digestSchema }).passthrough()).optional(),
  semanticMappingId: identifierSchema.nullish(),
  semanticMappingIds: z.array(identifierSchema).min(1).optional(),
  secondReviewEventId: identifierSchema.optional(),
  independentReviewEventId: identifierSchema.optional(),
  sourceAssertionFingerprint: digestSchema.optional(),
  contentFingerprint: digestSchema.optional(),
  fingerprintPolicy: z.object({ policyId: identifierSchema, version: identifierSchema }).strict().optional(),
  locator: locatorSchema.optional(),
  legend: z.record(z.string(), z.unknown()).optional(),
  sourceRowIds: z.array(identifierSchema).min(1).optional(),
  trimApplicability: identifierSchema.optional(),
  powertrainApplicability: identifierSchema.optional(),
  conflictState: z.enum(["CLEAR", "CONFLICTING", "SUPERSEDED"]).optional(),
  predecessorAssertionId: identifierSchema.optional(),
}).strict().superRefine((row, context) => {
  if (!row.rawSourceReferences?.length && !row.sourceReferences?.length) context.addIssue({ code: "custom", message: "ASSERTION_SOURCE_PROVENANCE_MISSING" });
  if (!row.secondReviewEventId && !row.independentReviewEventId) context.addIssue({ code: "custom", message: "ASSERTION_SECOND_REVIEW_MISSING" });
  if (!row.terminalSupersessionChain.includes(row.sourceAssertionId)) context.addIssue({ code: "custom", message: "ASSERTION_TERMINAL_CHAIN_INVALID" });
  if (row.standardOrOptional !== row.availabilityStatus) context.addIssue({ code: "custom", message: "ASSERTION_AVAILABILITY_LOSS" });
  const expectedProvision = { STANDARD: "INCLUDED", OPTIONAL: "FACTORY_OPTION", PACKAGE_DEPENDENT: "PACKAGE_OPTION", NOT_AVAILABLE: "NOT_OFFERED" }[row.availabilityStatus];
  if (row.provisionMode && row.provisionMode !== expectedProvision) context.addIssue({ code: "custom", message: "ASSERTION_PROVISION_MISMATCH" });
});

const reviewedAssociationSchema = z.object({
  materializationId: identifierSchema,
  materializationType: z.literal("REVIEWED_EQUIPMENT_ASSOCIATION"),
  sourceObservationId: identifierSchema,
  sourceObservationFingerprint: digestSchema,
  exactVariantId: identifierSchema,
  featureCode: featureCodeSchema,
  observationType: z.literal("LISTED_FOR_EXACT_TRIM"),
  provisionKnowledge: z.literal("PROVISION_UNRESOLVED"),
  decisionUse: z.literal("CONFIRMATION_REQUIRED"),
  sourceId: identifierSchema,
  sourceRowId: identifierSchema,
  semanticMappingId: identifierSchema,
  trimApplicability: identifierSchema,
  powertrainApplicability: identifierSchema,
  marketApplicability: z.literal("TR"),
  modelYearApplicability: z.array(z.number().int()).min(1),
  correctionTransitionId: identifierSchema,
  historicalConflictAssertionId: identifierSchema,
  independentReviewEventId: identifierSchema,
  ownerApprovalEventId: identifierSchema,
  approvalManifestId: identifierSchema,
  approvalManifestChecksum: digestSchema,
  materializationState: z.literal("REVIEWED"),
  catalogRelease: releaseSchema,
  catalogFingerprint: digestSchema,
  policyVersion: identifierSchema,
  materializedAt: z.string().datetime({ offset: true }),
  decisionAuthority: decisionAuthoritySchema,
}).strict();

const verifiedTrimLinkSchema = z.object({
  materializationId: identifierSchema,
  materializationType: z.enum(["VERIFIED_EQUIPMENT_TRIM_LINK", "VERIFIED_TRIM_LINK"]),
  sourceTrimLinkId: identifierSchema,
  exactVariantId: identifierSchema,
  canonicalTrimId: identifierSchema,
  marketApplicability: z.literal("TR"),
  modelYearApplicability: modelYearApplicabilitySchema,
  ownerApprovalEventId: identifierSchema,
  approvalManifestId: identifierSchema,
  approvalManifestChecksum: digestSchema,
  catalogRelease: releaseSchema,
  catalogFingerprint: digestSchema,
  policyVersion: identifierSchema,
  materializedAt: z.string().datetime({ offset: true }),
  decisionAuthority: decisionAuthoritySchema,
  assertionMaterializationIds: z.array(identifierSchema).min(1).optional(),
  sourceIds: z.array(identifierSchema).min(1).optional(),
  identitySourceIds: z.array(identifierSchema).min(1).optional(),
  identitySources: z.array(sourceReferenceSchema).min(1).optional(),
  terminalSupersessionChain: z.array(identifierSchema).min(1).optional(),
  verificationState: z.literal("VERIFIED").optional(),
  materializationState: z.literal("VERIFIED").optional(),
  sourceTrimLinkFingerprint: digestSchema.optional(),
  contentFingerprint: digestSchema.optional(),
  secondReviewEventId: identifierSchema.optional(),
  independentReviewEventId: identifierSchema.optional(),
  officialTrimName: identifierSchema.optional(),
  canonicalModel: identifierSchema.optional(),
  canonicalTrim: identifierSchema.optional(),
  powertrain: identifierSchema.optional(),
  transmission: identifierSchema.optional(),
  predecessorTrimLinkId: identifierSchema.optional(),
  locators: z.array(locatorSchema).min(1).optional(),
  fingerprintPolicy: z.object({ policyId: identifierSchema, version: identifierSchema }).strict().optional(),
}).strict().superRefine((row, context) => {
  if (!row.sourceIds?.length && !row.identitySourceIds?.length && !row.identitySources?.length) context.addIssue({ code: "custom", message: "TRIM_LINK_SOURCE_PROVENANCE_MISSING" });
  if (row.terminalSupersessionChain && !row.terminalSupersessionChain.includes(row.sourceTrimLinkId)) context.addIssue({ code: "custom", message: "TRIM_LINK_TERMINAL_CHAIN_INVALID" });
});

const projectionSchema = z.object({
  assertionMaterializationId: identifierSchema,
  exactVariantId: identifierSchema,
  featureCode: featureCodeSchema,
  availabilityStatus: availabilitySchema,
  standardOrOptional: availabilitySchema.optional(),
  provisionMode: provisionModeSchema.optional(),
  projectionType: z.literal("EXACT_VARIANT_VERIFIED"),
  trimLinkMaterializationId: identifierSchema.optional(),
  familyInheritance: z.literal(false),
  crossPowertrainPropagation: z.literal(false),
  evidenceReinterpretation: z.literal(false),
  decisionAuthority: decisionAuthoritySchema,
}).strict();

const coverageTierSchema = z.object({ exactVariantCount: z.number().int().nonnegative(), exactVariantIds: z.array(identifierSchema).optional() }).strict();
const coverageSchema = z.object({
  catalogVariantCount: z.number().int().nonnegative(),
  compatibleCatalogSnapshotSha256: digestSchema.optional(),
  coverageDerivation: identifierSchema.optional(),
  authorityTiersAreDistinct: z.literal(true).optional(),
  verifiedAssertionCoverage: coverageTierSchema,
  reviewedAssociationCoverage: coverageTierSchema.optional(),
  reviewedAssociationOnlyCoverage: coverageTierSchema.optional(),
  uncoveredCoverage: coverageTierSchema,
  coveredUniqueExactVariantCount: z.number().int().nonnegative().optional(),
  syntheticUnknownAssertionCount: z.literal(0).optional(),
}).strict();

const decisionControlsSchema = z.object({
  hardFilter: z.literal(false),
  hardFilterAfterConfirmation: z.literal(false),
  softRanking: z.literal(false),
  questionGeneration: z.literal(false),
  userFacingExplanation: z.literal(false),
  candidateResurrection: z.literal("FORBIDDEN"),
  candidateElimination: z.literal("FORBIDDEN"),
  offerOrderingImpact: z.literal("NONE"),
  cardImpact: z.literal("NONE").optional(),
}).strict();

const compactCandidateSchema = z.object({
  schemaVersion: compactSchemaVersionSchema,
  releaseCandidateId: identifierSchema,
  releaseVersion: identifierSchema.optional(),
  state: z.enum(["PILOT_REVIEWED_EVIDENCE", "PILOT_VERIFIED_DATA"]),
  generatedAt: z.string().datetime({ offset: true }),
  compatibleCatalogRelease: releaseSchema,
  compatibleCatalogFingerprint: digestSchema,
  canonicalSerializationVersion: z.literal("CANONICAL_JSON_SORTED_KEYS_V1"),
  decisionAuthority: decisionAuthoritySchema,
  decisionControls: decisionControlsSchema,
  featureDefinitions: z.array(featureDefinitionSchema),
  intentAliases: z.array(aliasSchema),
  verifiedAssertions: z.array(verifiedAssertionSchema),
  reviewedAssociations: z.array(reviewedAssociationSchema),
  verifiedTrimLinks: z.array(verifiedTrimLinkSchema),
  projections: z.array(projectionSchema),
  coverage: coverageSchema,
  provenance: z.record(z.string(), z.unknown()),
}).strict();

const compactManifestSchema = z.object({
  schemaVersion: compactSchemaVersionSchema,
  releaseVersion: identifierSchema,
  compatibleCatalogRelease: releaseSchema,
  compatibleCatalogFingerprint: digestSchema,
  payloadSha256: digestSchema,
  verifiedAssertionCount: z.number().int().nonnegative(),
  reviewedAssociationCount: z.number().int().nonnegative(),
  verifiedTrimLinkCount: z.number().int().nonnegative().optional(),
  projectionCount: z.number().int().nonnegative(),
  decisionAuthority: decisionAuthoritySchema,
  activationPerformed: z.literal(false).optional(),
  generatedAt: z.string().datetime({ offset: true }),
}).passthrough();

export type CompactVerifiedEquipmentAssertion = z.infer<typeof verifiedAssertionSchema>;
export type CompactVerifiedEquipmentTrimLink = z.infer<typeof verifiedTrimLinkSchema>;
export type CompactEquipmentProjection = z.infer<typeof projectionSchema>;
export type EquipmentReviewedAssociationCandidate = z.infer<typeof compactCandidateSchema>;
export type EquipmentReviewedAssociationManifest = z.infer<typeof compactManifestSchema>;
export interface CompactEquipmentCompatibilityIssue { readonly code: string; readonly reference?: string }

const uniqueIssues = (issues: readonly CompactEquipmentCompatibilityIssue[]) => [...new Map(issues.map((issue) => [`${issue.code}:${issue.reference ?? ""}`, issue])).values()];
const duplicateIssues = (rows: readonly Record<string, unknown>[], key: string, code: string): CompactEquipmentCompatibilityIssue[] => {
  const seen = new Set<unknown>();
  return rows.flatMap((row) => {
    const value = row[key];
    if (seen.has(value)) return [{ code, reference: String(value) }];
    seen.add(value);
    return [];
  });
};

export function parseEquipmentReviewedAssociationCandidate(input: unknown): EquipmentReviewedAssociationCandidate {
  const candidate = compactCandidateSchema.parse(input);
  const issues = candidate.reviewedAssociations.flatMap((item) => validateReviewedAssociationMaterialization(item as ReviewedEquipmentAssociationMaterialization));
  if (issues.length) throw new Error([...new Set(issues)].sort().join(","));
  return candidate;
}

export const parseEquipmentReviewedAssociationManifest = (input: unknown): EquipmentReviewedAssociationManifest => compactManifestSchema.parse(input);

export const compactEquipmentEvidenceSha256 = (raw: string): `sha256:${string}` => `sha256:${createHash("sha256").update(raw).digest("hex")}`;

export function validateEquipmentReviewedAssociationCompatibility(input: {
  candidate: EquipmentReviewedAssociationCandidate;
  manifest: EquipmentReviewedAssociationManifest;
  rawPayload: string;
  catalogRelease: string;
  catalogFingerprint: string;
  catalogVariantIds: readonly string[];
}): readonly CompactEquipmentCompatibilityIssue[] {
  const { candidate, manifest } = input;
  const issues: CompactEquipmentCompatibilityIssue[] = [];
  if (manifest.payloadSha256 !== compactEquipmentEvidenceSha256(input.rawPayload)) issues.push({ code: "PAYLOAD_CHECKSUM_MISMATCH" });
  if (candidate.schemaVersion !== manifest.schemaVersion) issues.push({ code: "SCHEMA_MANIFEST_MISMATCH" });
  if (candidate.releaseCandidateId !== manifest.releaseVersion || (candidate.releaseVersion && candidate.releaseVersion !== manifest.releaseVersion)) issues.push({ code: "RELEASE_MANIFEST_MISMATCH" });
  if (candidate.compatibleCatalogRelease !== input.catalogRelease || manifest.compatibleCatalogRelease !== input.catalogRelease) issues.push({ code: "CATALOG_RELEASE_MISMATCH" });
  if (candidate.compatibleCatalogFingerprint !== input.catalogFingerprint || manifest.compatibleCatalogFingerprint !== input.catalogFingerprint) issues.push({ code: "CATALOG_FINGERPRINT_MISMATCH" });
  if (manifest.verifiedAssertionCount !== candidate.verifiedAssertions.length || manifest.reviewedAssociationCount !== candidate.reviewedAssociations.length
    || (manifest.verifiedTrimLinkCount !== undefined && manifest.verifiedTrimLinkCount !== candidate.verifiedTrimLinks.length)
    || manifest.projectionCount !== candidate.projections.length) issues.push({ code: "MANIFEST_COUNT_MISMATCH" });

  const allMaterializations = [...candidate.verifiedAssertions, ...candidate.reviewedAssociations, ...candidate.verifiedTrimLinks] as unknown as Record<string, unknown>[];
  issues.push(...duplicateIssues(allMaterializations, "materializationId", "DUPLICATE_MATERIALIZATION_ID"));
  issues.push(...duplicateIssues(candidate.verifiedAssertions as unknown as Record<string, unknown>[], "sourceAssertionId", "DUPLICATE_SOURCE_ASSERTION_ID"));
  issues.push(...duplicateIssues(candidate.reviewedAssociations as unknown as Record<string, unknown>[], "sourceObservationId", "DUPLICATE_SOURCE_OBSERVATION_ID"));
  issues.push(...duplicateIssues(candidate.verifiedTrimLinks as unknown as Record<string, unknown>[], "sourceTrimLinkId", "DUPLICATE_SOURCE_TRIM_LINK_ID"));
  issues.push(...duplicateIssues(candidate.projections as unknown as Record<string, unknown>[], "assertionMaterializationId", "DUPLICATE_PROJECTION_ASSERTION_ID"));
  const variantFeatures = candidate.verifiedAssertions.map((row) => ({ key: `${row.exactVariantId}|${row.featureCode}` }));
  issues.push(...duplicateIssues(variantFeatures, "key", "DUPLICATE_EXACT_VARIANT_FEATURE"));

  const catalogIds = new Set(input.catalogVariantIds);
  if (catalogIds.size !== input.catalogVariantIds.length) issues.push({ code: "DUPLICATE_CATALOG_VARIANT_ID" });
  for (const row of allMaterializations) if (!catalogIds.has(String(row.exactVariantId))) issues.push({ code: "UNKNOWN_MATERIALIZATION_VARIANT", reference: String(row.exactVariantId) });
  for (const row of candidate.projections) if (!catalogIds.has(row.exactVariantId)) issues.push({ code: "UNKNOWN_PROJECTION_VARIANT", reference: row.exactVariantId });

  const assertions = new Map(candidate.verifiedAssertions.map((row) => [row.materializationId, row]));
  const trims = new Map(candidate.verifiedTrimLinks.map((row) => [row.materializationId, row]));
  for (const projection of candidate.projections) {
    const assertion = assertions.get(projection.assertionMaterializationId);
    if (!assertion) { issues.push({ code: "PROJECTION_ASSERTION_REFERENCE_MISSING", reference: projection.assertionMaterializationId }); continue; }
    if (assertion.exactVariantId !== projection.exactVariantId || assertion.featureCode !== projection.featureCode) issues.push({ code: "PROJECTION_ASSERTION_CROSS_VARIANT_REFERENCE", reference: projection.assertionMaterializationId });
    if (assertion.availabilityStatus !== projection.availabilityStatus
      || assertion.standardOrOptional !== (projection.standardOrOptional ?? projection.availabilityStatus)
      || assertion.provisionMode !== projection.provisionMode) issues.push({ code: "PROJECTION_ASSERTION_SEMANTIC_LOSS", reference: projection.assertionMaterializationId });
    if (projection.trimLinkMaterializationId) {
      const trim = trims.get(projection.trimLinkMaterializationId);
      if (!trim) issues.push({ code: "PROJECTION_TRIM_REFERENCE_MISSING", reference: projection.trimLinkMaterializationId });
      else if (trim.exactVariantId !== projection.exactVariantId) issues.push({ code: "PROJECTION_TRIM_CROSS_VARIANT_REFERENCE", reference: projection.trimLinkMaterializationId });
    }
  }
  for (const trim of candidate.verifiedTrimLinks) for (const assertionId of trim.assertionMaterializationIds ?? []) {
    const assertion = assertions.get(assertionId);
    if (!assertion) issues.push({ code: "TRIM_ASSERTION_REFERENCE_MISSING", reference: assertionId });
    else if (assertion.exactVariantId !== trim.exactVariantId) issues.push({ code: "TRIM_ASSERTION_CROSS_VARIANT_REFERENCE", reference: assertionId });
  }

  const verifiedIds = [...new Set(candidate.verifiedAssertions.map((row) => row.exactVariantId))].sort();
  const associationIds = [...new Set(candidate.reviewedAssociations.map((row) => row.exactVariantId).filter((id) => !verifiedIds.includes(id)))].sort();
  const coveredIds = [...new Set([...verifiedIds, ...associationIds])].sort();
  const coverage = candidate.coverage;
  const reviewedTier = coverage.reviewedAssociationOnlyCoverage ?? coverage.reviewedAssociationCoverage;
  if (coverage.catalogVariantCount !== catalogIds.size) issues.push({ code: "COVERAGE_CATALOG_COUNT_MISMATCH" });
  if (coverage.verifiedAssertionCoverage.exactVariantCount !== verifiedIds.length
    || (coverage.verifiedAssertionCoverage.exactVariantIds && JSON.stringify([...coverage.verifiedAssertionCoverage.exactVariantIds].sort()) !== JSON.stringify(verifiedIds))) issues.push({ code: "VERIFIED_COVERAGE_MISMATCH" });
  if (!reviewedTier || reviewedTier.exactVariantCount !== associationIds.length
    || (reviewedTier.exactVariantIds && JSON.stringify([...reviewedTier.exactVariantIds].sort()) !== JSON.stringify(associationIds))) issues.push({ code: "ASSOCIATION_COVERAGE_MISMATCH" });
  if (coverage.coveredUniqueExactVariantCount !== undefined && coverage.coveredUniqueExactVariantCount !== coveredIds.length) issues.push({ code: "UNIQUE_COVERAGE_MISMATCH" });
  if (coverage.uncoveredCoverage.exactVariantCount !== catalogIds.size - coveredIds.length) issues.push({ code: "UNCOVERED_COVERAGE_MISMATCH" });
  return uniqueIssues(issues);
}

export function assertEquipmentReviewedAssociationCompatibility(input: Parameters<typeof validateEquipmentReviewedAssociationCompatibility>[0]): void {
  const issues = validateEquipmentReviewedAssociationCompatibility(input);
  if (issues.length) throw new Error(`COMPACT_EQUIPMENT_EVIDENCE_INVALID:${issues.map((issue) => `${issue.code}${issue.reference ? `:${issue.reference}` : ""}`).join(",")}`);
}

export const getVerifiedEquipmentAssertions = (candidate: EquipmentReviewedAssociationCandidate, exactVariantId?: string) =>
  candidate.verifiedAssertions.filter((item) => !exactVariantId || item.exactVariantId === exactVariantId);

export const getReviewedEquipmentAssociations = (candidate: EquipmentReviewedAssociationCandidate, input?: { exactVariantId?: string; featureCode?: EquipmentFeatureCode }) =>
  candidate.reviewedAssociations.filter((item) => (!input?.exactVariantId || item.exactVariantId === input.exactVariantId) && (!input?.featureCode || item.featureCode === input.featureCode));

export const getVerifiedEquipmentTrimLinks = (candidate: EquipmentReviewedAssociationCandidate, exactVariantId?: string) =>
  candidate.verifiedTrimLinks.filter((item) => !exactVariantId || item.exactVariantId === exactVariantId);
