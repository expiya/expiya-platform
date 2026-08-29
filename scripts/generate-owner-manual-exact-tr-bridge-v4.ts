import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { canonicalJson } from "../features/automotive-knowledge/canonical";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "data/research/owner-manual-evidence-v4");
const CATALOG_RELEASE = "v0.55.4";
const CATALOG_FINGERPRINT = "sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9";
const GENERATED_AT = "2026-08-26T00:00:00.000Z";
const EVIDENCE_PATH = "data/production/equipment-evidence/releases/v1.5.5-catalog-v0.55.4-2026-08-20/equipment-evidence.json";
const readJson = async <T>(relativePath: string): Promise<T> => JSON.parse(await readFile(path.join(ROOT, relativePath), "utf8")) as T;
const sha256 = (bytes: string | Buffer): `sha256:${string}` => `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
const stableId = (prefix: string, ...parts: string[]) => `${prefix}-${createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 20).toUpperCase()}`;
const writeCanonical = async (name: string, value: unknown) => writeFile(path.join(OUT, name), `${canonicalJson(value)}\n`, "utf8");

type Family = { brand: string; modelFamily: string; exactVariantIds: string[]; modelYears: number[]; candidateFeatureCodes: string[]; artifactSourceIds: string[]; currentAuthority: "MODEL_FAMILY_CAPABILITY" | "NONE"; bridgeStatus: string };
type Verified = { exactVariantId: string; featureCode: string; availabilityStatus: string; confidence: string; verificationState: string; materializedAt: string; materializationId: string; sourceAssertionId: string; sourceAssertionFingerprint: `sha256:${string}`; semanticMappingId: string; marketApplicability: string; modelYearApplicability: { from: number; to: number }; rawSourceReferences: Array<{ sourceId: string; artifactReference: string; artifactSha256: `sha256:${string}` }>; derivedArtifactReferences: Array<{ artifactReference: string; artifactSha256: `sha256:${string}`; extractionPolicyId: string; extractionPolicyVersion: string }> };
type Evidence = { releaseVersion: string; compatibleCatalogRelease: string; compatibleCatalogFingerprint: string; verifiedAssertions: Verified[] };

async function main(): Promise<void> {
const handoffPath = "data/research/owner-manual-evidence-v4/catalog-exact-tr-bridge-handoff.json";
const pilotPath = "data/research/owner-manual-evidence-v4/pilot-assertions.json";
const handoff = await readJson<{ catalogRelease: string; catalogFingerprint: string; families: Family[] }>(handoffPath);
const pilot = await readJson<{ assertions: Array<{ sourceId: string; featureCode: string; applicability: { modelFamily: string } }> }>(pilotPath);
const evidence = await readJson<Evidence>(EVIDENCE_PATH);
if (handoff.catalogRelease !== CATALOG_RELEASE || handoff.catalogFingerprint !== CATALOG_FINGERPRINT) throw new Error("OWNER_MANUAL_CATALOG_FINGERPRINT_MISMATCH");
if (evidence.compatibleCatalogRelease !== CATALOG_RELEASE || evidence.compatibleCatalogFingerprint !== CATALOG_FINGERPRINT) throw new Error("EQUIPMENT_EVIDENCE_CATALOG_FINGERPRINT_MISMATCH");

const familyByVariant = new Map(handoff.families.flatMap((family) => family.exactVariantIds.map((id) => [id, family] as const)));
if (familyByVariant.size !== 549) throw new Error("EXACT_VARIANT_CARDINALITY_MISMATCH");
const exactByPair = new Map(evidence.verifiedAssertions.map((assertion) => [`${assertion.exactVariantId}|${assertion.featureCode}`, assertion]));
const sourceReleaseSha256 = sha256(await readFile(path.join(ROOT, EVIDENCE_PATH)));

const variants = [...familyByVariant.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([exactVariantId, family]) => {
  const familyAssertions = pilot.assertions.filter((assertion) => assertion.applicability.modelFamily === family.modelFamily);
  const decisions = [...new Set(family.candidateFeatureCodes)].sort().map((featureCode) => {
    const verified = exactByPair.get(`${exactVariantId}|${featureCode}`);
    if (verified && verified.rawSourceReferences?.[0] && verified.marketApplicability === "TR" && verified.verificationState === "VERIFIED") {
      const raw = verified.rawSourceReferences[0];
      return { decisionId: stableId("OM-TR-BRIDGE", exactVariantId, featureCode), exactVariantId, featureCode, decision: "EXACT_VARIANT_VERIFIED", normalizedValue: verified.availabilityStatus !== "NOT_AVAILABLE", polarity: verified.availabilityStatus === "NOT_AVAILABLE" ? "NEGATIVE" : "POSITIVE", confidence: verified.confidence, market: "TR", modelYearFrom: verified.modelYearApplicability.from, modelYearTo: verified.modelYearApplicability.to, trimOrPackage: "BOUND_BY_VERIFIED_TRIM_LINK_IN_EQUIPMENT_EVIDENCE_RELEASE", observedAt: verified.materializedAt, effectiveAt: verified.materializedAt, source: { sourceType: "CHECKSUM_BOUND_VERIFIED_EQUIPMENT_ASSERTION", sourceId: raw.sourceId, artifactReference: raw.artifactReference, artifactSha256: raw.artifactSha256, locator: { kind: "STRUCTURED_RECORD", value: `$.verifiedAssertions[sourceAssertionId=${verified.sourceAssertionId}]` }, sourceAssertionId: verified.sourceAssertionId, sourceAssertionFingerprint: verified.sourceAssertionFingerprint, materializationId: verified.materializationId, semanticMappingId: verified.semanticMappingId, derivedArtifacts: verified.derivedArtifactReferences }, authoritySourceRelease: evidence.releaseVersion, authoritySourceReleaseSha256: sourceReleaseSha256, familyInheritance: false, conditionalPromotedToStandard: false, missingMentionTreatedAsNegative: false };
    }
    const retainedFamilyEvidence = familyAssertions.filter((assertion) => assertion.featureCode === featureCode).map((assertion) => assertion.sourceId).sort();
    return { decisionId: stableId("OM-TR-BRIDGE", exactVariantId, featureCode), exactVariantId, featureCode, decision: "RESEARCHED_INCONCLUSIVE", polarity: "UNRESOLVED", confidence: "LOW", market: "TR", modelYears: family.modelYears, trimOrPackage: "UNRESOLVED", observedAt: GENERATED_AT, source: null, retainedFamilyEvidence, reasonCodes: retainedFamilyEvidence.length ? ["FAMILY_CAPABILITY_NOT_EXACT_TRIM_AUTHORITY", "EXACT_TR_SOURCE_NOT_AVAILABLE_IN_BOUND_INPUTS"] : ["NO_CANDIDATE_FAMILY_ASSERTION", "EXACT_TR_SOURCE_NOT_AVAILABLE_IN_BOUND_INPUTS"], familyInheritance: false, conditionalPromotedToStandard: false, missingMentionTreatedAsNegative: false };
  });
  const exactDecisionCount = decisions.filter((decision) => decision.decision === "EXACT_VARIANT_VERIFIED").length;
  return { exactVariantId, brand: family.brand, modelFamily: family.modelFamily, modelYears: family.modelYears, bridgeStatus: exactDecisionCount ? "PARTIALLY_EXACT_VARIANT_VERIFIED" : "RESEARCHED_INCONCLUSIVE", familyCapabilityRetained: family.currentAuthority === "MODEL_FAMILY_CAPABILITY", familyArtifactSourceIds: family.artifactSourceIds, decisions };
});

const all = variants.flatMap((variant) => variant.decisions);
const exact = all.filter((decision) => decision.decision === "EXACT_VARIANT_VERIFIED");
const unresolved = all.filter((decision) => decision.decision === "RESEARCHED_INCONCLUSIVE");
const exactVariantIds = new Set(exact.map((decision) => decision.exactVariantId));
const resultCore = { schemaVersion: "4.0.0-exact-tr-bridge.1", generatedAt: GENERATED_AT, catalogRelease: CATALOG_RELEASE, catalogFingerprint: CATALOG_FINGERPRINT, authorityPolicy: "OWNER_MANUAL_EXACT_TR_BRIDGE_V4_FAIL_CLOSED", sourceBindings: { handoff: { path: handoffPath, sha256: sha256(await readFile(path.join(ROOT, handoffPath))) }, pilotAssertions: { path: pilotPath, sha256: sha256(await readFile(path.join(ROOT, pilotPath))) }, equipmentEvidence: { path: EVIDENCE_PATH, release: evidence.releaseVersion, sha256: sourceReleaseSha256 } }, variants };
const result = { ...resultCore, contentSha256: sha256(canonicalJson(resultCore)) };
const featureCoverage = [...new Set(all.map((decision) => decision.featureCode))].sort().map((featureCode) => ({ featureCode, exactVerified: exact.filter((decision) => decision.featureCode === featureCode).length, unresolved: unresolved.filter((decision) => decision.featureCode === featureCode).length }));
const report = { schemaVersion: "4.0.0-exact-tr-bridge-report.1", generatedAt: GENERATED_AT, catalogRelease: CATALOG_RELEASE, catalogFingerprint: CATALOG_FINGERPRINT, resultContentSha256: result.contentSha256, counts: { exactVariants: variants.length, exactVariantsWithVerifiedAssertions: exactVariantIds.size, familyCapabilityOnlyVariants: variants.filter((variant) => variant.familyCapabilityRetained && !exactVariantIds.has(variant.exactVariantId)).length, unresolvedVariants: variants.filter((variant) => variant.bridgeStatus === "RESEARCHED_INCONCLUSIVE").length, candidateFeatureDecisions: all.length, exactVerifiedDecisions: exact.length, modelYearTrimApplicabilityDecisions: 0, unresolvedDecisions: unresolved.length, negativeExactDecisions: exact.filter((decision) => decision.polarity === "NEGATIVE").length, conflicts: 0 }, featureCoverage, sourceIssues: { accessReviewFamilies: handoff.families.filter((family) => family.bridgeStatus === "ACCESS_REVIEW_REQUIRED").length, rule: "No network acquisition was performed; only checksum-bound canonical repository evidence was eligible." }, decisionNeutrality: { filtering: false, ranking: false, questionGeneration: false, activation: false, productionPointerChanged: false } };

await mkdir(OUT, { recursive: true });
await writeCanonical("exact-tr-bridge-decisions.json", result);
await writeCanonical("exact-tr-bridge-report.json", report);
await writeCanonical("exact-tr-bridge-manifest.json", { schemaVersion: "4.0.0-exact-tr-bridge-manifest.1", generatedAt: GENERATED_AT, catalogRelease: CATALOG_RELEASE, catalogFingerprint: CATALOG_FINGERPRINT, files: [{ path: "exact-tr-bridge-decisions.json", sha256: sha256(`${canonicalJson(result)}\n`) }, { path: "exact-tr-bridge-report.json", sha256: sha256(`${canonicalJson(report)}\n`) }], activationPerformed: false, productionPointerChanged: false, decisionEngineEffect: "ZERO" });
}

void main();
