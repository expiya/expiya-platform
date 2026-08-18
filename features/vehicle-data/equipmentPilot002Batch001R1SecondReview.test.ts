import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { validateReviewEvents } from "./equipmentCollectionProtocol";
import { projectEquipmentEvidence } from "./projectEquipmentEvidence";
import { validateAssertionSupersessions, validateTrimLinkSupersessions } from "./validateEquipmentEvidenceLayer";
import type { EquipmentEvidenceAssertion, EquipmentReviewEvent, EquipmentTrimVariantLink } from "@/types/equipmentEvidence";

const ROOT = process.cwd();
const BASE = "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-BATCH-001";
const R1 = `${BASE}/corrections/EE-PILOT-002-CYCLE-001-R1`;
const REVIEW = `${R1}/second-review`;
const IBRIDA = "1a3cc01d-3bfa-56f3-817f-4cc77e723ef8";
const ELETTRICA = "5a64b246-3b05-52b6-9f24-b8f52ccc2305";
const read = <T>(file: string): T => JSON.parse(readFileSync(path.join(ROOT, file), "utf8")) as T;
const sha = (file: string) => createHash("sha256").update(readFileSync(path.join(ROOT, file))).digest("hex");

describe("EE-PILOT-002 Batch 001-R1 independent correction second review", () => {
  const originals = read<EquipmentEvidenceAssertion[]>(`${BASE}/assertions.json`);
  const successors = read<EquipmentEvidenceAssertion[]>(`${R1}/assertions.json`);
  const originalLinks = read<EquipmentTrimVariantLink[]>(`${BASE}/trim-links.json`);
  const successorLinks = read<EquipmentTrimVariantLink[]>(`${R1}/trim-links.json`);
  const correctionEvents = read<EquipmentReviewEvent[]>(`${R1}/review-events.json`);
  const secondReviewEvents = read<EquipmentReviewEvent[]>(`${REVIEW}/second-review-events.json`);

  it("preserves the original batch, first review, Elettrica and source bytes", () => {
    expect(sha(`${BASE}/assertions.json`)).toBe("d71484a96009d93756ba7843393bb441c88cea798a32ab240edb0ee41407bb35");
    expect(sha(`${BASE}/trim-links.json`)).toBe("79abb10279f25128ce95c441f1d8f64d71c111e98ef41c8f58f71aae94bba41f");
    expect(sha(`${BASE}/research-ledger.json`)).toBe("22f0491ab3f5e9920378c36bd9a255546dfc7ca1d46c17b910bbb5d25f8b41af");
    expect(sha(`${BASE}/second-review-events.json`)).toBe("249cd53be1c6d141f83d915a29acbe3d978f6aeabf3b66aaa8b50bec8fbe8c35");
    expect(sha(`${BASE}/second-review-results.json`)).toBe("ad75f46c21cc6eb076a1245062b3b5e3fa51327e338aa17734c8c15688db8f37");
    expect(sha("data/cars/vehicle_evidence/source_snapshots/SRC-000083/2026-08-18/source.html")).toBe("3ab39031195955489bd984c432b469943ebb420b7d11ad4f8f4ec22d6661f955");
    expect(sha("data/cars/vehicle_evidence/source_snapshots/SRC-000084/2026-08-18/source.html")).toBe("a97340845586845dfd6e6f84f5e2d0a351c6910678c544d860357ec631dc338b");
    expect(sha("data/cars/vehicle_evidence/source_snapshots/SRC-000085/2026-08-16/source.html")).toBe("af3d2ebbe55bab0c8df0231de73d989718b4d02f851d8fc361e3461fb63d9e79");
    expect(originals.filter((assertion) => assertion.exactVariantId === ELETTRICA)).toHaveLength(23);
  });

  it("verifies every collector correction checksum without modifying it", () => {
    const checksums = read<Record<string, string>>(`${R1}/checksums.json`);
    for (const [name, expected] of Object.entries(checksums)) expect(`sha256:${sha(`${R1}/${name}`)}`).toBe(expected);
  });

  it("verifies the official public Ibrida raw snapshot and legacy duplicate locator", () => {
    const raw = readFileSync(path.join(ROOT, "data/cars/vehicle_evidence/source_snapshots/SRC-000086/2026-08-18/source.html"), "utf8");
    expect(sha("data/cars/vehicle_evidence/source_snapshots/SRC-000086/2026-08-18/source.html")).toBe("3ab39031195955489bd984c432b469943ebb420b7d11ad4f8f4ec22d6661f955");
    expect(raw).toContain("Alfa Romeo Junior Ibrida Speciale+");
    expect(raw).toContain("Hybrid 145* eDCT6");
    expect(raw.match(/id=["']modal-avhpos5auh["']/gu)).toHaveLength(2);
    expect(raw).not.toMatch(/authorization\s*[:=]\s*["'][^"']+|set-cookie\s*:|bearer\s+[a-z0-9._-]{12,}|session(?:id)?\s*[:=]\s*["'][^"']+|access[_-]?token\s*[:=]/iu);
  });

  it("verifies derived checksum and parent provenance but rejects feature interpretation during extraction", () => {
    const review = read<{ checksum: { result: string }; parentProvenance: { result: string }; rawPhraseFidelity: string; extractionLayerSeparation: string; uniqueOfficialRows: number; derivedFeatureRecords: number; duplicatedInterpretations: { sourcePhrase: string; derivedRecordCount: number }[]; overallResult: string }>(`${REVIEW}/structured-artifact-review.json`);
    expect(sha("data/cars/vehicle_evidence/source_snapshots/SRC-000086/2026-08-18/equipment-speciale-plus.derived.json")).toBe("7c4b9f8e7de95cfda4569b09f01bd0e362113b6a677a872ffea701e98cc09515");
    expect(review).toMatchObject({ checksum: { result: "PASSED" }, parentProvenance: { result: "PASSED" }, rawPhraseFidelity: "PASSED_24_OF_24_PHRASES_PRESENT", extractionLayerSeparation: "FAILED_FEATURE_CODE_INTERPRETATION_DURING_EXTRACTION", uniqueOfficialRows: 16, derivedFeatureRecords: 24, overallResult: "REJECTED_SYSTEMATIC_EXTRACTION_POLICY_VIOLATION" });
    expect(review.duplicatedInterpretations.map((item) => item.derivedRecordCount).sort()).toEqual([2, 2, 2, 3, 4]);
  });

  it("mechanically resolves 24 structured paths but rejects them as authoritative locators", () => {
    const locators = read<{ assertionId: string; recordPath: string; mechanicalResolution: string; authoritativeLocatorDecision: string; reasonCode: string }[]>(`${REVIEW}/locator-review.json`);
    expect(locators).toHaveLength(24);
    expect(new Set(locators.map((locator) => locator.assertionId))).toHaveLength(24);
    expect(new Set(locators.map((locator) => locator.recordPath))).toHaveLength(24);
    expect(locators.every((locator) => locator.mechanicalResolution === "RESOLVED_UNIQUE_1_OF_1" && locator.authoritativeLocatorDecision === "CONFLICT_REVIEW_REQUIRED" && locator.reasonCode === "LOCATOR_TARGET_IS_SEMANTICALLY_INTERPRETED_DERIVED_RECORD")).toBe(true);
  });

  it("validates all append-only assertion and trim-link supersession chains", () => {
    expect(successors).toHaveLength(24);
    expect(successorLinks).toHaveLength(1);
    expect(validateAssertionSupersessions([...originals, ...successors])).toEqual([]);
    expect(validateAssertionSupersessions([...successors, ...originals])).toEqual([]);
    expect(validateTrimLinkSupersessions([...originalLinks, ...successorLinks])).toEqual([]);
    expect(validateTrimLinkSupersessions([...successorLinks, ...originalLinks])).toEqual([]);
    const review = read<{ overallResult: string; cycles: number; multipleSuccessors: number; scopeMismatches: number; authoritativeProjectionBeforePromotion: number; assertionChains: { originalConflictPreserved: boolean }[]; trimLinkChains: { originalConflictPreserved: boolean }[] }>(`${REVIEW}/supersession-review.json`);
    expect(review).toMatchObject({ overallResult: "PASSED_24_ASSERTION_CHAINS_AND_1_TRIM_LINK_CHAIN", cycles: 0, multipleSuccessors: 0, scopeMismatches: 0, authoritativeProjectionBeforePromotion: 0 });
    expect(review.assertionChains.every((chain) => chain.originalConflictPreserved)).toBe(true);
    expect(review.trimLinkChains.every((chain) => chain.originalConflictPreserved)).toBe(true);
  });

  it("keeps every successor provisional and projection fail-closed", () => {
    expect(successors.every((assertion) => assertion.verificationState === "PROVISIONAL")).toBe(true);
    expect(successorLinks.every((link) => link.verificationState === "PROVISIONAL")).toBe(true);
    for (const successor of successors) expect(projectEquipmentEvidence({ variant: { exactVariantId: IBRIDA, market: "TR", modelYear: 2026 }, featureCode: successor.featureCode, assertions: [successor], trimLinks: successorLinks, packageLinks: [] })).toBeUndefined();
  });

  it("independently confirms SRC-000085 frontend-to-backend governance", () => {
    const frontend = readFileSync(path.join(ROOT, "data/cars/vehicle_evidence/working/ALFA_ROMEO_BATCH_01/snapshots/2026-08-16/price-page.html"), "utf8");
    const backend = readFileSync(path.join(ROOT, "data/cars/vehicle_evidence/source_snapshots/SRC-000085/2026-08-16/source.html"), "utf8");
    expect(sha("data/cars/vehicle_evidence/working/ALFA_ROMEO_BATCH_01/snapshots/2026-08-16/price-page.html")).toBe("dceb2bcc7fdf0385af3be36556e0519ca2b4f565d6c36220b0478b853f58ed70");
    expect(frontend).toContain("https://arjfiyat.tofas.com.tr/pricelists?brand=alfa-romeo");
    expect(backend).toMatch(/2026[\s\S]*JUNIOR IBRIDA[\s\S]*SPECIALE\+[\s\S]*Benzinli Hibrit/u);
    const status = read<{ sourceId: string; frontendToBackendLink?: string; backendExactIdentity?: string; equipmentAvailabilityAuthority?: boolean }[]>(`${REVIEW}/source-review-status.json`).find((source) => source.sourceId === "SRC-000085");
    expect(status).toMatchObject({ frontendToBackendLink: "PASSED_DIRECT_IFRAME_ASSIGNMENT", backendExactIdentity: "PASSED_MY2026_TRIM_CONFIGURATION_ONLY", equipmentAvailabilityAuthority: false });
  });

  it("reviews all 24 corrected assertions and the trim link fail-closed", () => {
    const assertionResults = read<{ assertionId: string; decision: string; semanticMapping: string; standardAuthority: string; sourceAndProvenance: string; verificationStatePreserved: boolean }[]>(`${REVIEW}/assertion-review-results.json`);
    const linkResults = read<{ linkId: string; decision: string; identityAndMy2026Governance: string; supersession: string; locatorChain: string; verificationStatePreserved: boolean }[]>(`${REVIEW}/trim-link-review-results.json`);
    expect(assertionResults).toHaveLength(24);
    expect(assertionResults.every((result) => result.decision === "CONFLICT_REVIEW_REQUIRED" && result.semanticMapping === "PASSED" && result.standardAuthority === "PASSED" && result.sourceAndProvenance === "FAILED_DERIVED_LAYER_SEPARATION" && result.verificationStatePreserved)).toBe(true);
    expect(linkResults).toEqual([expect.objectContaining({ decision: "CONFLICT_REVIEW_REQUIRED", identityAndMy2026Governance: "PASSED", supersession: "PASSED", locatorChain: "FAILED_SRC_000086_DERIVED_ARTIFACT_NOT_AUTHORITATIVE", verificationStatePreserved: true })]);
  });

  it("appends 25 independent conflict events without owner approval", () => {
    expect(secondReviewEvents).toHaveLength(25);
    expect(new Set(secondReviewEvents.map((event) => `${event.subjectType}|${event.subjectId}`))).toHaveLength(25);
    expect(secondReviewEvents.every((event) => event.fromState === "SECOND_REVIEW_REQUIRED" && event.toState === "CONFLICT_REVIEW_REQUIRED" && event.actorRole === "EQUIPMENT_REVIEWER_SECONDARY" && event.actorInstanceId === "ACTOR-REVIEWER-CODEX-EQUIPMENT-001")).toBe(true);
    expect(secondReviewEvents.some((event) => event.toState === "APPROVED" || event.actorInstanceId === "ACTOR-COLLECTOR-CODEX-CATALOG-001")).toBe(false);
    expect(validateReviewEvents([...correctionEvents, ...secondReviewEvents], successors)).toEqual([]);
  });

  it("computes the active terminal view without deleting historical conflicts", () => {
    const terminal = read<{ activePassedAssertions: { elettrica: number; ibrida: number; total: number }; activePassedTrimLinks: { elettrica: number; ibrida: number; total: number }; historicalSupersededConflicts: { ibridaAssertions: number; ibridaTrimLinks: number }; activeCorrectionConflicts: { ibridaAssertions: number; ibridaTrimLinks: number }; productionProjectionCreated: boolean }>(`${REVIEW}/terminal-batch-view.json`);
    expect(terminal).toEqual(expect.objectContaining({ activePassedAssertions: { elettrica: 23, ibrida: 0, total: 23 }, activePassedTrimLinks: { elettrica: 1, ibrida: 0, total: 1 }, historicalSupersededConflicts: { ibridaAssertions: 24, ibridaTrimLinks: 1 }, activeCorrectionConflicts: { ibridaAssertions: 24, ibridaTrimLinks: 1 }, productionProjectionCreated: false }));
  });

  it("regenerates comparison from terminal passed subjects only", () => {
    const comparison = read<{ counts: Record<string, number>; highBeamAssist: string; sourceComparisonArtifactMutated: boolean }>(`${REVIEW}/trim-comparison-r1-reviewed.json`);
    expect(comparison.counts).toEqual({ CONFIRMED_SAME: 0, CONFIRMED_DIFFERENT: 0, INCONCLUSIVE_FOR_ONE: 23, INCONCLUSIVE_FOR_BOTH: 28, CONFLICTING: 0 });
    expect(comparison).toMatchObject({ highBeamAssist: "INCONCLUSIVE_FOR_BOTH_CORRECTION_SUCCESSOR_IN_CONFLICT", sourceComparisonArtifactMutated: false });
  });

  it("records the systematic correction decision with deterministic serialization", () => {
    const result = read<{ result: string; subjects: { total: number; passed: number; conflictReviewRequired: number }; verificationPromotionAllowed: boolean; ownerApprovalCreated: boolean; activeEquipmentPointerChanged: boolean }>(`${REVIEW}/second-review-results.json`);
    expect(result).toMatchObject({ result: "REQUIRES_COLLECTION_CORRECTION", subjects: { total: 25, passed: 0, conflictReviewRequired: 25 }, verificationPromotionAllowed: false, ownerApprovalCreated: false, activeEquipmentPointerChanged: false });
    for (const name of ["second-review-events.json", "second-review-results.json", "assertion-review-results.json", "trim-link-review-results.json", "source-review-status.json", "structured-artifact-review.json", "locator-review.json", "supersession-review.json", "terminal-batch-view.json", "trim-comparison-r1-reviewed.json"]) expect(readFileSync(path.join(ROOT, REVIEW, name), "utf8")).toBe(`${JSON.stringify(read(`${REVIEW}/${name}`), null, 2)}\n`);
  });
});
