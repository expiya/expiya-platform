import { createHash } from "node:crypto";

import catalogPointer from "@/data/production/catalog/active.json";
import { activeCatalogManifest, activeCatalogPayload, activeCatalogReleaseVersion } from "@/data/production/catalog/activeCatalog.generated";
import quarantineRegistry from "@/data/production/catalog/releases/v0.55.4/quarantine-registry.json";
import dailyLifePointer from "@/data/production/equipment-daily-life/active.json";
import { activeEquipmentDailyLifeManifest, activeEquipmentDailyLifePayload, activeEquipmentDailyLifeRelease } from "@/data/production/equipment-daily-life/activeEquipmentDailyLife.generated";
import equipmentPointer from "@/data/production/equipment-evidence/active.json";
import { activeEquipmentEvidenceManifest, activeEquipmentEvidencePayload, activeEquipmentEvidenceRelease } from "@/data/production/equipment-evidence/activeEquipmentEvidence.generated";
import { EQUIPMENT_FEATURE_CODES, type EquipmentAvailabilityStatus, type EquipmentProvisionMode, type EquipmentSourceApplicability, type EquipmentVerificationState } from "@/types/equipmentEvidence";
import type { EquipmentDailyLifeEntry, EquipmentDailyLifeLayer } from "@/types/equipmentDailyLife";

export type EquipmentDailyLifeDisposition =
  | "CONFIRMED_INCLUDED_EXPLANATION_ELIGIBLE" | "OPTIONAL_STOCK_CONFIRMATION_REQUIRED"
  | "PACKAGE_CONFIRMATION_REQUIRED" | "ASSOCIATION_PROVISION_UNRESOLVED" | "VERIFIED_NOT_AVAILABLE"
  | "LEGACY_PROVISION_UNRESOLVED" | "UNKNOWN_NO_CLAIM" | "CONFLICT_NO_CLAIM" | "INCOMPATIBLE_NO_CLAIM";

export type ShadowEvidence = Readonly<{
  exactVariantId: string; featureCode: string; availabilityStatus?: EquipmentAvailabilityStatus;
  provisionMode?: EquipmentProvisionMode; verificationState?: EquipmentVerificationState;
  conflictState?: "CLEAR" | "CONFLICTING" | "SUPERSEDED"; sourceApplicability?: EquipmentSourceApplicability;
  evidencePolarity?: "POSITIVE" | "NEGATIVE" | "UNRESOLVED"; negativeEvidenceReason?: string;
  packageName?: string; packageLinkVerified?: boolean; associationOnly?: boolean;
}>;

export type EquipmentDailyLifeShadowResult = Readonly<{
  exactVariantId: string; featureCode: string; disposition: EquipmentDailyLifeDisposition;
  evidenceAuthority: "SHADOW_AND_EXPLANATION_DISABLED"; availabilityStatus: EquipmentAvailabilityStatus | null;
  provisionMode: EquipmentProvisionMode | null; verificationState: EquipmentVerificationState | null;
  conflictState: "CLEAR" | "CONFLICTING" | "SUPERSEDED" | null; sourceApplicability: EquipmentSourceApplicability | null;
  dailyLifeEntryResolved: boolean; explanationEligible: boolean; publicClaimAllowed: false;
  confirmationRequired: "NONE" | "STOCK_OR_CONFIGURATION" | "PACKAGE" | "ASSOCIATION_PROVISION";
  controlledExplanation: string | null; caveat: string | null; reasonCodes: readonly string[];
  compatibleCatalogRelease: string; compatibleCatalogFingerprint: string; equipmentRelease: string; equipmentDailyLifeRelease: string;
}>;

export type EquipmentShadowContext = Readonly<{
  catalogRelease: string; catalogFingerprint: string; activeVariantIds: ReadonlySet<string>; quarantineVariantIds: ReadonlySet<string>;
  featureCodes: ReadonlySet<string>; equipmentRelease: string; expectedEquipmentRelease: string; equipmentCatalogRelease: string;
  equipmentCatalogFingerprint: string; equipmentPayloadChecksumValid: boolean; equipmentLifecycleAuthorityValid: boolean;
  dailyLifeRelease: string; expectedDailyLifeRelease: string; dailyLifeCatalogRelease: string; dailyLifeCatalogFingerprint: string;
  dailyLifePayloadChecksumValid: boolean; dailyLifeLifecycleAuthorityValid: boolean; dailyLifeEntries: ReadonlyMap<string, EquipmentDailyLifeEntry>;
  evidence: readonly ShadowEvidence[];
}>;

const sha = (value: unknown) => `sha256:${createHash("sha256").update(`${JSON.stringify(value, null, 2)}\n`).digest("hex")}`;
const freezeResult = (value: EquipmentDailyLifeShadowResult): EquipmentDailyLifeShadowResult => Object.freeze({ ...value, reasonCodes: Object.freeze([...value.reasonCodes]) });

const incompatibleReasons = (context: EquipmentShadowContext, exactVariantId: string, featureCode: string): string[] => {
  const reasons: string[] = [];
  if (context.catalogRelease !== context.equipmentCatalogRelease || context.catalogRelease !== context.dailyLifeCatalogRelease) reasons.push("CATALOG_RELEASE_MISMATCH");
  if (context.catalogFingerprint !== context.equipmentCatalogFingerprint || context.catalogFingerprint !== context.dailyLifeCatalogFingerprint) reasons.push("CATALOG_FINGERPRINT_MISMATCH");
  if (context.equipmentRelease !== context.expectedEquipmentRelease) reasons.push("EQUIPMENT_RELEASE_MISMATCH");
  if (context.dailyLifeRelease !== context.expectedDailyLifeRelease) reasons.push("EQUIPMENT_DAILY_LIFE_RELEASE_MISMATCH");
  if (!context.equipmentPayloadChecksumValid) reasons.push("EQUIPMENT_PAYLOAD_CHECKSUM_INVALID");
  if (!context.dailyLifePayloadChecksumValid) reasons.push("EQUIPMENT_DAILY_LIFE_PAYLOAD_CHECKSUM_INVALID");
  if (!context.equipmentLifecycleAuthorityValid || !context.dailyLifeLifecycleAuthorityValid) reasons.push("LIFECYCLE_AUTHORITY_INVALID");
  if (!context.featureCodes.has(featureCode) || context.featureCodes.size !== 51) reasons.push("FEATURE_VOCABULARY_INCOMPATIBLE");
  if (!context.activeVariantIds.has(exactVariantId)) reasons.push("EXACT_VARIANT_NOT_ACTIVE");
  if (context.quarantineVariantIds.has(exactVariantId)) reasons.push("EXACT_VARIANT_QUARANTINED");
  return reasons;
};

export function evaluateEquipmentDailyLifeShadow(context: EquipmentShadowContext, exactVariantId: string, featureCode: string): EquipmentDailyLifeShadowResult {
  const incompatible = incompatibleReasons(context, exactVariantId, featureCode);
  const entry = context.dailyLifeEntries.get(featureCode);
  const matching = context.evidence.filter((item) => item.exactVariantId === exactVariantId && item.featureCode === featureCode);
  const base = { exactVariantId, featureCode, evidenceAuthority: "SHADOW_AND_EXPLANATION_DISABLED" as const,
    compatibleCatalogRelease: context.catalogRelease, compatibleCatalogFingerprint: context.catalogFingerprint,
    equipmentRelease: context.equipmentRelease, equipmentDailyLifeRelease: context.dailyLifeRelease, publicClaimAllowed: false as const };
  if (incompatible.length) return freezeResult({ ...base, disposition: "INCOMPATIBLE_NO_CLAIM", availabilityStatus: null, provisionMode: null,
    verificationState: null, conflictState: null, sourceApplicability: null, dailyLifeEntryResolved: Boolean(entry), explanationEligible: false,
    confirmationRequired: "NONE", controlledExplanation: null, caveat: null, reasonCodes: incompatible });
  if (matching.length > 1) return freezeResult({ ...base, disposition: "CONFLICT_NO_CLAIM", availabilityStatus: null, provisionMode: null,
    verificationState: null, conflictState: "CONFLICTING", sourceApplicability: null, dailyLifeEntryResolved: Boolean(entry), explanationEligible: false,
    confirmationRequired: "NONE", controlledExplanation: null, caveat: null, reasonCodes: ["DUPLICATE_EVIDENCE"] });
  const evidence = matching[0];
  const common = { ...base, availabilityStatus: evidence?.availabilityStatus ?? null, provisionMode: evidence?.provisionMode ?? null,
    verificationState: evidence?.verificationState ?? null, conflictState: evidence?.conflictState ?? null,
    sourceApplicability: evidence?.sourceApplicability ?? null, dailyLifeEntryResolved: Boolean(entry) };
  const result = (disposition: EquipmentDailyLifeDisposition, reasonCodes: string[], confirmationRequired: EquipmentDailyLifeShadowResult["confirmationRequired"] = "NONE", eligible = false) =>
    freezeResult({ ...common, disposition, explanationEligible: eligible, publicClaimAllowed: false, confirmationRequired,
      controlledExplanation: eligible ? entry?.userFacingExplanation ?? null : null, caveat: eligible ? entry?.caveat ?? null : null, reasonCodes });
  if (!evidence) return result("UNKNOWN_NO_CLAIM", ["SILENT_ABSENCE_NO_NEGATIVE_INFERENCE"]);
  if (evidence.conflictState !== "CLEAR") return result("CONFLICT_NO_CLAIM", ["EVIDENCE_CONFLICT"]);
  if (evidence.associationOnly || evidence.sourceApplicability !== "EXACT_VARIANT") return result("ASSOCIATION_PROVISION_UNRESOLVED", ["EXACT_VARIANT_EVIDENCE_REQUIRED"], "ASSOCIATION_PROVISION");
  if (evidence.availabilityStatus === "NOT_AVAILABLE") {
    return evidence.verificationState === "VERIFIED" && evidence.evidencePolarity === "NEGATIVE" && Boolean(evidence.negativeEvidenceReason)
      ? result("VERIFIED_NOT_AVAILABLE", ["VERIFIED_EXPLICIT_NEGATIVE_EVIDENCE"])
      : result("UNKNOWN_NO_CLAIM", ["NEGATIVE_EVIDENCE_GATE_NOT_MET"]);
  }
  if (evidence.availabilityStatus === "OPTIONAL") return result("OPTIONAL_STOCK_CONFIRMATION_REQUIRED", ["OPTIONAL_IS_NOT_PRESENCE"], "STOCK_OR_CONFIGURATION");
  if (evidence.availabilityStatus === "PACKAGE_DEPENDENT") return result("PACKAGE_CONFIRMATION_REQUIRED",
    [evidence.packageLinkVerified && evidence.packageName ? "VERIFIED_PACKAGE_BOUND" : "PACKAGE_LINK_UNVERIFIED"], "PACKAGE");
  if (evidence.availabilityStatus === "STANDARD" && !evidence.provisionMode) return result("LEGACY_PROVISION_UNRESOLVED", ["LEGACY_PROVISION_MISSING"]);
  if (evidence.availabilityStatus === "STANDARD" && evidence.provisionMode === "INCLUDED" && evidence.verificationState === "VERIFIED"
    && evidence.sourceApplicability === "EXACT_VARIANT") {
    return entry ? result("CONFIRMED_INCLUDED_EXPLANATION_ELIGIBLE", ["CONFIRMED_PRESENCE_GATE_MET", "OWNER_EDITORIAL_ENTRY_RESOLVED"], "NONE", true)
      : result("UNKNOWN_NO_CLAIM", ["DAILY_LIFE_ENTRY_MISSING"]);
  }
  return result("UNKNOWN_NO_CLAIM", ["CONFIRMED_PRESENCE_GATE_NOT_MET"]);
}

export const evaluateEquipmentDailyLifeFeatureList = (context: EquipmentShadowContext, exactVariantId: string, featureCodes: readonly string[]) =>
  Object.freeze(featureCodes.map((featureCode) => evaluateEquipmentDailyLifeShadow(context, exactVariantId, featureCode)));

export const evaluateEquipmentDailyLifeCandidates = (context: EquipmentShadowContext, exactVariantIds: readonly string[], featureCodes: readonly string[]) =>
  Object.freeze(exactVariantIds.map((exactVariantId) => Object.freeze({ exactVariantId, diagnostics: evaluateEquipmentDailyLifeFeatureList(context, exactVariantId, featureCodes) })));

type ActiveEvidencePayload = { decisionAuthority: string; verifiedAssertions: Array<Record<string, unknown>>; reviewedAssociations: Array<Record<string, unknown>> };
export function loadActiveEquipmentDailyLifeShadowContext(): EquipmentShadowContext {
  const payload = activeEquipmentEvidencePayload as ActiveEvidencePayload;
  const evidence: ShadowEvidence[] = [
    ...payload.verifiedAssertions.map((item) => ({ exactVariantId: String(item.exactVariantId), featureCode: String(item.featureCode),
      availabilityStatus: item.availabilityStatus as EquipmentAvailabilityStatus, provisionMode: item.provisionMode as EquipmentProvisionMode | undefined,
      verificationState: item.verificationState as EquipmentVerificationState, conflictState: (item.conflictState as ShadowEvidence["conflictState"]) ?? "CLEAR",
      sourceApplicability: "EXACT_VARIANT" as const, evidencePolarity: (item.availabilityStatus === "NOT_AVAILABLE" ? "NEGATIVE" : "POSITIVE") as "NEGATIVE" | "POSITIVE",
      negativeEvidenceReason: (item.negativeEvidenceReason as string | undefined) ?? (item.availabilityStatus === "NOT_AVAILABLE" ? "MATERIALIZED_VERIFIED_NOT_AVAILABLE" : undefined), packageName: item.packageName as string | undefined,
      packageLinkVerified: item.packageLinkVerified as boolean | undefined })),
    ...payload.reviewedAssociations.map((item) => ({ exactVariantId: String(item.exactVariantId), featureCode: String(item.featureCode),
      verificationState: "PROVISIONAL" as const, conflictState: (item.conflictState as ShadowEvidence["conflictState"]) ?? "CLEAR", sourceApplicability: "EXACT_TRIM" as const, associationOnly: true })),
  ];
  const daily = activeEquipmentDailyLifePayload as EquipmentDailyLifeLayer;
  const catalog = activeCatalogPayload as { records: Array<{ variant: { id: string } }> };
  const catalogManifest = activeCatalogManifest as { catalog_payload_hash: string; approval: { state: string } };
  const equipmentManifest = activeEquipmentEvidenceManifest as { payloadSha256: string; compatibleCatalogRelease: string; compatibleCatalogFingerprint: string; releaseVersion: string };
  const dailyManifest = activeEquipmentDailyLifeManifest as { payloadSha256: string; compatibleCatalogRelease: string; compatibleCatalogFingerprint: string; releaseId: string; ownerApprovalEventId?: string };
  return Object.freeze({ catalogRelease: `v${activeCatalogReleaseVersion}`, catalogFingerprint: catalogManifest.catalog_payload_hash,
    activeVariantIds: new Set(catalog.records.map((item) => item.variant.id)), quarantineVariantIds: new Set(quarantineRegistry.records.map((item) => item.exactVariantId)),
    featureCodes: new Set(EQUIPMENT_FEATURE_CODES), equipmentRelease: activeEquipmentEvidenceRelease, expectedEquipmentRelease: equipmentPointer.activeEquipmentEvidenceRelease,
    equipmentCatalogRelease: equipmentManifest.compatibleCatalogRelease, equipmentCatalogFingerprint: equipmentManifest.compatibleCatalogFingerprint,
    equipmentPayloadChecksumValid: sha(activeEquipmentEvidencePayload) === equipmentManifest.payloadSha256 && equipmentPointer.payloadSha256 === equipmentManifest.payloadSha256,
    equipmentLifecycleAuthorityValid: equipmentPointer.state === "ACTIVE" && payload.decisionAuthority === "SHADOW_AND_EXPLANATION_DISABLED" && catalogPointer.state === "ACTIVE" && catalogManifest.approval.state === "APPROVED",
    dailyLifeRelease: activeEquipmentDailyLifeRelease, expectedDailyLifeRelease: dailyLifePointer.activeEquipmentDailyLifeRelease,
    dailyLifeCatalogRelease: dailyManifest.compatibleCatalogRelease, dailyLifeCatalogFingerprint: dailyManifest.compatibleCatalogFingerprint,
    dailyLifePayloadChecksumValid: sha(activeEquipmentDailyLifePayload) === dailyManifest.payloadSha256 && dailyLifePointer.payloadSha256 === dailyManifest.payloadSha256,
    dailyLifeLifecycleAuthorityValid: dailyLifePointer.state === "ACTIVE" && dailyLifePointer.runtimeAuthority === "EXPLANATION_ONLY" && Boolean(dailyManifest.ownerApprovalEventId),
    dailyLifeEntries: new Map(daily.entries.map((entry) => [entry.featureCode, entry])), evidence });
}

export function summarizeEquipmentDailyLifeShadow(context: EquipmentShadowContext) {
  const results = evaluateEquipmentDailyLifeCandidates(context, [...context.activeVariantIds], [...context.featureCodes]).flatMap((item) => item.diagnostics);
  return Object.freeze(results.reduce<Record<EquipmentDailyLifeDisposition, number>>((counts, result) => { counts[result.disposition] += 1; return counts; },
    { CONFIRMED_INCLUDED_EXPLANATION_ELIGIBLE: 0, OPTIONAL_STOCK_CONFIRMATION_REQUIRED: 0, PACKAGE_CONFIRMATION_REQUIRED: 0,
      ASSOCIATION_PROVISION_UNRESOLVED: 0, VERIFIED_NOT_AVAILABLE: 0, LEGACY_PROVISION_UNRESOLVED: 0, UNKNOWN_NO_CLAIM: 0,
      CONFLICT_NO_CLAIM: 0, INCOMPATIBLE_NO_CLAIM: 0 }));
}

export type EquipmentDecisionNeutralitySnapshot = Readonly<{
  eligibleCandidateIds: readonly string[]; rankedCandidateIds: readonly string[]; readiness: unknown; selectedQuestion: unknown;
  action: unknown; offerCandidateIds: readonly string[]; consentLifecycle: unknown; revealedCardIds: readonly string[];
  publicMessage: string; publicAuthorizedFacts: unknown;
}>;

export function compareEquipmentShadowOnOff(input: Readonly<{ decision: EquipmentDecisionNeutralitySnapshot; context: EquipmentShadowContext;
  candidateIds: readonly string[]; featureCodes: readonly string[] }>) {
  const off = JSON.stringify(input.decision);
  const diagnostics = evaluateEquipmentDailyLifeCandidates(input.context, input.candidateIds, input.featureCodes);
  const on = JSON.stringify(input.decision);
  return Object.freeze({ equivalent: off === on, off, on, diagnostics });
}
