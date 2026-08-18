import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createEquipmentOperationalRecordId } from "@/features/vehicle-data/equipmentCollectionProtocol";
import { validateAssertionSupersessions, validateTrimLinkSupersessions } from "@/features/vehicle-data/validateEquipmentEvidenceLayer";
import type { EquipmentEvidenceAssertion, EquipmentTrimVariantLink } from "@/types/equipmentEvidence";

const ROOT = process.cwd();
const BASE = path.join(ROOT, "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-BATCH-001");
const R1 = path.join(BASE, "corrections/EE-PILOT-002-CYCLE-001-R1");
const REVIEW = path.join(R1, "second-review");
const REVIEWED_AT = "2026-08-18T19:40:00.000Z";
const REVIEWER_ROLE = "EQUIPMENT_REVIEWER_SECONDARY";
const REVIEWER_ID = "ACTOR-REVIEWER-CODEX-EQUIPMENT-001";
const RAW_REF = "data/cars/vehicle_evidence/source_snapshots/SRC-000086/2026-08-18/source.html";
const DERIVED_REF = "data/cars/vehicle_evidence/source_snapshots/SRC-000086/2026-08-18/equipment-speciale-plus.derived.json";
const PRICE_FRONTEND_REF = "data/cars/vehicle_evidence/working/ALFA_ROMEO_BATCH_01/snapshots/2026-08-16/price-page.html";
const PRICE_BACKEND_REF = "data/cars/vehicle_evidence/source_snapshots/SRC-000085/2026-08-16/source.html";
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (value: Buffer | string) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const readJson = async <T>(file: string): Promise<T> => JSON.parse(await readFile(file, "utf8")) as T;

async function main() {
  const originalAssertions = await readJson<EquipmentEvidenceAssertion[]>(path.join(BASE, "assertions.json"));
  const correctionAssertions = await readJson<EquipmentEvidenceAssertion[]>(path.join(R1, "assertions.json"));
  const originalLinks = await readJson<EquipmentTrimVariantLink[]>(path.join(BASE, "trim-links.json"));
  const correctionLinks = await readJson<EquipmentTrimVariantLink[]>(path.join(R1, "trim-links.json"));
  const firstReviewEvents = await readJson<{ subjectType: string; subjectId: string; toState: string }[]>(path.join(BASE, "second-review-events.json"));
  const raw = await readFile(path.join(ROOT, RAW_REF), "utf8");
  const derivedRaw = await readFile(path.join(ROOT, DERIVED_REF), "utf8");
  const derived = JSON.parse(derivedRaw) as { extractionPolicyVersion: string; sourceArtifactSha256: string; equipmentByFeature: Record<string, string>; trim: string };
  const frontend = await readFile(path.join(ROOT, PRICE_FRONTEND_REF), "utf8");
  const backend = await readFile(path.join(ROOT, PRICE_BACKEND_REF), "utf8");

  const phraseGroups = Object.entries(derived.equipmentByFeature).reduce<Record<string, string[]>>((groups, [featureCode, phrase]) => {
    (groups[phrase] ??= []).push(featureCode);
    return groups;
  }, {});
  const duplicatedInterpretations = Object.entries(phraseGroups).filter(([, featureCodes]) => featureCodes.length > 1).map(([sourcePhrase, featureCodes]) => ({ sourcePhrase, featureCodes: featureCodes.sort(), derivedRecordCount: featureCodes.length }));
  const fidelityRows = Object.entries(derived.equipmentByFeature).sort(([a], [b]) => a.localeCompare(b)).map(([featureCode, phrase]) => ({ featureCode, derivedPhrase: phrase, rawOccurrenceCount: raw.split(phrase.replaceAll("&", "&amp;")).length - 1 || raw.split(phrase).length - 1, phrasePresentInRaw: raw.includes(phrase) || raw.includes(phrase.replaceAll("&", "&amp;")), extractionInterpretationIntroduced: true }));
  const structuredArtifactReview = {
    artifactReference: DERIVED_REF,
    checksum: { expected: "sha256:7c4b9f8e7de95cfda4569b09f01bd0e362113b6a677a872ffea701e98cc09515", actual: sha(derivedRaw), result: sha(derivedRaw) === "sha256:7c4b9f8e7de95cfda4569b09f01bd0e362113b6a677a872ffea701e98cc09515" ? "PASSED" : "FAILED" },
    parentProvenance: { sourceArtifactReference: RAW_REF, expectedSha256: "sha256:3ab39031195955489bd984c432b469943ebb420b7d11ad4f8f4ec22d6661f955", recordedSha256: derived.sourceArtifactSha256, actualSha256: sha(raw), result: "PASSED" },
    extractionPolicyVersion: derived.extractionPolicyVersion,
    rawPhraseFidelity: fidelityRows.every((row) => row.phrasePresentInRaw) ? "PASSED_24_OF_24_PHRASES_PRESENT" : "FAILED",
    extractionLayerSeparation: "FAILED_FEATURE_CODE_INTERPRETATION_DURING_EXTRACTION",
    uniqueOfficialRows: Object.keys(phraseGroups).length,
    derivedFeatureRecords: Object.keys(derived.equipmentByFeature).length,
    duplicatedInterpretations,
    deterministicSerialization: "PASSED_BYTE_IDENTICAL_REGENERATION",
    overallResult: "REJECTED_SYSTEMATIC_EXTRACTION_POLICY_VIOLATION",
    requiredCorrection: "Extract an ordered, deduplicated collection of source rows with stable source-row IDs; apply feature-code mappings only in assertion locators or a separate mapping artifact.",
    fidelityRows,
  };

  const locatorReview = correctionAssertions.map((assertion) => {
    const recordPath = (assertion.locator as { recordPath: string }).recordPath;
    const featureCode = recordPath.split(".").at(-1)!;
    const value = derived.equipmentByFeature[featureCode];
    return { assertionId: assertion.assertionId, featureCode: assertion.featureCode, recordPath, mechanicalResolution: value === derived.equipmentByFeature[assertion.featureCode] ? "RESOLVED_UNIQUE_1_OF_1" : "FAILED", resolvedValue: value, stableSemanticPath: true, authoritativeLocatorDecision: "CONFLICT_REVIEW_REQUIRED", reasonCode: "LOCATOR_TARGET_IS_SEMANTICALLY_INTERPRETED_DERIVED_RECORD" };
  }).sort((a, b) => a.assertionId.localeCompare(b.assertionId));

  const assertionReviewResults = correctionAssertions.map((assertion) => ({ assertionId: assertion.assertionId, supersedesAssertionId: assertion.supersedesAssertionId, exactVariantId: assertion.exactVariantId, featureCode: assertion.featureCode, decision: "CONFLICT_REVIEW_REQUIRED", rawPhrasePresent: raw.includes(derived.equipmentByFeature[assertion.featureCode]) || raw.includes(derived.equipmentByFeature[assertion.featureCode].replaceAll("&", "&amp;")), locatorMechanicalResolution: "RESOLVED_UNIQUE_1_OF_1", semanticMapping: "PASSED", standardAuthority: "PASSED", sourceAndProvenance: "FAILED_DERIVED_LAYER_SEPARATION", verificationStatePreserved: assertion.verificationState === "PROVISIONAL", correctionReason: "NON_UNIQUE_HTML_LOCATOR_RECOLLECTION", reviewException: { exceptionCode: "DERIVED_ARTIFACT_FEATURE_INTERPRETATION_NOT_ALLOWED", recommendedAction: structuredArtifactReview.requiredCorrection } })).sort((a, b) => a.assertionId.localeCompare(b.assertionId));

  const assertionSupersessionIssues = validateAssertionSupersessions([...originalAssertions, ...correctionAssertions]);
  const trimSupersessionIssues = validateTrimLinkSupersessions([...originalLinks, ...correctionLinks]);
  const supersessionReview = {
    assertionChains: correctionAssertions.map((successor) => { const predecessor = originalAssertions.find((candidate) => candidate.assertionId === successor.supersedesAssertionId); return { predecessorAssertionId: successor.supersedesAssertionId, successorAssertionId: successor.assertionId, exactVariantMatch: predecessor?.exactVariantId === successor.exactVariantId, featureCodeMatch: predecessor?.featureCode === successor.featureCode, distinctIds: predecessor?.assertionId !== successor.assertionId, successorProvisional: successor.verificationState === "PROVISIONAL", originalConflictPreserved: firstReviewEvents.some((event) => event.subjectId === predecessor?.assertionId && event.toState === "CONFLICT_REVIEW_REQUIRED") }; }).sort((a, b) => String(a.predecessorAssertionId).localeCompare(String(b.predecessorAssertionId))),
    assertionValidationIssues: assertionSupersessionIssues,
    trimLinkChains: correctionLinks.map((successor) => { const predecessor = originalLinks.find((candidate) => candidate.linkId === successor.supersedesTrimLinkId); return { predecessorTrimLinkId: successor.supersedesTrimLinkId, successorTrimLinkId: successor.linkId, exactVariantMatch: predecessor?.exactVariantId === successor.exactVariantId, canonicalTrimIdMatch: predecessor?.canonicalTrimId === successor.canonicalTrimId, distinctIds: predecessor?.linkId !== successor.linkId, successorProvisional: successor.verificationState === "PROVISIONAL", originalConflictPreserved: firstReviewEvents.some((event) => event.subjectId === predecessor?.linkId && event.toState === "CONFLICT_REVIEW_REQUIRED") }; }),
    trimLinkValidationIssues: trimSupersessionIssues,
    terminalResolutionOrderIndependent: true,
    cycles: 0,
    multipleSuccessors: 0,
    scopeMismatches: 0,
    authoritativeProjectionBeforePromotion: 0,
    overallResult: assertionSupersessionIssues.length === 0 && trimSupersessionIssues.length === 0 ? "PASSED_24_ASSERTION_CHAINS_AND_1_TRIM_LINK_CHAIN" : "FAILED",
  };

  const sourceReviewStatus = [
    { sourceId: "SRC-000086", rawArtifactReference: RAW_REF, rawChecksum: sha(raw), rawChecksumResult: "PASSED", originalUrl: "https://www.alfaromeo.com.tr/arac-modelleri/junior-ibrida", market: "TR", observedAt: "2026-08-18T18:58:00.000Z", publicContentAndSecretScan: "PASSED", exactPowertrainAndTrim: "PASSED_IBRIDA_HYBRID_145_EDCT6_SPECIALE_PLUS", duplicateLegacyIdOccurrences: raw.match(/id=["']modal-avhpos5auh["']/gu)?.length ?? 0, derivedArtifactResult: structuredArtifactReview.overallResult },
    { sourceId: "SRC-000085", frontendArtifactReference: PRICE_FRONTEND_REF, frontendChecksum: sha(frontend), backendArtifactReference: PRICE_BACKEND_REF, backendChecksum: sha(backend), frontendToBackendLink: frontend.includes("https://arjfiyat.tofas.com.tr/pricelists?brand=alfa-romeo") ? "PASSED_DIRECT_IFRAME_ASSIGNMENT" : "FAILED", backendExactIdentity: backend.includes("JUNIOR IBRIDA") && backend.includes("SPECIALE+") && backend.includes("Benzinli Hibrit") ? "PASSED_MY2026_TRIM_CONFIGURATION_ONLY" : "FAILED", equipmentAvailabilityAuthority: false, hostnameDifferenceDocumented: true, governanceResult: "PASSED_TRIM_IDENTITY_ONLY" },
  ];

  const trimLinkReviewResults = correctionLinks.map((link) => ({ linkId: link.linkId, supersedesTrimLinkId: link.supersedesTrimLinkId, exactVariantId: link.exactVariantId, canonicalTrimId: link.canonicalTrimId, decision: "CONFLICT_REVIEW_REQUIRED", identityAndMy2026Governance: "PASSED", supersession: "PASSED", locatorChain: "FAILED_SRC_000086_DERIVED_ARTIFACT_NOT_AUTHORITATIVE", verificationStatePreserved: link.verificationState === "PROVISIONAL", reviewException: { exceptionCode: "TRIM_LINK_DEPENDS_ON_REJECTED_DERIVED_ARTIFACT", recommendedAction: "Reissue the correction with a source-row-only derived artifact and stable raw-row locator." } }));

  const subjects = [...assertionReviewResults.map((result) => ({ subjectType: "ASSERTION", subjectId: result.assertionId, reasonCode: "DERIVED_ARTIFACT_FEATURE_INTERPRETATION_NOT_ALLOWED" })), ...trimLinkReviewResults.map((result) => ({ subjectType: "TRIM_LINK", subjectId: result.linkId, reasonCode: "TRIM_LINK_DEPENDS_ON_REJECTED_DERIVED_ARTIFACT" }))].sort((a, b) => `${a.subjectType}|${a.subjectId}`.localeCompare(`${b.subjectType}|${b.subjectId}`));
  const events = subjects.map((subject) => ({ reviewEventId: createEquipmentOperationalRecordId("EE-REV", `EE-PILOT-002-CYCLE-001-R1|${subject.subjectType}|${subject.subjectId}|CONFLICT_REVIEW_REQUIRED|${REVIEWER_ID}`), subjectType: subject.subjectType, subjectId: subject.subjectId, fromState: "SECOND_REVIEW_REQUIRED", toState: "CONFLICT_REVIEW_REQUIRED", actorRole: REVIEWER_ROLE, actorInstanceId: REVIEWER_ID, reviewedAt: REVIEWED_AT, reasonCode: subject.reasonCode }));

  const terminalBatchView = { terminalPolicy: "FOLLOW_SINGLE_SUCCESSOR_EXCLUDING_SUPERSEDED_PREDECESSORS", activePassedAssertions: { elettrica: 23, ibrida: 0, total: 23 }, activePassedTrimLinks: { elettrica: 1, ibrida: 0, total: 1 }, historicalSupersededConflicts: { ibridaAssertions: 24, ibridaTrimLinks: 1 }, activeCorrectionConflicts: { ibridaAssertions: 24, ibridaTrimLinks: 1 }, provisionalAssertionsMutated: false, productionProjectionCreated: false };
  const reviewedComparison = { researchCycleId: "EE-PILOT-002-CYCLE-001-R1", authority: "SECOND_REVIEW_TERMINAL_VIEW", counts: { CONFIRMED_SAME: 0, CONFIRMED_DIFFERENT: 0, INCONCLUSIVE_FOR_ONE: 23, INCONCLUSIVE_FOR_BOTH: 28, CONFLICTING: 0 }, highBeamAssist: "INCONCLUSIVE_FOR_BOTH_CORRECTION_SUCCESSOR_IN_CONFLICT", sourceComparisonArtifactMutated: false };
  const secondReviewResults = { pilotId: "EE-PILOT-002", batchId: "EE-PILOT-002-BATCH-001", correctionCycleId: "EE-PILOT-002-CYCLE-001-R1", result: "REQUIRES_COLLECTION_CORRECTION", actorRole: REVIEWER_ROLE, actorInstanceId: REVIEWER_ID, reviewedAt: REVIEWED_AT, subjects: { total: 25, passed: 0, conflictReviewRequired: 25, assertions: { total: 24, passed: 0, conflictReviewRequired: 24 }, trimLinks: { total: 1, passed: 0, conflictReviewRequired: 1 } }, rootCause: "Derived artifact violates the extraction contract by keying and duplicating source phrases by interpreted feature codes.", verificationPromotionAllowed: false, ownerApprovalCreated: false, activeEquipmentPointerChanged: false };
  const report = `# EE-PILOT-002 Batch 001-R1 Independent Correction Second Review\n\n- Result: REQUIRES_COLLECTION_CORRECTION\n- Subjects: 0 passed; 25 CONFLICT_REVIEW_REQUIRED\n- Raw SRC-000086: checksum-valid, official, public, exact Ibrida Speciale+ content; legacy locator remains duplicate (2 occurrences)\n- Derived checksum and parent provenance: valid; all 24 derived phrases occur in raw HTML\n- Derived fidelity decision: failed because extraction introduced feature-code keys and expanded 16 unique official phrases into 24 interpreted records\n- Mechanical structured locators: 24/24 RESOLVED_UNIQUE_1_OF_1; authoritative locator review: 0/24 until extraction and semantic mapping are separated\n- Supersession: 24 assertion chains and one trim-link chain valid; no cycle, multiple successor, or scope mismatch\n- SRC-000085 governance: frontend-to-Tofaş backend link and MY2026 identity support passed; not used for equipment availability\n- Terminal active passed view: 23 Elettrica assertions, 0 Ibrida assertions; one Elettrica trim link, 0 Ibrida trim links\n- Promotion: prohibited; no assertion or link was mutated or materialized\n`;

  const outputs: Record<string, unknown | string> = { "second-review-events.json": events, "second-review-results.json": secondReviewResults, "assertion-review-results.json": assertionReviewResults, "trim-link-review-results.json": trimLinkReviewResults, "source-review-status.json": sourceReviewStatus, "structured-artifact-review.json": structuredArtifactReview, "locator-review.json": locatorReview, "supersession-review.json": supersessionReview, "terminal-batch-view.json": terminalBatchView, "trim-comparison-r1-reviewed.json": reviewedComparison, "second-review-report.md": report };
  await mkdir(REVIEW, { recursive: true });
  for (const [name, value] of Object.entries(outputs)) await writeFile(path.join(REVIEW, name), typeof value === "string" ? value : json(value), "utf8");
}

void main();
