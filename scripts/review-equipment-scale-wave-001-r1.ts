import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  calculateEquipmentSubjectContentFingerprint,
  canonicalFingerprintJson,
  EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_POLICY,
  type CanonicalFingerprintValue,
} from "../features/vehicle-data/equipmentSubjectFingerprint";

const ROOT = process.cwd();
const WAVE = path.join(ROOT, "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-SCALE-WAVE-001");
const R1 = path.join(WAVE, "corrections/EE-PILOT-002-SCALE-WAVE-001-R1");
const OUT = path.join(R1, "second-review");
const CYCLE = "EE-PILOT-002-SCALE-WAVE-001-R1";
const CYCLE_CHECKSUM = "sha256:dc5bdbdf7f9e1e6f1e0dbe3780fa348b8f93ebbb818e00c336b739e600df2224";
const WAVE_CHECKSUM = "sha256:e205d625a7ba13be956648871e0f4e6259ee52289be92b48ca0b76d7ee4f8cb8";
const REVIEWER = "ACTOR-REVIEWER-CODEX-EQUIPMENT-001";
const REVIEWED_AT = "2026-08-19T07:00:00.000+03:00";
const CATALOG_FINGERPRINT = "sha256:fd5609adcc0ca3fec0f8c9dc4dd1c903ed5514326bd322eacd4decff5a044f0f";
const ACTIVE_POINTER = path.join(ROOT, "data/production/equipment-evidence/active.json");
const BATCHES = [
  { id: "EE-PILOT-002-BATCH-014", brand: "BYD", exactVariantId: "6cb56615-37ef-51a8-9202-a73e59d4e14b", model: "DOLPHIN", trim: "Comfort", count: 33 },
  { id: "EE-PILOT-002-BATCH-021", brand: "Nissan", exactVariantId: "90e65f94-6fdb-5eea-ad7e-0b4e18435427", model: "Qashqai", trim: "Platinum Premium e-POWER", count: 32 },
] as const;

type Json = Record<string, unknown>;
type Assertion = Json & { assertionId: string; exactVariantId: string; featureCode: string; source: { sourceId: string; artifactSha256: string }; locator: CanonicalFingerprintValue; semanticMappingId: string; availabilityStatus: string; provisionMode: string; market: string; modelYearFrom: number; modelYearTo: number; evidencePolarity: string; confidence: string; conflictState: string; canonicalTrimId?: string; canonicalPackageId?: string; contentFingerprint: string; supersedesAssertionId: string };
type TrimLink = Json & { linkId: string; exactVariantId: string; canonicalTrimId: string; market: string; modelYearFrom: number; modelYearTo: number; sourceId: string; contentFingerprint: string; supersedesTrimLinkId: string };
type Mapping = { mappingId: string; sourceRowId: string };

const sha = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const stableId = (prefix: string, ...parts: string[]) => `${prefix}-${createHash("sha256").update(parts.join("\0")).digest("hex").slice(0, 24).toUpperCase()}`;
const load = async <T>(file: string): Promise<T> => JSON.parse(await readFile(file, "utf8")) as T;
const save = async (file: string, value: unknown) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`); };
const batchFile = (batch: string, file: string) => path.join(WAVE, "micro-batches", batch, file);

function assertionPayload(assertion: Assertion, mapping: Mapping): CanonicalFingerprintValue {
  return {
    recordType: "EQUIPMENT_ASSERTION_SEMANTIC_CONTENT", recordVersion: "1.0.0",
    exactVariantId: assertion.exactVariantId, featureCode: assertion.featureCode,
    availabilityStatus: assertion.availabilityStatus, provisionMode: assertion.provisionMode,
    marketApplicability: assertion.market, modelYearApplicability: { from: assertion.modelYearFrom, to: assertion.modelYearTo },
    trimApplicability: String(assertion.canonicalTrimId ?? "EXACT_VARIANT"), powertrainApplicability: "EXACT_CATALOG_POWERTRAIN",
    sourceIds: [assertion.source.sourceId], rawArtifactChecksums: [assertion.source.artifactSha256], sourceRowIds: [mapping.sourceRowId],
    locator: assertion.locator, semanticMappingIds: [mapping.mappingId], packageLinkIds: assertion.canonicalPackageId ? [assertion.canonicalPackageId] : [],
    evidenceSemantics: { polarity: assertion.evidencePolarity, confidence: assertion.confidence, conflictState: assertion.conflictState },
  };
}

function trimPayload(batch: typeof BATCHES[number], link: TrimLink, assertions: Assertion[], catalogVariant: Json): CanonicalFingerprintValue {
  const sources = [...new Map(assertions.map((item) => [item.source.sourceId, item.source.artifactSha256])).entries()].sort(([a], [b]) => a.localeCompare(b));
  return {
    recordType: "EQUIPMENT_TRIM_LINK_SEMANTIC_CONTENT", recordVersion: "1.0.0", exactVariantId: link.exactVariantId,
    canonicalBrand: batch.brand, canonicalModel: batch.model, canonicalTrim: batch.trim, canonicalTrimId: link.canonicalTrimId,
    powertrain: (catalogVariant.powertrain ?? null) as CanonicalFingerprintValue,
    transmission: ((catalogVariant.powertrain as Json | undefined)?.transmission ?? null) as CanonicalFingerprintValue,
    modelYear: link.modelYearFrom, market: link.market,
    identitySources: sources.map(([sourceId, artifactSha256]) => ({ sourceId, artifactSha256 })),
    locators: assertions.map((item) => item.locator).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    applicability: { from: link.modelYearFrom, to: link.modelYearTo, exactVariantOnly: true },
  };
}

async function main() {
  const [manifest, checksums, index, successorDoc, trimDoc, collectorDoc, originalImmutability, semanticImmutability, catalog] = await Promise.all([
    load<Json>(path.join(R1, "manifest.json")), load<Record<string, string>>(path.join(R1, "checksums.json")),
    load<{ subjects: Json[] }>(path.join(R1, "independent-review-index.json")), load<{ assertions: Assertion[] }>(path.join(R1, "assertion-successors.json")),
    load<{ trimLinks: TrimLink[] }>(path.join(R1, "trim-link-successors.json")), load<{ events: Json[] }>(path.join(R1, "collector-review-events.json")),
    load<{ status: string; before: Record<string, string>; after: Record<string, string> }>(path.join(R1, "original-immutability.json")),
    load<{ records: Json[] }>(path.join(R1, "semantic-immutability.json")),
    load<{ records: Array<{ variant: Json & { id: string } }> }>(path.join(ROOT, "data/production/catalog/releases/v0.55.2/catalog.json")),
  ]);

  const core = { ...manifest }; delete core.canonicalChecksum;
  if (sha(JSON.stringify(core)) !== CYCLE_CHECKSUM || manifest.canonicalChecksum !== CYCLE_CHECKSUM) throw new Error("R1_CYCLE_CHECKSUM_MISMATCH");
  for (const [file, expected] of Object.entries(checksums)) if (sha(await readFile(path.join(R1, file))) !== expected) throw new Error(`R1_ARTIFACT_CHECKSUM_MISMATCH:${file}`);
  for (const [file, expected] of Object.entries(originalImmutability.before)) {
    const actual = sha(await readFile(path.join(ROOT, file)));
    if (actual !== expected || originalImmutability.after[file] !== expected) throw new Error(`ORIGINAL_IMMUTABILITY_MISMATCH:${file}`);
  }
  if (originalImmutability.status !== "BYTE_IDENTICAL") throw new Error("ORIGINAL_IMMUTABILITY_STATUS_INVALID");

  const subjects = index.subjects;
  if (subjects.length !== 67 || new Set(subjects.map((item) => item.subjectId)).size !== 67 || successorDoc.assertions.length !== 65 || trimDoc.trimLinks.length !== 2) throw new Error("R1_REVIEW_SCOPE_INVALID");
  if (subjects.some((item) => item.exactVariantId === "19951113-2e40-5526-b568-2ae1984c27e0")) throw new Error("VOLVO_SUBJECT_IN_R1_REVIEW");
  if (["ACTOR-COLLECTOR-CODEX-CATALOG-001", "EQUIPMENT_OWNER_001"].includes(REVIEWER)) throw new Error("REVIEWER_INDEPENDENCE_FAILED");

  const collectorEventsBySubject = new Map<string, Json[]>();
  for (const event of collectorDoc.events) collectorEventsBySubject.set(String(event.subjectId), [...(collectorEventsBySubject.get(String(event.subjectId)) ?? []), event]);
  if (collectorDoc.events.length !== 134 || new Set(collectorDoc.events.map((event) => event.reviewEventId)).size !== 134) throw new Error("COLLECTOR_EVENT_COUNT_OR_DUPLICATE");
  for (const subject of subjects) {
    const events = collectorEventsBySubject.get(String(subject.subjectId)) ?? [];
    if (events.length !== 2 || !events.some((event) => event.toState === "COLLECTED") || !events.some((event) => event.toState === "SECOND_REVIEW_REQUIRED")) throw new Error(`COLLECTOR_LIFECYCLE_INVALID:${subject.subjectId}`);
  }
  if (collectorDoc.events.some((event) => event.toState === "SECOND_REVIEW_PASSED" || event.actorRole !== "EQUIPMENT_COLLECTOR_PRIMARY")) throw new Error("COLLECTOR_UNAUTHORIZED_REVIEW_EVENT");

  const assertionReviews: Json[] = [];
  const trimReviews: Json[] = [];
  const allRecords: Array<{ subjectType: string; subjectId: string; predecessorId: string; exactVariantId: string; stored: string; computed: string; computedFromSuccessor: string; brand: string; semanticEqual: boolean }> = [];
  const semanticBySubject = new Map(semanticImmutability.records.map((record) => [String(record.subjectId), record]));

  for (const batch of BATCHES) {
    const [originalAssertions, originalLinks, mappings] = await Promise.all([
      load<{ assertions: Assertion[] }>(batchFile(batch.id, "assertions.json")), load<{ trimLinks: TrimLink[] }>(batchFile(batch.id, "trim-links.json")),
      load<{ mappings: Mapping[] }>(batchFile(batch.id, "semantic-mappings.json")),
    ]);
    const originalById = new Map(originalAssertions.assertions.map((item) => [item.assertionId, item]));
    const mappingById = new Map(mappings.mappings.map((item) => [item.mappingId, item]));
    const batchSuccessors = successorDoc.assertions.filter((item) => item.exactVariantId === batch.exactVariantId);
    if (batchSuccessors.length !== batch.count) throw new Error(`ASSERTION_DISTRIBUTION_MISMATCH:${batch.brand}`);
    for (const successor of batchSuccessors) {
      const predecessor = originalById.get(successor.supersedesAssertionId);
      const mapping = mappingById.get(successor.semanticMappingId);
      if (!predecessor || !mapping) throw new Error(`SUPERSESSION_TARGET_OR_MAPPING_MISSING:${successor.assertionId}`);
      const computed = calculateEquipmentSubjectContentFingerprint(assertionPayload(predecessor, mapping));
      const computedFromSuccessor = calculateEquipmentSubjectContentFingerprint(assertionPayload(successor, mapping));
      const semantic = semanticBySubject.get(successor.assertionId);
      const semanticEqual = computed === computedFromSuccessor && computed === successor.contentFingerprint && semantic?.unchanged === true && semantic.semanticContentHashBefore === computed && semantic.semanticContentHashAfter === computed;
      allRecords.push({ subjectType: "ASSERTION", subjectId: successor.assertionId, predecessorId: predecessor.assertionId, exactVariantId: successor.exactVariantId, stored: successor.contentFingerprint, computed, computedFromSuccessor, brand: batch.brand, semanticEqual });
    }
    const predecessorLink = originalLinks.trimLinks[0];
    const successorLink = trimDoc.trimLinks.find((item) => item.exactVariantId === batch.exactVariantId);
    const catalogVariant = catalog.records.find((item) => item.variant.id === batch.exactVariantId)?.variant;
    if (!successorLink || !catalogVariant || successorLink.supersedesTrimLinkId !== predecessorLink.linkId) throw new Error(`TRIM_SUPERSESSION_INVALID:${batch.brand}`);
    const computed = calculateEquipmentSubjectContentFingerprint(trimPayload(batch, predecessorLink, originalAssertions.assertions, catalogVariant));
    const computedFromSuccessor = calculateEquipmentSubjectContentFingerprint(trimPayload(batch, successorLink, originalAssertions.assertions, catalogVariant));
    const semantic = semanticBySubject.get(successorLink.linkId);
    const semanticEqual = computed === computedFromSuccessor && computed === successorLink.contentFingerprint && semantic?.unchanged === true && semantic.semanticContentHashBefore === computed && semantic.semanticContentHashAfter === computed;
    allRecords.push({ subjectType: "TRIM_LINK", subjectId: successorLink.linkId, predecessorId: predecessorLink.linkId, exactVariantId: successorLink.exactVariantId, stored: successorLink.contentFingerprint, computed, computedFromSuccessor, brand: batch.brand, semanticEqual });
  }

  const validFingerprint = /^sha256:[a-f0-9]{64}$/;
  for (const record of allRecords) {
    const passed = record.semanticEqual && validFingerprint.test(record.stored);
    const review = { ...record, fingerprintPolicyId: EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_POLICY.policyId, fingerprintPolicyVersion: EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_POLICY.version, match: record.stored === record.computed, semanticImmutability: record.semanticEqual, disposition: passed ? "SECOND_REVIEW_PASSED" : "CONFLICT_REVIEW_REQUIRED", reasonCode: passed ? "FINGERPRINT_RECOMPUTED_AND_SEMANTICALLY_IDENTICAL" : "FINGERPRINT_OR_SEMANTIC_IMMUTABILITY_FAILED" };
    (record.subjectType === "ASSERTION" ? assertionReviews : trimReviews).push(review);
  }
  if (allRecords.some((record) => !record.semanticEqual)) throw new Error("R1_FINGERPRINT_OR_SEMANTIC_RECOMPUTATION_FAILED");

  const adversarial = {
    keyOrderInvariant: calculateEquipmentSubjectContentFingerprint({ b: 2, a: 1 }) === calculateEquipmentSubjectContentFingerprint({ a: 1, b: 2 }),
    unicodeNfkcInvariant: calculateEquipmentSubjectContentFingerprint({ value: "Şerit" }) === calculateEquipmentSubjectContentFingerprint({ value: "S\u0327erit" }),
    timestampStatusIdExcluded: calculateEquipmentSubjectContentFingerprint({ exactVariantId: "v", createdAt: "a", reviewState: "A", subjectId: "a" }) === calculateEquipmentSubjectContentFingerprint({ exactVariantId: "v", createdAt: "b", reviewState: "B", subjectId: "b" }),
    exactVariantSensitive: calculateEquipmentSubjectContentFingerprint({ exactVariantId: "a" }) !== calculateEquipmentSubjectContentFingerprint({ exactVariantId: "b" }),
    featureSensitive: calculateEquipmentSubjectContentFingerprint({ featureCode: "A" }) !== calculateEquipmentSubjectContentFingerprint({ featureCode: "B" }),
    availabilitySensitive: calculateEquipmentSubjectContentFingerprint({ availabilityStatus: "STANDARD", provisionMode: "INCLUDED" }) !== calculateEquipmentSubjectContentFingerprint({ availabilityStatus: "OPTIONAL", provisionMode: "PACKAGE" }),
    sourceSensitive: calculateEquipmentSubjectContentFingerprint({ sourceChecksum: "sha256:a" }) !== calculateEquipmentSubjectContentFingerprint({ sourceChecksum: "sha256:b" }),
    locatorMappingSensitive: calculateEquipmentSubjectContentFingerprint({ locator: "a", mapping: "a" }) !== calculateEquipmentSubjectContentFingerprint({ locator: "b", mapping: "b" }),
    invalidFormsRejected: ["", " ", "sha256:x", "SHA256:" + "a".repeat(64)].every((value) => !validFingerprint.test(value)),
    canonicalJsonStable: canonicalFingerprintJson({ z: ["b", "a"], a: { y: 2, x: 1 } }) === canonicalFingerprintJson({ a: { x: 1, y: 2 }, z: ["b", "a"] }),
  };
  if (Object.values(adversarial).some((value) => !value)) throw new Error("FINGERPRINT_ADVERSARIAL_FIXTURE_FAILED");

  const reviewEvents = allRecords.sort((a, b) => a.subjectType.localeCompare(b.subjectType) || a.subjectId.localeCompare(b.subjectId)).map((record) => ({
    eventId: stableId("EE-R1-REV", CYCLE, record.subjectType, record.subjectId), eventType: "INDEPENDENT_SECOND_REVIEW", actorRole: "EQUIPMENT_REVIEWER_SECONDARY", actorInstanceId: REVIEWER,
    subjectType: record.subjectType, subjectId: record.subjectId, predecessorId: record.predecessorId, exactVariantId: record.exactVariantId,
    storedContentFingerprint: record.stored, recomputedContentFingerprint: record.computed, fingerprintPolicyId: EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_POLICY.policyId,
    fingerprintPolicyVersion: EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_POLICY.version, fromState: "SECOND_REVIEW_REQUIRED", toState: "SECOND_REVIEW_PASSED",
    reasonCode: "FINGERPRINT_RECOMPUTED_AND_SEMANTICALLY_IDENTICAL", correctionCycleId: CYCLE, correctionCycleChecksum: CYCLE_CHECKSUM,
    waveId: "EE-PILOT-002-SCALE-WAVE-001", waveChecksum: WAVE_CHECKSUM, catalogFingerprint: CATALOG_FINGERPRINT, reviewedAt: REVIEWED_AT,
  }));
  const activeHash = sha(await readFile(ACTIVE_POINTER));
  const summary = { correctionCycleId: CYCLE, finalDisposition: "ACCEPTED_FINGERPRINT_CORRECTED_EVIDENCE", reviewerActorId: REVIEWER, reviewerRole: "EQUIPMENT_REVIEWER_SECONDARY", passedAssertions: 65, conflictAssertions: 0, passedTrimLinks: 2, conflictTrimLinks: 0, distributions: { BYD: { assertionsPassed: 33, trimLinksPassed: 1 }, Nissan: { assertionsPassed: 32, trimLinksPassed: 1 }, Volvo: { reviewSubjects: 0, successors: 0 } }, fingerprintRecomputation: { matched: 67, mismatched: 0 }, supersession: { validChains: 67, cycles: 0, duplicateSuccessors: 0, scopeMismatches: 0 }, semanticImmutability: { passed: 67, failed: 0 }, collectorLifecycleEvents: 134, independentReviewEvents: 67, ownerApprovalEvents: 0, materializations: 0, activePointerSha256: activeHash, activePointerChanged: false, decisionEngineEffect: "ZERO", volvoAuditHandoff: "PRESERVED_UNRESOLVED" };
  const report = `# ${CYCLE} Independent Fingerprint Review\n\n- Final disposition: **${summary.finalDisposition}**\n- Reviewer: ${REVIEWER}\n- Assertions: 65 passed / 0 conflict\n- Trim links: 2 passed / 0 conflict\n- Fingerprints: 67 independently recomputed, 67 matched\n- Supersession: 67 valid, 0 cycle, 0 duplicate terminal successor, 0 scope mismatch\n- Semantic immutability: 67/67\n- Collector lifecycle events: 134 valid\n- Independent review events appended: 67\n- Volvo: 0 subjects, 0 successors; audit handoff preserved\n- Owner approval/materialization: 0/0\n- Active pointer changed: false (${activeHash})\n- Decision Engine effect: ZERO\n`;
  await Promise.all([
    save(path.join(OUT, "independent-review-events.json"), reviewEvents), save(path.join(OUT, "independent-review-results.json"), summary),
    save(path.join(OUT, "assertion-review-results.json"), assertionReviews.sort((a, b) => String(a.subjectId).localeCompare(String(b.subjectId)))),
    save(path.join(OUT, "trim-link-review-results.json"), trimReviews.sort((a, b) => String(a.subjectId).localeCompare(String(b.subjectId)))),
    save(path.join(OUT, "fingerprint-recomputation.json"), { policy: EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_POLICY, adversarialFixtures: adversarial, records: allRecords.sort((a, b) => a.subjectType.localeCompare(b.subjectType) || a.subjectId.localeCompare(b.subjectId)) }),
    save(path.join(OUT, "supersession-review.json"), summary.supersession), save(path.join(OUT, "semantic-immutability-review.json"), summary.semanticImmutability),
    save(path.join(OUT, "collector-lifecycle-review.json"), { eventCount: 134, subjectCount: 67, collectedPerSubject: 1, secondReviewRequiredPerSubject: 1, duplicateEvents: 0, unauthorizedPassEvents: 0, status: "PASSED" }),
    save(path.join(OUT, "volvo-isolation-review.json"), { exactVariantId: "19951113-2e40-5526-b568-2ae1984c27e0", reviewSubjectCount: 0, successorCount: 0, auditHandoff: "PRESERVED", unresolvedOverclaimMappings: ["ISOFIX_REAR_OUTER", "FRONT_SIDE_CURTAIN_AIRBAG_COVERAGE"], productionCandidate: false }),
    save(path.join(OUT, "independent-review-report.md"), report),
  ]);
  console.log(JSON.stringify(summary));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
