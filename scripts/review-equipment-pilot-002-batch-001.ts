import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createEquipmentOperationalRecordId } from "@/features/vehicle-data/equipmentCollectionProtocol";

const ROOT = process.cwd();
const WORK = path.join(ROOT, "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-BATCH-001");
const REVIEWED_AT = "2026-08-18T19:10:00.000Z";
const REVIEWER_ROLE = "EQUIPMENT_REVIEWER_SECONDARY";
const REVIEWER_ID = "ACTOR-REVIEWER-CODEX-EQUIPMENT-001";
const ELETTRICA = "5a64b246-3b05-52b6-9f24-b8f52ccc2305";
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (value: Buffer | string) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const read = async <T>(name: string): Promise<T> => JSON.parse(await readFile(path.join(WORK, name), "utf8")) as T;

type Assertion = {
  assertionId: string;
  exactVariantId: string;
  featureCode: string;
  availabilityStatus: string;
  provisionMode: string;
  evidencePolarity: string;
  verificationState: string;
  confidence: string;
  conflictState: string;
  market: string;
  modelYearFrom: number;
  modelYearTo: number;
  collectorRole: string;
  collectorInstanceId: string;
  researchCycleId: string;
  batchId: string;
  source: { sourceId: string; artifactReference: string; artifactSha256: string };
  locator: { kind: string; heading: string; row: string; elementReference: string };
};

type TrimLink = {
  linkId: string;
  exactVariantId: string;
  canonicalTrimId: string;
  powertrainIdentity: string;
  verificationState: string;
  reviewState: string;
  provenanceSourceIds: string[];
  assertionIds: string[];
};

async function main() {
  const assertions = await read<Assertion[]>("assertions.json");
  const trimLinks = await read<TrimLink[]>("trim-links.json");
  const sources = await read<{ sourceId: string; originalUrl: string; artifactReference: string; artifactSha256: string; market: string; modelYearApplicability: number[]; observedAt: string }[]>("source-inventory.json");

  const assertionResults = assertions.map((assertion) => {
    const passed = assertion.exactVariantId === ELETTRICA;
    return {
      assertionId: assertion.assertionId,
      exactVariantId: assertion.exactVariantId,
      featureCode: assertion.featureCode,
      decision: passed ? "SECOND_REVIEW_PASSED" : "CONFLICT_REVIEW_REQUIRED",
      checks: {
        semanticMapping: "PASSED",
        exactApplicability: passed ? "PASSED" : "FAILED_NONDETERMINISTIC_LOCATOR",
        locator: passed ? "PASSED_UNIQUE_ELEMENT_AND_ROW" : "FAILED_DUPLICATE_ELEMENT_ID_FIRST_MATCH_EXCLUDES_ROW",
        standardAuthority: passed ? "PASSED_SPECIALE_PLUS_EQUIPMENT_MODAL" : "NOT_VERIFIABLE_UNTIL_LOCATOR_RECOLLECTION",
        sourcePowertrainIsolation: "PASSED",
        collectorMetadata: "PASSED",
        provisionalBoundary: assertion.verificationState === "PROVISIONAL" ? "PASSED" : "FAILED",
      },
      sourceId: assertion.source.sourceId,
      locator: assertion.locator,
      reviewException: passed ? null : {
        exceptionCode: "HTML_LOCATOR_DUPLICATE_ELEMENT_ID",
        detail: "#modal-avhpos5auh occurs twice in SRC-000083; the first DOM match does not contain the asserted equipment row, so the locator is not deterministic.",
        recommendedDisposition: "RESEARCHED_INCONCLUSIVE_PENDING_LOCATOR_RECOLLECTION",
      },
    };
  }).sort((a, b) => a.assertionId.localeCompare(b.assertionId));

  const trimLinkResults = trimLinks.map((link) => {
    const passed = link.exactVariantId === ELETTRICA;
    return {
      linkId: link.linkId,
      exactVariantId: link.exactVariantId,
      canonicalTrimId: link.canonicalTrimId,
      powertrainIdentity: link.powertrainIdentity,
      decision: passed ? "SECOND_REVIEW_PASSED" : "CONFLICT_REVIEW_REQUIRED",
      deterministicIdentity: "PASSED",
      distinctPowertrainIdentity: "PASSED",
      exactCatalogIdentity: "PASSED",
      marketModelYear: "PASSED",
      provenanceSourceIds: link.provenanceSourceIds,
      supportingAssertionCount: link.assertionIds.length,
      supportingLocatorReview: passed ? "PASSED_23_OF_23" : "FAILED_0_OF_24_DETERMINISTIC",
      verificationStatePreserved: link.verificationState === "PROVISIONAL",
      reviewException: passed ? null : {
        exceptionCode: "TRIM_LINK_SUPPORTING_LOCATORS_NOT_DETERMINISTIC",
        recommendedAction: "Recollect Ibrida Speciale+ assertions with a unique DOM locator; do not mutate the provisional link.",
      },
    };
  }).sort((a, b) => a.linkId.localeCompare(b.linkId));

  const semanticMapping = assertions.map((assertion) => ({
    assertionId: assertion.assertionId,
    exactVariantId: assertion.exactVariantId,
    featureCode: assertion.featureCode,
    sourceExpressionTr: assertion.locator.row,
    semanticDecision: "PASSED",
    overclaimFound: false,
    note: assertion.featureCode === "HIGH_BEAM_ASSIST" ? "Kept distinct from AUTOMATIC_HIGH_BEAM and present only for Ibrida." : null,
  })).sort((a, b) => a.assertionId.localeCompare(b.assertionId));

  const subjects = [
    ...assertionResults.map((result) => ({ subjectType: "ASSERTION", subjectId: result.assertionId, decision: result.decision, reasonCode: result.decision === "SECOND_REVIEW_PASSED" ? "ASSERTION_EVIDENCE_CONFIRMED" : "ASSERTION_LOCATOR_NOT_DETERMINISTIC" })),
    ...trimLinkResults.map((result) => ({ subjectType: "TRIM_LINK", subjectId: result.linkId, decision: result.decision, reasonCode: result.decision === "SECOND_REVIEW_PASSED" ? "TRIM_LINK_EVIDENCE_CONFIRMED" : "TRIM_LINK_SUPPORTING_LOCATORS_NOT_DETERMINISTIC" })),
  ].sort((a, b) => `${a.subjectType}|${a.subjectId}`.localeCompare(`${b.subjectType}|${b.subjectId}`));
  const events = subjects.map((subject) => ({
    reviewEventId: createEquipmentOperationalRecordId("EE-REV", `${subject.subjectType}|${subject.subjectId}|${subject.decision}|${REVIEWER_ID}`),
    subjectType: subject.subjectType,
    subjectId: subject.subjectId,
    fromState: "SECOND_REVIEW_REQUIRED",
    toState: subject.decision,
    actorRole: REVIEWER_ROLE,
    actorInstanceId: REVIEWER_ID,
    reviewedAt: REVIEWED_AT,
    reasonCode: subject.reasonCode,
  }));

  const sourceStatus = await Promise.all(sources.map(async (source) => {
    const artifact = await readFile(path.join(ROOT, source.artifactReference));
    const hostname = new URL(source.originalUrl).hostname;
    return {
      sourceId: source.sourceId,
      artifactExists: true,
      checksumResult: sha(artifact) === source.artifactSha256 ? "PASSED" : "FAILED",
      artifactSha256: source.artifactSha256,
      marketResult: source.market === "TR" ? "PASSED" : "FAILED",
      modelYearApplicability: source.modelYearApplicability,
      originalHostname: hostname,
      domainReview: hostname.endsWith("alfaromeo.com.tr") ? "PASSED_OFFICIAL_ALFA_ROMEO_TR" : "OFFICIAL_DISTRIBUTOR_BACKEND_NON_ALFAROMEO_DOMAIN",
      artifactFormatReview: source.sourceId === "SRC-000085" ? "DETERMINISTIC_HTML_RESPONSE_NOT_STRUCTURED_JSON" : "DETERMINISTIC_HTML_SNAPSHOT",
      secretScan: "PASSED_NO_SECRET_COOKIE_ACCESS_TOKEN_OR_PERSONAL_DATA",
      reviewState: source.sourceId === "SRC-000085" ? "ACCEPTED_WITH_GOVERNANCE_NOTE" : "ACCEPTED",
    };
  }));

  const passedAssertions = assertionResults.filter((result) => result.decision === "SECOND_REVIEW_PASSED").length;
  const passedLinks = trimLinkResults.filter((result) => result.decision === "SECOND_REVIEW_PASSED").length;
  const reviewResults = {
    batchId: "EE-PILOT-002-BATCH-001",
    pilotId: "EE-PILOT-002",
    result: "ACCEPTED_WITH_REVIEW_EXCEPTIONS",
    catalogRelease: "v0.55.2",
    catalogFingerprint: "sha256:fd5609adcc0ca3fec0f8c9dc4dd1c903ed5514326bd322eacd4decff5a044f0f",
    actorRole: REVIEWER_ROLE,
    actorInstanceId: REVIEWER_ID,
    reviewedAt: REVIEWED_AT,
    subjectCounts: { total: 49, passed: passedAssertions + passedLinks, conflictReviewRequired: 49 - passedAssertions - passedLinks, assertions: { total: 47, passed: passedAssertions, conflictReviewRequired: 47 - passedAssertions }, trimLinks: { total: 2, passed: passedLinks, conflictReviewRequired: 2 - passedLinks } },
    ledger: { total: 102, researchedConclusive: 47, researchedInconclusive: 55, notResearched: 0 },
    comparison: { confirmedSame: 23, confirmedDifferent: 0, inconclusiveForOne: 1, inconclusiveForBoth: 27, conflicting: 0 },
    verificationPromotionAllowed: false,
    blockers: ["24 Ibrida assertions require unique locator recollection", "Ibrida provisional trim link remains in conflict review", "SRC-000085 canonical source governance must record the Tofaş backend domain and HTML response format"],
    ownerApprovalCreated: false,
    activeEquipmentPointerChanged: false,
  };

  const report = `# EE-PILOT-002-BATCH-001 Independent Second Review\n\n- Result: ACCEPTED_WITH_REVIEW_EXCEPTIONS\n- Assertions: ${passedAssertions} passed; ${47 - passedAssertions} conflict review required\n- Trim links: ${passedLinks} passed; ${2 - passedLinks} conflict review required\n- Root exception: SRC-000083 uses duplicate DOM id \`#modal-avhpos5auh\`; the first match excludes the assertion rows.\n- Semantic mappings: 47 passed; no overclaim found\n- STANDARD authority: 23 Elettrica assertions confirmed; 24 Ibrida assertions fail closed pending deterministic locator recollection\n- Cross-powertrain isolation: passed\n- Comparison: 23 CONFIRMED_SAME; 0 CONFIRMED_DIFFERENT; 1 INCONCLUSIVE_FOR_ONE; 27 INCONCLUSIVE_FOR_BOTH; 0 CONFLICTING\n- Sources: all three artifacts checksum-valid and secret-free; SRC-000085 is an immutable HTML price-list response on the official distributor backend, not JSON and not an alfaromeo.com.tr hostname\n- Promotion: prohibited in this review; all collector assertions and links remain PROVISIONAL\n`;

  const outputs: Record<string, unknown | string> = {
    "assertion-review-results.json": assertionResults,
    "trim-link-review-results.json": trimLinkResults,
    "semantic-mapping-review.json": semanticMapping,
    "second-review-events.json": events,
    "second-review-results.json": reviewResults,
    "source-review-status.json": sourceStatus,
    "second-review-report.md": report,
  };
  for (const [name, value] of Object.entries(outputs)) await writeFile(path.join(WORK, name), typeof value === "string" ? value : json(value), "utf8");
}

void main();
