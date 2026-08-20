import { createHash } from "node:crypto";

import authorityCandidate from "@/data/production/equipment-public-explanation-authority/release-candidates/v0.1.2-catalog-v0.55.4-2026-08-20-candidate/authority.json";
import authorityManifest from "@/data/production/equipment-public-explanation-authority/release-candidates/v0.1.2-catalog-v0.55.4-2026-08-20-candidate/manifest.json";
import approvedCopy from "@/data/production/equipment-public-explanation-authority/release-candidates/v0.1.2-catalog-v0.55.4-2026-08-20-candidate/approved-copy-registry.json";
import compositeBinding from "@/data/production/equipment-public-explanation-authority/release-candidates/v0.1.2-catalog-v0.55.4-2026-08-20-candidate/composite-binding.json";
import coverageReport from "@/data/production/equipment-public-explanation-authority/release-candidates/v0.1.2-catalog-v0.55.4-2026-08-20-candidate/coverage-report.json";
import privacyPolicy from "@/data/production/equipment-public-explanation-authority/release-candidates/v0.1.2-catalog-v0.55.4-2026-08-20-candidate/privacy-retention-policy.json";
import telemetryPolicy from "@/data/production/equipment-public-explanation-authority/release-candidates/v0.1.2-catalog-v0.55.4-2026-08-20-candidate/public-telemetry-allowlist-policy.json";
import dailyLifeCandidate from "@/data/production/equipment-daily-life/release-candidates/v1.0.1-catalog-v0.55.4-2026-08-20-candidate/equipment-daily-life.json";
import dailyLifeCandidateManifest from "@/data/production/equipment-daily-life/release-candidates/v1.0.1-catalog-v0.55.4-2026-08-20-candidate/manifest.json";
import equipmentPointer from "@/data/production/equipment-evidence/active.json";
import { activeEquipmentEvidencePayload, activeEquipmentEvidenceRelease } from "@/data/production/equipment-evidence/activeEquipmentEvidence.generated";
import dailyLifePointer from "@/data/production/equipment-daily-life/active.json";
import dailyLifeLegalCorrectionPredecessor from "@/data/production/equipment-daily-life/releases/v1.0.0-catalog-v0.55.4-2026-08-20/equipment-daily-life.json";
import type { EquipmentAvailabilityStatus, EquipmentFeatureCode, EquipmentProvisionMode } from "@/types/equipmentEvidence";
import type { EquipmentDailyLifeEntry, EquipmentDailyLifeLayer } from "@/types/equipmentDailyLife";
import { parseStrictRfc3339Instant } from "@/features/decision/v2/schema/strictRfc3339Timestamp";

export type EquipmentPublicExplanationAuthorityType = "POST_REVEAL_CONFIRMED_EXPLANATION" | "DIRECT_QUESTION_VERIFIED_ABSENCE";
export type EquipmentPublicExplanationDisposition = "AUTHORIZED_CONFIRMED_INCLUDED" | "AUTHORIZED_VERIFIED_ABSENCE" | "OPTIONAL_CONFIRMATION_REQUIRED"
  | "PACKAGE_CONFIRMATION_REQUIRED" | "ASSOCIATION_PROVISION_UNRESOLVED" | "LEGACY_PROVISION_UNRESOLVED" | "UNKNOWN_NO_CLAIM"
  | "CONFLICT_NO_CLAIM" | "PILOT_AUTHORITY_UNAVAILABLE" | "REVEAL_AUTHORIZATION_REQUIRED" | "INCOMPATIBLE_NO_CLAIM";

export type AuthorizedEquipmentExplanationUnit = Readonly<{
  conversationId: string; offerId: string; exactVariantId: string; featureCode: EquipmentFeatureCode; authorityType: EquipmentPublicExplanationAuthorityType;
  evidenceAssertionId: string; evidenceMaterializationId: string; evidenceFingerprint: `sha256:${string}`; equipmentRelease: string;
  equipmentDailyLifeRelease: string; catalogFingerprint: string; labelTr: string; controlledExplanation: string; caveat: string;
  market: "Türkiye"; modelYear: number; publicContextSource: "RESPONSE" | "REVEALED_CARD";
  recommendationTermsAccepted: true; recommendationTermsVersion: string; recommendationTermsAcceptanceEventId: string; recommendationTermsAcceptedAt: string;
  recommendationTermsAcceptanceSequence: number; revealAt: string; revealSequence: number;
  availabilityStatus: "STANDARD" | "NOT_AVAILABLE"; provisionMode: "INCLUDED" | "NOT_OFFERED"; sourceApplicability: "EXACT_VARIANT";
  verificationState: "VERIFIED"; conflictState: "CLEAR"; authorizationReasonCodes: readonly string[];
  expiresWithOfferOrConversation: true; publicFactClass: "CONFIRMED_INCLUDED_EQUIPMENT" | "VERIFIED_ABSENT_EQUIPMENT_DIRECT_ANSWER_ONLY";
}>;

export type RevealedSealedOffer = Readonly<{ offerId: string; conversationId: string; lifecycleState: "CREATED" | "CONSENTED" | "REVEALED" | "EXPIRED" | "REVOKED";
  catalogFingerprint: string; candidateRefs: readonly Readonly<{ exactVariantId: string }>[]; expiresAt: string; revealAt: string; revealSequence: number }>;
export type EquipmentExplanationAuthorizationInput = Readonly<{ conversationId: string; recommendationTermsAccepted: boolean;
  recommendationTermsVersion?: string; recommendationTermsAcceptanceEventId?: string; recommendationTermsAcceptedAt?: string;
  recommendationTermsAcceptanceConversationId?: string; recommendationTermsAcceptanceOfferId?: string; recommendationTermsAcceptanceSequence?: number; offerConsentCompleted: boolean;
  offer: RevealedSealedOffer; revealedCardExactVariantIds: readonly string[]; exactVariantId: string; featureCode: EquipmentFeatureCode;
  requestKind: "POST_REVEAL_EXPLANATION" | "DIRECT_FEATURE_QUESTION"; explanationRequested: boolean; catalogFingerprint: string; now: string;
  publicContext?: Readonly<{ market: "Türkiye"; modelYear: number; source: "RESPONSE" | "REVEALED_CARD" }> }>;

type Materialization = { sourceAssertionId: string; materializationId: string; exactVariantId: string; featureCode: EquipmentFeatureCode;
  availabilityStatus: EquipmentAvailabilityStatus; provisionMode?: EquipmentProvisionMode; verificationState: string; conflictState?: string;
  contentFingerprint?: `sha256:${string}`; locator?: { kind?: string; row?: string; column?: string }; source?: { sourceAuthority?: string } };
const evidencePayload = activeEquipmentEvidencePayload as unknown as { decisionAuthority: string; verifiedAssertions: Materialization[]; reviewedAssociations: Array<{ exactVariantId: string; featureCode: EquipmentFeatureCode }> };
const dailyLife = dailyLifeCandidate as EquipmentDailyLifeLayer;
const positiveIds = new Set(authorityCandidate.authorizedPositiveAssertionIds);
const negativeIds = new Set(authorityCandidate.authorizedNegativeAssertionIds);
const pilotIds = new Set(authorityCandidate.pilotExactVariantAllowlist);
const shaJson = (value: unknown) => `sha256:${createHash("sha256").update(`${JSON.stringify(value, null, 2)}\n`).digest("hex")}`;
const correctedFeatureCodes = new Set<EquipmentFeatureCode>(["ISOFIX_REAR_OUTER", "LED_HEADLIGHTS", "MATRIX_LED_HEADLIGHTS", "REAR_SEAT_OCCUPANT_ALERT", "TERRAIN_DRIVE_MODES"]);

export function validateEquipmentDailyLifeLegalCorrectionCandidate(): readonly string[] {
  const issues: string[] = [];
  if (dailyLifeCandidate.releaseVersion !== "v1.0.1-catalog-v0.55.4-2026-08-20-candidate" || dailyLifeCandidateManifest.payloadSha256 !== shaJson(dailyLifeCandidate)) issues.push("DAILY_LIFE_CANDIDATE_ID_OR_CHECKSUM_INVALID");
  if (dailyLifeCandidate.entries.length !== 51 || dailyLifeCandidate.sourceAuthority !== "OWNER_EDITORIAL_PENDING_REAPPROVAL" || dailyLifeCandidateManifest.decisionUse !== "EXPLANATION_ONLY") issues.push("DAILY_LIFE_CANDIDATE_AUTHORITY_INVALID");
  const active = dailyLifeLegalCorrectionPredecessor as EquipmentDailyLifeLayer;
  let unchanged = 0; let corrected = 0;
  for (const entry of dailyLife.entries) {
    const before = active.entries.find((item) => item.featureCode === entry.featureCode);
    if (!before) { issues.push("DAILY_LIFE_FEATURE_SET_CHANGED"); continue; }
    const stable = (value: EquipmentDailyLifeEntry) => JSON.stringify({ ...value, userFacingExplanation: undefined, caveat: undefined });
    if (stable(entry) !== stable(before)) issues.push("DAILY_LIFE_NON_COPY_FIELD_CHANGED");
    if (correctedFeatureCodes.has(entry.featureCode)) {
      if (entry.userFacingExplanation === before.userFacingExplanation || entry.caveat === before.caveat) issues.push("REQUIRED_LEGAL_COPY_NOT_CORRECTED");
      corrected += 1;
    } else {
      if (JSON.stringify(entry) !== JSON.stringify(before)) issues.push("UNCHANGED_DAILY_LIFE_ENTRY_MUTATED");
      unchanged += 1;
    }
  }
  if (unchanged !== 46 || corrected !== 5) issues.push("DAILY_LIFE_SEMANTIC_DIFF_COUNT_INVALID");
  return Object.freeze(issues);
}

export function validateEquipmentPublicExplanationAuthorityCandidate(): readonly string[] {
  const issues: string[] = [];
  issues.push(...validateEquipmentDailyLifeLegalCorrectionCandidate());
  if (authorityCandidate.schemaVersion !== "1.2.0-rc" || authorityManifest.schemaVersion !== authorityCandidate.schemaVersion) issues.push("SCHEMA_VERSION_INVALID");
  if (authorityCandidate.releaseId !== authorityManifest.releaseId) issues.push("RELEASE_ID_MISMATCH");
  if (shaJson(authorityCandidate) !== authorityManifest.authorityPayloadSha256) issues.push("AUTHORITY_PAYLOAD_CHECKSUM_MISMATCH");
  if (shaJson(coverageReport) !== authorityManifest.coverageReportSha256) issues.push("COVERAGE_REPORT_CHECKSUM_MISMATCH");
  if (shaJson(approvedCopy) !== authorityManifest.approvedCopyRegistrySha256 || shaJson(privacyPolicy) !== authorityManifest.privacyRetentionPolicySha256
    || shaJson(telemetryPolicy) !== authorityManifest.publicTelemetryAllowlistPolicySha256 || shaJson(compositeBinding) !== authorityManifest.compositeManifestSha256) issues.push("BOUND_ARTIFACT_CHECKSUM_MISMATCH");
  if (authorityCandidate.compositeManifestChecksum !== authorityManifest.compositeManifestSha256
    || JSON.stringify(authorityCandidate.boundArtifactChecksums) !== JSON.stringify({
      dailyLifeCandidatePayloadSha256: authorityManifest.dailyLifeCandidatePayloadSha256,
      approvedCopyRegistrySha256: authorityManifest.approvedCopyRegistrySha256,
      privacyRetentionPolicySha256: authorityManifest.privacyRetentionPolicySha256,
      publicTelemetryAllowlistPolicySha256: authorityManifest.publicTelemetryAllowlistPolicySha256
    })) issues.push("COMPOSITE_BINDING_INVALID");
  if (authorityCandidate.compatibleCatalogFingerprint !== equipmentPointer.compatibleCatalogFingerprint || authorityCandidate.compatibleCatalogFingerprint !== dailyLifeCandidate.compatibleCatalogFingerprint) issues.push("CATALOG_FINGERPRINT_MISMATCH");
  if (authorityCandidate.compatibleEquipmentRelease !== activeEquipmentEvidenceRelease || authorityCandidate.compatibleEquipmentChecksum !== equipmentPointer.payloadSha256) issues.push("EQUIPMENT_RELEASE_OR_CHECKSUM_MISMATCH");
  if (authorityCandidate.compatibleEquipmentDailyLifeRelease !== dailyLifeCandidate.releaseVersion || authorityCandidate.compatibleEquipmentDailyLifeChecksum !== dailyLifeCandidateManifest.payloadSha256) issues.push("DAILY_LIFE_RELEASE_OR_CHECKSUM_MISMATCH");
  if (authorityCandidate.activationPerformed || !authorityCandidate.ownerApprovalRequired || authorityManifest.activationPerformed || !authorityManifest.ownerApprovalRequired) issues.push("LIFECYCLE_AUTHORITY_INVALID");
  if (evidencePayload.decisionAuthority !== "SHADOW_AND_EXPLANATION_DISABLED" || dailyLifePointer.runtimeAuthority !== "EXPLANATION_ONLY") issues.push("GLOBAL_AUTHORITY_CHANGED_OR_INVALID");
  if (dailyLifeCandidate.sourceAuthority !== "OWNER_EDITORIAL_PENDING_REAPPROVAL" || dailyLifeCandidateManifest.activationPerformed || !dailyLifeCandidateManifest.ownerApprovalRequired) issues.push("DAILY_LIFE_CANDIDATE_LIFECYCLE_INVALID");
  if (privacyPolicy.crossConversationEquipmentProfileAllowed || privacyPolicy.marketingReuseAllowed || privacyPolicy.rankingOrLeadScoringAllowed) issues.push("PRIVACY_RETENTION_POLICY_INVALID");
  if (pilotIds.size !== 2 || positiveIds.size !== 62 || negativeIds.size !== 3) issues.push("SUBJECT_COUNT_INVALID");
  const correctedAssertions = evidencePayload.verifiedAssertions.filter((item) => pilotIds.has(item.exactVariantId) && correctedFeatureCodes.has(item.featureCode));
  if (correctedAssertions.length !== 7 || authorityManifest.affectedCorrectedAssertionCount !== 7) issues.push("CORRECTED_ASSERTION_COUNT_INVALID");
  if (approvedCopy.positiveTemplate.startsWith("Bu araçta") || !approvedCopy.positiveTemplate.includes("Türkiye [MY] resmî donanım listesine göre")) issues.push("POSITIVE_TEMPLATE_INVALID");
  if (!approvedCopy.verifiedAbsenceDirectQuestionTemplate.includes("yetkili satıcıdan doğrulayın")) issues.push("VERIFIED_ABSENCE_TEMPLATE_INVALID");
  const actualPositive = evidencePayload.verifiedAssertions.filter((item) => pilotIds.has(item.exactVariantId) && item.availabilityStatus === "STANDARD" && item.provisionMode === "INCLUDED").map((item) => item.sourceAssertionId);
  const actualNegative = evidencePayload.verifiedAssertions.filter((item) => pilotIds.has(item.exactVariantId) && item.availabilityStatus === "NOT_AVAILABLE" && item.provisionMode === "NOT_OFFERED").map((item) => item.sourceAssertionId);
  if (actualPositive.length !== positiveIds.size || actualPositive.some((id) => !positiveIds.has(id))) issues.push("POSITIVE_SUBJECT_SET_MISMATCH");
  if (actualNegative.length !== negativeIds.size || actualNegative.some((id) => !negativeIds.has(id))) issues.push("NEGATIVE_SUBJECT_SET_MISMATCH");
  return Object.freeze(issues);
}

const noClaimText: Record<EquipmentPublicExplanationDisposition, string> = {
  AUTHORIZED_CONFIRMED_INCLUDED: "", AUTHORIZED_VERIFIED_ABSENCE: "", OPTIONAL_CONFIRMATION_REQUIRED: "Bu özellik için somut araç ve konfigürasyon teyidi gerekir.",
  PACKAGE_CONFIRMATION_REQUIRED: "Bu özellik için paket kapsamının doğrulanması gerekir.", ASSOCIATION_PROVISION_UNRESOLVED: approvedCopy.associationOnlyTemplate,
  LEGACY_PROVISION_UNRESOLVED: "Bu özelliğin standart olarak bulunduğu doğrulanamıyor.", UNKNOWN_NO_CLAIM: approvedCopy.unknownTemplate,
  CONFLICT_NO_CLAIM: "Bu özellik için çelişkili bilgi bulunduğundan ayrıca teyit gerekir.", PILOT_AUTHORITY_UNAVAILABLE: "Bu araç için public equipment pilot yetkisi bulunmuyor.",
  REVEAL_AUTHORIZATION_REQUIRED: "Donanım açıklaması yalnız yetkilendirilmiş ve açılmış araç kartı için hazırlanabilir.", INCOMPATIBLE_NO_CLAIM: "Donanım açıklama katmanları uyumlu değil."
};
const result = (disposition: EquipmentPublicExplanationDisposition, reasonCodes: string[], unit?: AuthorizedEquipmentExplanationUnit) =>
  Object.freeze({ authorized: Boolean(unit), disposition, unit: unit ?? null, controlledResponse: unit ? null : noClaimText[disposition], reasonCodes: Object.freeze(reasonCodes) });

export function authorizeEquipmentPublicExplanation(input: EquipmentExplanationAuthorizationInput) {
  const candidateIssues = validateEquipmentPublicExplanationAuthorityCandidate();
  if (candidateIssues.length) return result("INCOMPATIBLE_NO_CLAIM", [...candidateIssues]);
  if (!pilotIds.has(input.exactVariantId)) {
    const outsideExact = evidencePayload.verifiedAssertions.filter((item) => item.exactVariantId === input.exactVariantId && item.featureCode === input.featureCode);
    if (outsideExact.some((item) => item.availabilityStatus === "STANDARD" && !item.provisionMode)) return result("LEGACY_PROVISION_UNRESOLVED", ["EXACT_VARIANT_NOT_IN_PILOT_ALLOWLIST", "LEGACY_PROVISION_MISSING"]);
    if (evidencePayload.reviewedAssociations.some((item) => item.exactVariantId === input.exactVariantId && item.featureCode === input.featureCode)) return result("ASSOCIATION_PROVISION_UNRESOLVED", ["EXACT_VARIANT_NOT_IN_PILOT_ALLOWLIST", "ASSOCIATION_ONLY_CANNOT_CONFIRM"]);
    return result("UNKNOWN_NO_CLAIM", ["EXACT_VARIANT_NOT_IN_PILOT_ALLOWLIST", "NO_PUBLIC_PILOT_AUTHORITY"]);
  }
  const acceptedAt = parseStrictRfc3339Instant(input.recommendationTermsAcceptedAt ?? "");
  const revealAt = parseStrictRfc3339Instant(input.offer.revealAt);
  const now = parseStrictRfc3339Instant(input.now);
  const recAuditBound = input.recommendationTermsAccepted === true
    && input.recommendationTermsVersion === authorityCandidate.requiredRecommendationTermsVersion
    && Boolean(input.recommendationTermsAcceptanceEventId)
    && input.recommendationTermsAcceptanceConversationId === input.conversationId
    && input.recommendationTermsAcceptanceOfferId === input.offer.offerId
    && acceptedAt !== undefined && revealAt !== undefined && now !== undefined && acceptedAt < revealAt && revealAt <= now
    && typeof input.recommendationTermsAcceptanceSequence === "number"
    && input.recommendationTermsAcceptanceSequence < input.offer.revealSequence;
  if (!recAuditBound) return result("REVEAL_AUTHORIZATION_REQUIRED", ["REC_ACCEPTANCE_AUDIT_BINDING_FAILED"]);
  const expectedModelYear = authorityCandidate.modelYearByExactVariantId[input.exactVariantId as keyof typeof authorityCandidate.modelYearByExactVariantId];
  if (!input.publicContext || input.publicContext.market !== "Türkiye" || input.publicContext.modelYear !== expectedModelYear) {
    return result("REVEAL_AUTHORIZATION_REQUIRED", ["PUBLIC_MARKET_AND_MODEL_YEAR_CONTEXT_REQUIRED"]);
  }
  const offerBound = input.offerConsentCompleted && input.offer.lifecycleState === "REVEALED"
    && input.offer.conversationId === input.conversationId && input.offer.catalogFingerprint === input.catalogFingerprint
    && input.catalogFingerprint === authorityCandidate.compatibleCatalogFingerprint && Date.parse(input.offer.expiresAt) >= Date.parse(input.now)
    && input.offer.candidateRefs.some((ref) => ref.exactVariantId === input.exactVariantId) && input.revealedCardExactVariantIds.includes(input.exactVariantId);
  if (!offerBound) return result("REVEAL_AUTHORIZATION_REQUIRED", ["TERMS_CONSENT_REVEAL_OFFER_OR_FINGERPRINT_GATE_FAILED"]);
  if (!input.explanationRequested) return result("REVEAL_AUTHORIZATION_REQUIRED", ["USER_EXPLANATION_REQUEST_REQUIRED"]);
  const matching = evidencePayload.verifiedAssertions.filter((item) => item.exactVariantId === input.exactVariantId && item.featureCode === input.featureCode);
  if (matching.length !== 1) return result(matching.length > 1 ? "CONFLICT_NO_CLAIM" : "UNKNOWN_NO_CLAIM", [matching.length > 1 ? "DUPLICATE_EVIDENCE" : "SILENT_ABSENCE_NO_NEGATIVE_INFERENCE"]);
  const evidence = matching[0]; const entry = dailyLife.entries.find((item) => item.featureCode === input.featureCode);
  if (!entry || entry.authority !== "OWNER_EDITORIAL") return result("INCOMPATIBLE_NO_CLAIM", ["CONTROLLED_DAILY_LIFE_ENTRY_MISSING"]);
  if ((evidence.conflictState ?? "CLEAR") !== "CLEAR") return result("CONFLICT_NO_CLAIM", ["EVIDENCE_CONFLICT"]);
  if (evidence.availabilityStatus === "STANDARD" && !evidence.provisionMode) return result("LEGACY_PROVISION_UNRESOLVED", ["LEGACY_PROVISION_MISSING"]);
  if (evidence.availabilityStatus === "OPTIONAL") return result("OPTIONAL_CONFIRMATION_REQUIRED", ["OPTIONAL_IS_NOT_INCLUDED"]);
  if (evidence.availabilityStatus === "PACKAGE_DEPENDENT") return result("PACKAGE_CONFIRMATION_REQUIRED", ["PACKAGE_BOUND_CONFIRMATION_REQUIRED"]);
  if (evidence.availabilityStatus === "NOT_AVAILABLE") {
    const negativeGate = input.requestKind === "DIRECT_FEATURE_QUESTION" && evidence.provisionMode === "NOT_OFFERED" && evidence.verificationState === "VERIFIED"
      && negativeIds.has(evidence.sourceAssertionId) && evidence.locator?.kind === "PDF_PAGE" && Boolean(evidence.locator.row && evidence.locator.column);
    if (!negativeGate) return result("UNKNOWN_NO_CLAIM", ["VERIFIED_ABSENCE_DIRECT_QUESTION_GATE_FAILED"]);
    return result("AUTHORIZED_VERIFIED_ABSENCE", ["DIRECT_QUESTION", "EXACT_OFFICIAL_MATRIX_NEGATIVE", "REVEALED_OFFER_BOUND"], createUnit(input, evidence, entry, "DIRECT_QUESTION_VERIFIED_ABSENCE"));
  }
  const positiveGate = evidence.availabilityStatus === "STANDARD" && evidence.provisionMode === "INCLUDED" && evidence.verificationState === "VERIFIED"
    && positiveIds.has(evidence.sourceAssertionId);
  if (!positiveGate) return result("UNKNOWN_NO_CLAIM", ["CONFIRMED_INCLUDED_GATE_FAILED"]);
  return result("AUTHORIZED_CONFIRMED_INCLUDED", ["EXACT_CONFIRMED_INCLUDED", "OWNER_EDITORIAL_COPY", "REVEALED_OFFER_BOUND"], createUnit(input, evidence, entry, "POST_REVEAL_CONFIRMED_EXPLANATION"));
}

function createUnit(input: EquipmentExplanationAuthorizationInput, evidence: Materialization, entry: EquipmentDailyLifeEntry, authorityType: EquipmentPublicExplanationAuthorityType): AuthorizedEquipmentExplanationUnit {
  return Object.freeze({ conversationId: input.conversationId, offerId: input.offer.offerId, exactVariantId: input.exactVariantId, featureCode: input.featureCode, authorityType,
    evidenceAssertionId: evidence.sourceAssertionId, evidenceMaterializationId: evidence.materializationId, evidenceFingerprint: evidence.contentFingerprint!,
    equipmentRelease: activeEquipmentEvidenceRelease, equipmentDailyLifeRelease: dailyLifeCandidate.releaseVersion, catalogFingerprint: input.catalogFingerprint,
    market: "Türkiye", modelYear: input.publicContext!.modelYear, publicContextSource: input.publicContext!.source,
    recommendationTermsAccepted: true, recommendationTermsVersion: input.recommendationTermsVersion!, recommendationTermsAcceptanceEventId: input.recommendationTermsAcceptanceEventId!, recommendationTermsAcceptedAt: input.recommendationTermsAcceptedAt!,
    recommendationTermsAcceptanceSequence: input.recommendationTermsAcceptanceSequence!, revealAt: input.offer.revealAt, revealSequence: input.offer.revealSequence,
    labelTr: entry.labelTr, controlledExplanation: entry.userFacingExplanation, caveat: entry.caveat, availabilityStatus: evidence.availabilityStatus as "STANDARD" | "NOT_AVAILABLE",
    provisionMode: evidence.provisionMode as "INCLUDED" | "NOT_OFFERED", sourceApplicability: "EXACT_VARIANT", verificationState: "VERIFIED", conflictState: "CLEAR",
    authorizationReasonCodes: Object.freeze(authorityType === "POST_REVEAL_CONFIRMED_EXPLANATION" ? ["CONFIRMED_INCLUDED_GATE_COMPLETE"] : ["VERIFIED_ABSENCE_DIRECT_QUESTION_GATE_COMPLETE"]),
    expiresWithOfferOrConversation: true, publicFactClass: authorityType === "POST_REVEAL_CONFIRMED_EXPLANATION" ? "CONFIRMED_INCLUDED_EQUIPMENT" : "VERIFIED_ABSENT_EQUIPMENT_DIRECT_ANSWER_ONLY" });
}

const forbiddenWording = /güvenliği garanti eder|kazayı önler|hata yapmaz|kesin korur|sınıfının en iyisi|rakiplerinden üstündür|stoktaki her araçta vardır|fiziksel stok(?:taki)? araçta doğrulandı/iu;
const allowedUnitKeys = new Set(["conversationId","offerId","exactVariantId","featureCode","authorityType","evidenceAssertionId","evidenceMaterializationId","evidenceFingerprint","equipmentRelease","equipmentDailyLifeRelease","catalogFingerprint","labelTr","controlledExplanation","caveat","market","modelYear","publicContextSource","recommendationTermsAccepted","recommendationTermsVersion","recommendationTermsAcceptanceEventId","recommendationTermsAcceptedAt","recommendationTermsAcceptanceSequence","revealAt","revealSequence","availabilityStatus","provisionMode","sourceApplicability","verificationState","conflictState","authorizationReasonCodes","expiresWithOfferOrConversation","publicFactClass"]);
export function validateAuthorizedEquipmentExplanationUnit(unit: AuthorizedEquipmentExplanationUnit): readonly string[] {
  const issues: string[] = [];
  if (Object.keys(unit).some((key) => !allowedUnitKeys.has(key))) issues.push("INTERNAL_OR_RAW_FIELD_LEAKAGE");
  const entry = dailyLife.entries.find((item) => item.featureCode === unit.featureCode);
  if (!entry || unit.controlledExplanation !== entry.userFacingExplanation || unit.caveat !== entry.caveat || unit.labelTr !== entry.labelTr) issues.push("NON_DAILY_LIFE_FREE_FACT");
  if (forbiddenWording.test(`${unit.controlledExplanation} ${unit.caveat}`)) issues.push("FORBIDDEN_SAFETY_OR_SUPERIORITY_WORDING");
  if (!pilotIds.has(unit.exactVariantId) || unit.sourceApplicability !== "EXACT_VARIANT" || unit.verificationState !== "VERIFIED" || unit.conflictState !== "CLEAR") issues.push("UNIT_AUTHORITY_GATE_INVALID");
  if (unit.market !== "Türkiye" || !unit.modelYear || unit.recommendationTermsAccepted !== true || unit.recommendationTermsVersion !== authorityCandidate.requiredRecommendationTermsVersion || !unit.recommendationTermsAcceptanceEventId || !Number.isFinite(Date.parse(unit.recommendationTermsAcceptedAt))) issues.push("REC_OR_PUBLIC_CONTEXT_AUDIT_INVALID");
  const acceptedAt = parseStrictRfc3339Instant(unit.recommendationTermsAcceptedAt); const revealAt = parseStrictRfc3339Instant(unit.revealAt);
  if (acceptedAt === undefined || revealAt === undefined || acceptedAt >= revealAt || unit.recommendationTermsAcceptanceSequence >= unit.revealSequence) issues.push("REC_NOT_STRICTLY_BEFORE_REVEAL");
  if (unit.authorityType === "POST_REVEAL_CONFIRMED_EXPLANATION" && (unit.availabilityStatus !== "STANDARD" || unit.provisionMode !== "INCLUDED")) issues.push("CONFIRMED_WORDING_GATE_INVALID");
  if (unit.authorityType === "DIRECT_QUESTION_VERIFIED_ABSENCE" && (unit.availabilityStatus !== "NOT_AVAILABLE" || unit.provisionMode !== "NOT_OFFERED")) issues.push("ABSENCE_WORDING_GATE_INVALID");
  return Object.freeze(issues);
}

export function renderAuthorizedEquipmentExplanation(unit: AuthorizedEquipmentExplanationUnit): string {
  const issues = validateAuthorizedEquipmentExplanationUnit(unit); if (issues.length) throw new Error(`EQUIPMENT_EXPLANATION_UNIT_INVALID:${issues.join(",")}`);
  return unit.authorityType === "POST_REVEAL_CONFIRMED_EXPLANATION"
    ? `Türkiye ${unit.modelYear} resmî donanım listesine göre bu versiyonda ${unit.labelTr} standart olarak yer alıyor. ${unit.controlledExplanation} ${unit.caveat}`
    : `İncelediğimiz Türkiye ${unit.modelYear} resmî donanım listesinde bu versiyon için ${unit.labelTr} sunulmadığı belirtiliyor. Donanım listeleri değişebileceğinden satın alma öncesinde güncel araç konfigürasyonunu yetkili satıcıdan doğrulayın.`;
}

export function compareAuthorizedEquipmentExplanations(left: ReturnType<typeof authorizeEquipmentPublicExplanation>, right: ReturnType<typeof authorizeEquipmentPublicExplanation>) {
  const describe = (side: typeof left) => side.unit?.authorityType === "POST_REVEAL_CONFIRMED_EXPLANATION" ? "CONFIRMED_INCLUDED"
    : side.unit?.authorityType === "DIRECT_QUESTION_VERIFIED_ABSENCE" ? "VERIFIED_ABSENT"
      : side.disposition === "ASSOCIATION_PROVISION_UNRESOLVED" ? "ASSOCIATION_ONLY" : "INSUFFICIENT_VERIFICATION";
  const leftState = describe(left); const rightState = describe(right);
  const feature = left.unit?.labelTr ?? right.unit?.labelTr ?? "özellik";
  const my = left.unit?.modelYear ?? right.unit?.modelYear;
  let controlledComparison: string | null = null;
  if (leftState === "CONFIRMED_INCLUDED" && rightState === "INSUFFICIENT_VERIFICATION") controlledComparison = approvedCopy.comparisonTemplates.CONFIRMED_UNKNOWN.replace("[özellik]", feature);
  else if (leftState === "CONFIRMED_INCLUDED" && rightState === "ASSOCIATION_ONLY") controlledComparison = approvedCopy.comparisonTemplates.CONFIRMED_ASSOCIATION.replace("[özellik]", feature);
  else if (leftState === "VERIFIED_ABSENT" && rightState === "INSUFFICIENT_VERIFICATION" && my) controlledComparison = approvedCopy.comparisonTemplates.VERIFIED_ABSENCE_UNKNOWN.replace("[MY]", String(my)).replace("[özellik]", feature);
  else if (leftState === "CONFIRMED_INCLUDED" && rightState === "CONFIRMED_INCLUDED") controlledComparison = approvedCopy.comparisonTemplates.BOTH_CONFIRMED.replace("[özellik]", feature);
  return Object.freeze({ left: leftState, right: rightState, rankingEffect: "NONE" as const, qualityScoreAllowed: false as const, safetyOrSuperiorityInferenceAllowed: false as const, controlledComparison });
}

export const EQUIPMENT_POST_REVEAL_OFFER_COPY = approvedCopy.postRevealOfferTemplate;
export type EquipmentExplanationSessionNoticeState = Readonly<{ conversationId: string; exactVariantId: string; offerId: string; sourceNoticeShown: boolean }>;
export function planEquipmentExplanationSessionNotice(state: EquipmentExplanationSessionNoticeState, unit: AuthorizedEquipmentExplanationUnit, options: Readonly<{ staleEvidence: boolean }> = { staleEvidence: false }) {
  if (state.conversationId !== unit.conversationId || state.exactVariantId !== unit.exactVariantId || state.offerId !== unit.offerId) return Object.freeze({ allowed: false, notice: null, nextState: state, reasonCode: "SESSION_SCOPE_MISMATCH" });
  const inlineRequired = options.staleEvidence || unit.authorityType === "DIRECT_QUESTION_VERIFIED_ABSENCE";
  const showNotice = !state.sourceNoticeShown || inlineRequired;
  return Object.freeze({ allowed: true, notice: showNotice ? approvedCopy.sessionSourceNotice : null,
    nextState: Object.freeze({ ...state, sourceNoticeShown: state.sourceNoticeShown || showNotice }),
    reasonCode: inlineRequired ? "INLINE_SOURCE_NOTICE_REQUIRED" : showNotice ? "SESSION_SOURCE_NOTICE_ONCE" : "SESSION_SOURCE_NOTICE_ALREADY_SHOWN" });
}

export function validateEquipmentExplanationPrivacyRetentionPolicy(): readonly string[] {
  const issues: string[] = [];
  if (privacyPolicy.authorizationUnitLifetime !== "LESS_THAN_OR_EQUAL_TO_CONVERSATION_OR_OFFER_LIFETIME") issues.push("AUTHORIZATION_UNIT_LIFETIME_INVALID");
  if (privacyPolicy.explanationPreferenceAndDeclineScope !== "CURRENT_VEHICLE_SESSION_ONLY"
    || JSON.stringify(privacyPolicy.vehicleSessionBinding) !== JSON.stringify(["conversationId", "exactVariantId", "offerId"])
    || privacyPolicy.crossVehicleSessionReuseAllowed || privacyPolicy.crossConversationEquipmentProfileAllowed || !privacyPolicy.stateExpiresWithConversationOrOffer) issues.push("VEHICLE_SESSION_SCOPE_INVALID");
  if (privacyPolicy.marketingReuseAllowed || privacyPolicy.retargetingReuseAllowed || privacyPolicy.rankingOrLeadScoringAllowed || privacyPolicy.rawEquipmentQuestionsDurableProfileAllowed) issues.push("SECONDARY_USE_FORBIDDEN");
  if (!privacyPolicy.acceptanceProofSeparatedFromFeatureInterestHistory || privacyPolicy.internalEvidenceIdentifiersInGeneralTelemetryAllowed) issues.push("AUDIT_OR_TELEMETRY_BOUNDARY_INVALID");
  if (telemetryPolicy.scope !== "CURRENT_VEHICLE_SESSION_ONLY" || telemetryPolicy.personalIdentifiersAllowed || telemetryPolicy.rawTextAllowed
    || telemetryPolicy.genericObjectSpreadAllowed || telemetryPolicy.durableProfileWriteAllowed || telemetryPolicy.marketingLeadScoringRetargetingAllowed
    || JSON.stringify(telemetryPolicy.allowedFields) !== JSON.stringify(["eventType", "outcome", "scope"])) issues.push("PUBLIC_TELEMETRY_POLICY_INVALID");
  return Object.freeze(issues);
}

const categoryLabels: Readonly<Record<string, string>> = Object.freeze({ ADAS: "Güvenlik destekleri", OCCUPANT_SAFETY: "Güvenlik destekleri", PARKING: "Park ve çevre görüşü", CABIN_COMFORT: "Konfor", ACCESS: "Konfor", CONNECTIVITY: "Bağlantı ve multimedya", LIGHTING: "Aydınlatma" });
export function createAuthorizedEquipmentCategoryOptions(units: readonly AuthorizedEquipmentExplanationUnit[]) {
  const categories = new Map<string, EquipmentFeatureCode[]>();
  for (const unit of units) if (unit.authorityType === "POST_REVEAL_CONFIRMED_EXPLANATION") {
    const category = dailyLife.entries.find((item) => item.featureCode === unit.featureCode)?.category; const label = category ? categoryLabels[category] : undefined;
    if (label) categories.set(label, [...(categories.get(label) ?? []), unit.featureCode]);
  }
  return Object.freeze([...categories].map(([label, featureCodes]) => Object.freeze({ label, featureCodes: Object.freeze(featureCodes) })));
}

export type VehicleSessionBinding = Readonly<{ conversationId: string; exactVariantId: string; offerId: string }>;
export type ExplanationSolicitationState = Readonly<VehicleSessionBinding & { scope: "CURRENT_VEHICLE_SESSION_ONLY"; offered: boolean; declined: boolean; accepted: boolean; expiresWithConversationOrOffer: true }>;
export function explanationSolicitationAppliesTo(state: ExplanationSolicitationState, binding: VehicleSessionBinding): boolean {
  return state.conversationId === binding.conversationId && state.exactVariantId === binding.exactVariantId && state.offerId === binding.offerId;
}
export function reduceExplanationSolicitation(state: ExplanationSolicitationState, action: "OFFER" | "ACCEPT" | "DECLINE") {
  if (action === "OFFER" && (state.offered || state.declined)) return Object.freeze({ state, offerAllowed: false, reasonCode: "REPEATED_SOLICITATION_FORBIDDEN" });
  const next = action === "OFFER" ? { ...state, offered: true } : action === "ACCEPT" ? { ...state, accepted: true } : { ...state, declined: true };
  return Object.freeze({ state: Object.freeze(next), offerAllowed: action === "OFFER", reasonCode: action === "OFFER" ? "POST_REVEAL_EXPLANATION_OFFER_ONLY" : "EXPLANATION_LAYER_RESPONSE_RECORDED" });
}

export type EquipmentPublicTelemetryEventType = "EXPLANATION_OFFERED" | "EXPLANATION_ACCEPTED" | "EXPLANATION_DECLINED";
export type EquipmentPublicTelemetryInput = Readonly<{ eventType: EquipmentPublicTelemetryEventType; outcome: "RECORDED" | "IGNORED" }>;
export type EquipmentPublicTelemetryPayload = Readonly<{ eventType: EquipmentPublicTelemetryEventType; outcome: "RECORDED" | "IGNORED"; scope: "CURRENT_VEHICLE_SESSION_ONLY" }>;
export function serializeEquipmentPublicTelemetry(input: EquipmentPublicTelemetryInput): EquipmentPublicTelemetryPayload {
  return Object.freeze({ eventType: input.eventType, outcome: input.outcome, scope: "CURRENT_VEHICLE_SESSION_ONLY" });
}
