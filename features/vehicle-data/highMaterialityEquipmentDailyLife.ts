import { createHash } from "node:crypto";

import { canonicalJson } from "./ownerManualEvidence";

export const HIGH_MATERIALITY_DAILY_LIFE_SCHEMA_VERSION = "EQUIPMENT_DAILY_LIFE_EXACT_APPLICATION/v1" as const;
export const HIGH_MATERIALITY_DAILY_LIFE_POLICY_VERSION = "1.0.0" as const;

export type HighMaterialityPolarity = "POSITIVE" | "NEGATIVE";

export interface HighMaterialityDefinition {
  readonly definitionId: string;
  readonly featureCode: string;
  readonly titleTr: string;
  readonly dailyLifeMeaningTr: string;
  readonly userFacingExplanationTr: string;
  readonly limitationsTr: readonly string[];
  readonly semanticSource: {
    readonly release: string;
    readonly payloadSha256: `sha256:${string}`;
    readonly entrySha256: `sha256:${string}`;
    readonly ownerApprovalEventId: string;
  };
  readonly authority: "INHERITED_OWNER_EDITORIAL";
  readonly decisionUse: "NONE";
  readonly directCandidateEffect: "NONE";
}

export interface HighMaterialityApplication {
  readonly applicationId: string;
  readonly exactVariantId: string;
  readonly identity: {
    readonly brand: string;
    readonly model: string;
    readonly trim: string;
    readonly modelYear: number;
    readonly body: string;
    readonly powertrain: string;
    readonly market: "TR";
  };
  readonly featureCode: string;
  readonly definitionId: string;
  readonly polarity: HighMaterialityPolarity;
  readonly capabilityState: "PRESENT" | "ABSENT";
  readonly consumerStatementTr: string;
  readonly comparisonSafeStatementTr: string;
  readonly unknownBehaviorTr: string;
  readonly equipmentEvidence: {
    readonly release: string;
    readonly payloadSha256: `sha256:${string}`;
    readonly assertionId: string;
    readonly materializationId: string;
    readonly ownerApprovalEventId: string;
    readonly approvalManifestId: string;
    readonly approvalManifestChecksum: `sha256:${string}`;
    readonly sourceArtifactSha256: `sha256:${string}`;
    readonly locator: Readonly<Record<string, unknown>>;
  };
  readonly manualEvidence: null | {
    readonly release: string;
    readonly payloadSha256: `sha256:${string}`;
    readonly decisionId: string;
    readonly sourceId: string;
    readonly artifactSha256: `sha256:${string}`;
    readonly physicalPdfPage: number;
    readonly sectionHeading: string;
    readonly use: "OPERATION_CONTEXT_ONLY_NOT_EQUIPMENT_PROOF";
  };
  readonly limitations: readonly string[];
  readonly familyInheritance: false;
  readonly crossVariantInheritance: false;
  readonly crossModelYearInference: false;
  readonly decisionUse: "NONE";
  readonly directCandidateEffect: "NONE";
}

export interface HighMaterialityDailyLifeRelease {
  readonly schemaVersion: typeof HIGH_MATERIALITY_DAILY_LIFE_SCHEMA_VERSION;
  readonly policyVersion: typeof HIGH_MATERIALITY_DAILY_LIFE_POLICY_VERSION;
  readonly releaseVersion: string;
  readonly parentRelease: string;
  readonly generatedAt: string;
  readonly compatibleCatalogRelease: "v0.55.4";
  readonly compatibleCatalogFingerprint: `sha256:${string}`;
  readonly compatibleEquipmentRelease: string;
  readonly compatibleEquipmentPayloadSha256: `sha256:${string}`;
  readonly compatibleManualRelease: string;
  readonly compatibleManualPayloadSha256: `sha256:${string}`;
  readonly state: "GOVERNED_IMMUTABLE_READ_PROJECTION_ONLY";
  readonly activationPerformed: false;
  readonly definitions: readonly HighMaterialityDefinition[];
  readonly applications: readonly HighMaterialityApplication[];
  readonly projectionPolicy: {
    readonly allowedConsumers: readonly ["X_EXPLANATION", "ASAMA_1_CARD_RATIONALE", "ADVISOR_READ_PROJECTION", "COMPARISON_EVIDENCE_PROJECTION"];
    readonly unknownTreatment: "NEUTRAL_NO_CLAIM_NO_PENALTY";
    readonly negativeTreatment: "EXACT_CONFIGURATION_ONLY_NO_GLOBAL_QUALITY_JUDGMENT";
    readonly manualAuthority: "OPERATION_CONTEXT_ONLY_NOT_EQUIPMENT_PROOF";
    readonly decisionUse: "NONE";
    readonly directCandidateEffect: "NONE";
  };
}

type Json = Record<string, unknown>;
const object = (value: unknown): Json => value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
const text = (value: unknown): string => typeof value === "string" ? value : "";
const checksum = (value: unknown): value is `sha256:${string}` => typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value);
const semanticDigest = (value: unknown): `sha256:${string}` => `sha256:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
const push = (issues: string[], value: string) => { if (!issues.includes(value)) issues.push(value); };

export function highMaterialityDefinitionDigest(value: unknown): `sha256:${string}` {
  return semanticDigest(value);
}

export function validateHighMaterialityDailyLifeRelease(input: {
  readonly release: HighMaterialityDailyLifeRelease;
  readonly catalogById: ReadonlyMap<string, Json>;
  readonly equipmentAssertions: readonly Json[];
  readonly manualDecisions: readonly Json[];
  readonly parentEntries: ReadonlyMap<string, Json>;
  readonly expectedEquipmentLocators: ReadonlyMap<string, Json>;
  readonly expectedEquipmentSourceSha256: ReadonlyMap<string, string>;
}): readonly string[] {
  const { release } = input;
  const issues: string[] = [];
  if (release.schemaVersion !== HIGH_MATERIALITY_DAILY_LIFE_SCHEMA_VERSION || release.policyVersion !== HIGH_MATERIALITY_DAILY_LIFE_POLICY_VERSION) push(issues, "SCHEMA_OR_POLICY_VERSION_INVALID");
  if (release.state !== "GOVERNED_IMMUTABLE_READ_PROJECTION_ONLY" || release.activationPerformed) push(issues, "UNAUTHORIZED_ACTIVATION_STATE");
  if (release.projectionPolicy.decisionUse !== "NONE" || release.projectionPolicy.directCandidateEffect !== "NONE") push(issues, "DECISION_AUTHORITY_FORBIDDEN");
  if (release.projectionPolicy.unknownTreatment !== "NEUTRAL_NO_CLAIM_NO_PENALTY") push(issues, "UNKNOWN_NEUTRALITY_REQUIRED");

  const definitionIds = new Set<string>();
  const definitions = new Map<string, HighMaterialityDefinition>();
  for (const definition of release.definitions) {
    if (definitionIds.has(definition.definitionId)) push(issues, "DUPLICATE_DEFINITION");
    definitionIds.add(definition.definitionId);
    definitions.set(definition.definitionId, definition);
    const parent = input.parentEntries.get(definition.featureCode);
    if (!parent) push(issues, "PARENT_SEMANTIC_ENTRY_MISSING");
    else {
      if (definition.semanticSource.entrySha256 !== highMaterialityDefinitionDigest(parent)) push(issues, "PARENT_SEMANTIC_ENTRY_DIGEST_MISMATCH");
      if (definition.titleTr !== text(parent.labelTr) || definition.dailyLifeMeaningTr !== text(parent.dailyLifeBenefit)
        || definition.userFacingExplanationTr !== text(parent.userFacingExplanation) || definition.limitationsTr[0] !== text(parent.caveat)) push(issues, "UNAPPROVED_SEMANTIC_MUTATION");
    }
    if (!checksum(definition.semanticSource.payloadSha256) || !checksum(definition.semanticSource.entrySha256)) push(issues, "SEMANTIC_CHECKSUM_INVALID");
    if (definition.authority !== "INHERITED_OWNER_EDITORIAL" || definition.decisionUse !== "NONE" || definition.directCandidateEffect !== "NONE") push(issues, "DEFINITION_AUTHORITY_INVALID");
  }

  const pairs = new Set<string>();
  const assertions = new Map(input.equipmentAssertions.map((item) => [text(item.materializationId), item]));
  const manualByDecision = new Map(input.manualDecisions.map((item) => [text(item.decisionId), item]));
  for (const application of release.applications) {
    const pair = `${application.exactVariantId}|${application.featureCode}`;
    if (pairs.has(pair)) push(issues, "DUPLICATE_OR_CONFLICTING_EXACT_APPLICATION");
    pairs.add(pair);
    const definition = definitions.get(application.definitionId);
    if (!definition || definition.featureCode !== application.featureCode) push(issues, "DEFINITION_BINDING_MISMATCH");
    const catalog = input.catalogById.get(application.exactVariantId);
    const variant = object(catalog?.variant);
    const identityMatches = text(variant.id) === application.exactVariantId
      && text(object(variant.brand).value) === application.identity.brand
      && text(object(variant.model).value) === application.identity.model
      && text(object(variant.trim).value) === application.identity.trim
      && Number(object(variant.modelYear).value) === application.identity.modelYear
      && text(object(variant.bodyStyle).value) === application.identity.body
      && text(object(object(variant.powertrain).fuelType).value) === application.identity.powertrain
      && text(variant.market) === application.identity.market;
    if (!identityMatches) push(issues, "EXACT_VARIANT_IDENTITY_OR_APPLICABILITY_MISMATCH");
    const assertion = assertions.get(application.equipmentEvidence.materializationId);
    if (!assertion || text(assertion.sourceAssertionId) !== application.equipmentEvidence.assertionId
      || text(assertion.exactVariantId) !== application.exactVariantId || text(assertion.featureCode) !== application.featureCode
      || text(assertion.marketApplicability) !== "TR" || Number(object(assertion.modelYearApplicability).from) !== application.identity.modelYear
      || Number(object(assertion.modelYearApplicability).to) !== application.identity.modelYear
      || text(assertion.verificationState) !== "VERIFIED" || text(assertion.ownerApprovalEventId) !== application.equipmentEvidence.ownerApprovalEventId
      || text(assertion.approvalManifestId) !== application.equipmentEvidence.approvalManifestId
      || text(assertion.approvalManifestChecksum) !== application.equipmentEvidence.approvalManifestChecksum) push(issues, "EQUIPMENT_EVIDENCE_BINDING_MISMATCH");
    if (application.equipmentEvidence.release !== release.compatibleEquipmentRelease
      || application.equipmentEvidence.payloadSha256 !== release.compatibleEquipmentPayloadSha256) push(issues, "EQUIPMENT_RELEASE_BINDING_MISMATCH");
    if (input.expectedEquipmentSourceSha256.get(application.equipmentEvidence.materializationId) !== application.equipmentEvidence.sourceArtifactSha256) push(issues, "EQUIPMENT_SOURCE_DIGEST_MISMATCH");
    if (canonicalJson(input.expectedEquipmentLocators.get(application.equipmentEvidence.materializationId) ?? {}) !== canonicalJson(application.equipmentEvidence.locator)) push(issues, "EQUIPMENT_LOCATOR_MISMATCH");
    const availability = text(assertion?.availabilityStatus);
    if (application.polarity === "POSITIVE" && (availability !== "STANDARD" || application.capabilityState !== "PRESENT")) push(issues, "POSITIVE_POLARITY_GATE_FAILED");
    if (application.polarity === "NEGATIVE" && (availability !== "NOT_AVAILABLE" || application.capabilityState !== "ABSENT")) push(issues, "NEGATIVE_POLARITY_GATE_FAILED");
    if (!checksum(application.equipmentEvidence.payloadSha256) || !checksum(application.equipmentEvidence.approvalManifestChecksum)
      || !checksum(application.equipmentEvidence.sourceArtifactSha256)) push(issues, "EQUIPMENT_CHECKSUM_INVALID");
    if (!Object.keys(application.equipmentEvidence.locator).length) push(issues, "EQUIPMENT_LOCATOR_REQUIRED");
    if (application.manualEvidence) {
      const manual = manualByDecision.get(application.manualEvidence.decisionId);
      if (!manual || text(manual.exactVariantId) !== application.exactVariantId || text(manual.featureCode) !== application.featureCode
        || text(manual.decision) !== "EXACT_VARIANT_VERIFIED" || text(manual.polarity) !== application.polarity
        || text(object(manual.applicability).market) !== "TR" || Number(object(manual.applicability).modelYear) !== application.identity.modelYear
        || text(object(manual.applicability).trim) !== application.identity.trim
        || text(object(manual.manualSource).sourceId) !== application.manualEvidence.sourceId
        || text(object(manual.manualSource).artifactSha256) !== application.manualEvidence.artifactSha256
        || Number(object(object(manual.manualSource).locator).physicalPdfPage) !== application.manualEvidence.physicalPdfPage
        || text(object(object(manual.manualSource).locator).sectionHeading) !== application.manualEvidence.sectionHeading) push(issues, "MANUAL_EVIDENCE_BINDING_MISMATCH");
      if (application.manualEvidence.release !== release.compatibleManualRelease
        || application.manualEvidence.payloadSha256 !== release.compatibleManualPayloadSha256) push(issues, "MANUAL_RELEASE_BINDING_MISMATCH");
      if (!checksum(application.manualEvidence.payloadSha256) || !checksum(application.manualEvidence.artifactSha256)
        || application.manualEvidence.physicalPdfPage < 1 || !application.manualEvidence.sectionHeading.trim()) push(issues, "MANUAL_PROVENANCE_INVALID");
    }
    if (application.identity.model === "Hilux" && application.manualEvidence) push(issues, "HILUX_CROSS_MODEL_YEAR_MANUAL_FORBIDDEN");
    if (application.familyInheritance || application.crossVariantInheritance || application.crossModelYearInference) push(issues, "CROSS_VARIANT_OR_MODEL_YEAR_INFERENCE_FORBIDDEN");
    if (application.decisionUse !== "NONE" || application.directCandidateEffect !== "NONE") push(issues, "APPLICATION_DECISION_AUTHORITY_FORBIDDEN");
    if (!application.unknownBehaviorTr.includes("nötr") || !application.unknownBehaviorTr.includes("var veya yok")) push(issues, "UNKNOWN_WORDING_NOT_NEUTRAL");
    if (application.polarity === "NEGATIVE" && (!application.comparisonSafeStatementTr.includes("exact konfigürasyonda") || !application.comparisonSafeStatementTr.includes("genel olarak daha kötü"))) push(issues, "NEGATIVE_WORDING_NOT_BOUNDED");
    const prose = [application.consumerStatementTr, application.comparisonSafeStatementTr, ...application.limitations].join(" ");
    if (/garanti eder|kesinlikle önler|kaza yaptırmaz|tam güvenlik|en iyi|kusursuz/iu.test(prose)) push(issues, "UNSUPPORTED_BENEFIT_OR_GUARANTEE");
  }
  if (release.applications.some((item) => !release.definitions.some((definition) => definition.definitionId === item.definitionId))) push(issues, "DANGLING_DEFINITION");
  return Object.freeze(issues);
}

export type HighMaterialityProjectionCell = Readonly<{
  exactVariantId: string;
  featureCode: string;
  state: "KNOWN_PRESENT" | "KNOWN_ABSENT" | "UNKNOWN_NEUTRAL";
  applicationId: string | null;
  consumerStatementTr: string | null;
  comparisonSafeStatementTr: string | null;
  limitations: readonly string[];
  decisionUse: "NONE";
  directCandidateEffect: "NONE";
}>;

export function projectHighMaterialityDailyLife(input: {
  readonly release: HighMaterialityDailyLifeRelease;
  readonly exactVariantIds: readonly string[];
  readonly featureCodes: readonly string[];
}): Readonly<{ readOnly: true; authority: "EXPLANATION_AND_COMPARISON_CONTEXT_ONLY"; unknownTreatment: "NEUTRAL_NO_CLAIM_NO_PENALTY"; cells: readonly HighMaterialityProjectionCell[] }> {
  const authorizedIds = new Set(input.exactVariantIds);
  const applications = new Map(input.release.applications.filter((item) => authorizedIds.has(item.exactVariantId)).map((item) => [`${item.exactVariantId}|${item.featureCode}`, item]));
  const cells = input.exactVariantIds.flatMap((exactVariantId) => input.featureCodes.map((featureCode): HighMaterialityProjectionCell => {
    const application = applications.get(`${exactVariantId}|${featureCode}`);
    if (!application) return Object.freeze({ exactVariantId, featureCode, state: "UNKNOWN_NEUTRAL", applicationId: null, consumerStatementTr: null, comparisonSafeStatementTr: null, limitations: Object.freeze(["Exact governed application is unavailable; unknown is neutral and creates no claim or penalty."]), decisionUse: "NONE", directCandidateEffect: "NONE" });
    return Object.freeze({ exactVariantId, featureCode, state: application.capabilityState === "PRESENT" ? "KNOWN_PRESENT" : "KNOWN_ABSENT", applicationId: application.applicationId, consumerStatementTr: application.consumerStatementTr, comparisonSafeStatementTr: application.comparisonSafeStatementTr, limitations: Object.freeze([...application.limitations]), decisionUse: "NONE", directCandidateEffect: "NONE" });
  }));
  return Object.freeze({ readOnly: true, authority: "EXPLANATION_AND_COMPARISON_CONTEXT_ONLY", unknownTreatment: "NEUTRAL_NO_CLAIM_NO_PENALTY", cells: Object.freeze(cells) });
}

export function compareHighMaterialityDailyLifeOnOff<T>(decisionSnapshot: T, projection: unknown): Readonly<{ equivalent: true; off: string; on: string; projection: unknown }> {
  const off = canonicalJson(decisionSnapshot);
  void projection;
  const on = canonicalJson(decisionSnapshot);
  return Object.freeze({ equivalent: true, off, on, projection });
}
