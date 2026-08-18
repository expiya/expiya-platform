import activePointer from "@/data/production/equipment-evidence/active.json";
import { activeEquipmentEvidenceManifest, activeEquipmentEvidencePayload, activeEquipmentEvidenceRelease } from "@/data/production/equipment-evidence/activeEquipmentEvidence.generated";
import type { EquipmentEvidenceLayer, EquipmentEvidenceManifest, EquipmentFeatureCode, EquipmentIntentMatch, ExactVariantEquipmentProjection } from "@/types/equipmentEvidence";
import { parseEquipmentEvidenceLayer, parseEquipmentEvidenceManifest } from "./equipmentEvidenceSchema";

type PilotVerifiedCandidate = {
  readonly schemaVersion: "1.0.0-rc"; readonly releaseCandidateId: string; readonly state: "PILOT_VERIFIED_DATA";
  readonly compatibleCatalogRelease: `v${number}.${number}.${number}`; readonly compatibleCatalogFingerprint: `sha256:${string}`;
  readonly generatedAt: string; readonly decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED";
  readonly featureDefinitions: EquipmentEvidenceLayer["featureDefinitions"]; readonly intentAliases: EquipmentEvidenceLayer["intentAliases"];
  readonly verifiedAssertions: readonly unknown[]; readonly verifiedTrimLinks: readonly unknown[]; readonly projections: readonly unknown[];
  readonly coverage: { readonly coveredExactVariantCount: number; readonly uncoveredExactVariantCount: number };
  readonly decisionControls: { readonly hardFilter: false; readonly hardFilterAfterConfirmation: false; readonly softRanking: false; readonly questionGeneration: false; readonly userFacingExplanation: false; readonly candidateResurrection: "FORBIDDEN"; readonly candidateElimination: "FORBIDDEN"; readonly offerOrderingImpact: "NONE" };
};
const isPilotVerifiedCandidate = (value: unknown): value is PilotVerifiedCandidate => {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PilotVerifiedCandidate>;
  return item.schemaVersion === "1.0.0-rc" && item.state === "PILOT_VERIFIED_DATA" && item.decisionAuthority === "SHADOW_AND_EXPLANATION_DISABLED"
    && Array.isArray(item.featureDefinitions) && item.featureDefinitions.length === 51 && Array.isArray(item.intentAliases)
    && Array.isArray(item.verifiedAssertions) && item.verifiedAssertions.length === 47 && Array.isArray(item.verifiedTrimLinks) && item.verifiedTrimLinks.length === 2
    && item.coverage?.coveredExactVariantCount === 2 && item.coverage.uncoveredExactVariantCount === 564
    && item.decisionControls?.hardFilter === false && item.decisionControls.hardFilterAfterConfirmation === false && item.decisionControls.softRanking === false
    && item.decisionControls.questionGeneration === false && item.decisionControls.userFacingExplanation === false
    && item.decisionControls.candidateElimination === "FORBIDDEN" && item.decisionControls.candidateResurrection === "FORBIDDEN";
};
const candidate = isPilotVerifiedCandidate(activeEquipmentEvidencePayload) ? activeEquipmentEvidencePayload : undefined;
const layer = candidate ? {
  schemaVersion: "1.2.1", releaseVersion: candidate.releaseCandidateId, compatibleCatalogRelease: candidate.compatibleCatalogRelease,
  compatibleCatalogFingerprint: candidate.compatibleCatalogFingerprint, market: "TR", vocabularyVersion: "1.1.0", cohortPolicyVersion: "1.0.0",
  collectionProtocolVersion: "1.0.1", canonicalIdentityPolicyVersion: "1.0.0", state: "PILOT_VERIFIED_DATA", generatedAt: candidate.generatedAt,
  featureDefinitions: candidate.featureDefinitions, intentAliases: candidate.intentAliases, assertions: [], packageVariantLinks: [], trimVariantLinks: [],
  researchLedger: [], reviewEvents: [], projections: [],
} as EquipmentEvidenceLayer : parseEquipmentEvidenceLayer(activeEquipmentEvidencePayload);
const manifest = parseEquipmentEvidenceManifest(activeEquipmentEvidenceManifest);

export function loadActiveEquipmentEvidenceLayer(): Readonly<{ layer: EquipmentEvidenceLayer; manifest: EquipmentEvidenceManifest; release: string }> {
  return Object.freeze({ layer, manifest, release: activeEquipmentEvidenceRelease });
}
export const getEquipmentFeatureDefinition = (featureCode: EquipmentFeatureCode) => layer.featureDefinitions.find((item) => item.featureCode === featureCode);
export const getVariantEquipmentProjection = (exactVariantId: string, featureCode: EquipmentFeatureCode): ExactVariantEquipmentProjection | undefined => layer.projections.find((item) => item.exactVariantId === exactVariantId && item.featureCode === featureCode);
export const getVariantEquipmentFeatures = (exactVariantId: string): readonly ExactVariantEquipmentProjection[] => layer.projections.filter((item) => item.exactVariantId === exactVariantId);
export function loadActiveEquipmentEvidenceStatus() {
  return Object.freeze(candidate ? {
    state: candidate.state, catalogCompatibility: "READY" as const, verifiedAssertionCount: candidate.verifiedAssertions.length,
    verifiedTrimLinkCount: candidate.verifiedTrimLinks.length, coveredExactVariantCount: candidate.coverage.coveredExactVariantCount,
    uncoveredExactVariantCount: candidate.coverage.uncoveredExactVariantCount, decisionAuthority: candidate.decisionAuthority,
    hardFilterEligible: false, hardFilterAfterConfirmation: false, softPreferenceEnabled: false, questionGenerationEnabled: false,
    userExplanationEnabled: false, candidateEliminationEnabled: false, candidateResurrectionEnabled: false,
  } : {
    state: layer.state, catalogCompatibility: "READY" as const, verifiedAssertionCount: layer.assertions.filter((item) => item.verificationState === "VERIFIED").length,
    verifiedTrimLinkCount: layer.trimVariantLinks.filter((item) => item.verificationState === "VERIFIED").length,
    coveredExactVariantCount: new Set(layer.projections.map((item) => item.exactVariantId)).size, uncoveredExactVariantCount: 0,
    decisionAuthority: "LEGACY_NO_ACTIVE_PILOT_AUTHORITY", hardFilterEligible: false, hardFilterAfterConfirmation: false,
    softPreferenceEnabled: false, questionGenerationEnabled: false, userExplanationEnabled: false, candidateEliminationEnabled: false, candidateResurrectionEnabled: false,
  });
}

const normalize = (value: string) => value.toLocaleLowerCase("tr-TR").normalize("NFKD").replaceAll(/\p{M}/gu, "").replaceAll("ı", "i").replaceAll(/[^a-z0-9]+/gu, " ").trim();
const negation = /(?:\b(?:olmasin|istemiyorum|istemem|olmasin|gerekmiyor|gerek yok)\b)/u;
export function resolveEquipmentRequirement(input: string): readonly EquipmentIntentMatch[] {
  const normalized = ` ${normalize(input)} `;
  const matches: EquipmentIntentMatch[] = [];
  for (const alias of layer.intentAliases) for (const rawPhrase of alias.normalizedPhrases) {
    const phrase = normalize(rawPhrase);
    if (!normalized.includes(` ${phrase} `)) continue;
    const phraseAt = normalized.indexOf(` ${phrase} `);
    const context = normalized.slice(Math.max(0, phraseAt - 30), phraseAt + phrase.length + 32);
    const polarity = negation.test(context) ? "NEGATED" : alias.ambiguityClass === "GENERIC_NOT_BINDABLE" ? "UNCERTAIN" : "AFFIRMED";
    matches.push({ aliasId: alias.aliasId, featureCode: alias.featureCode, ambiguityClass: alias.ambiguityClass, polarity,
      requiresConfirmation: polarity !== "AFFIRMED" || alias.ambiguityClass !== "DIRECT", matchedPhrase: rawPhrase });
    break;
  }
  return matches;
}

export function assertActiveEquipmentEvidenceCompatibility(): void {
  if (activePointer.state !== "ACTIVE" || activePointer.activeEquipmentEvidenceRelease !== activeEquipmentEvidenceRelease
    || activePointer.compatibleCatalogRelease !== layer.compatibleCatalogRelease
    || activePointer.compatibleCatalogFingerprint !== layer.compatibleCatalogFingerprint
    || manifest.releaseVersion !== activeEquipmentEvidenceRelease || manifest.payloadSha256 !== activePointer.payloadSha256) {
    throw new Error("ACTIVE_EQUIPMENT_EVIDENCE_POINTER_MISMATCH");
  }
}
