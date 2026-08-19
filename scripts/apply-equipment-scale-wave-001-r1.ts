import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { calculateEquipmentSubjectContentFingerprint, EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_POLICY, validateEquipmentSubjectSuccessors, type CanonicalFingerprintValue } from "../features/vehicle-data/equipmentSubjectFingerprint";

const ROOT = process.cwd();
const WAVE = path.join(ROOT, "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-SCALE-WAVE-001");
const R1 = path.join(WAVE, "corrections/EE-PILOT-002-SCALE-WAVE-001-R1");
const CATALOG = path.join(ROOT, "data/production/catalog/releases/v0.55.2/catalog.json");
const CREATED_AT = "2026-08-19T06:00:00.000+03:00";
const CYCLE = "EE-PILOT-002-SCALE-WAVE-001-R1";
const COLLECTOR = "ACTOR-COLLECTOR-CODEX-CATALOG-001";
const INCLUDED = [
  { batchId: "EE-PILOT-002-BATCH-014", exactVariantId: "6cb56615-37ef-51a8-9202-a73e59d4e14b", brand: "BYD", model: "DOLPHIN", trim: "Comfort", expectedAssertions: 33 },
  { batchId: "EE-PILOT-002-BATCH-021", exactVariantId: "90e65f94-6fdb-5eea-ad7e-0b4e18435427", brand: "Nissan", model: "Qashqai", trim: "Platinum Premium e-POWER", expectedAssertions: 32 },
] as const;
const VOLVO = { batchId: "EE-PILOT-002-BATCH-025", exactVariantId: "19951113-2e40-5526-b568-2ae1984c27e0" } as const;

const sha = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const id = (prefix: string, ...parts: string[]) => `${prefix}-${createHash("sha256").update(parts.join("\0")).digest("hex").slice(0, 24).toUpperCase()}`;
const load = async (file: string) => JSON.parse(await readFile(file, "utf8"));
const writeJson = async (file: string, value: unknown) => { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`); };
const batchFile = (batchId: string, file: string) => path.join(WAVE, "micro-batches", batchId, file);

type Assertion = Record<string, unknown> & { assertionId: string; exactVariantId: string; featureCode: string; source: { sourceId: string; artifactSha256: string }; locator: CanonicalFingerprintValue; semanticMappingId?: string; availabilityStatus: string; provisionMode: string; market: string; modelYearFrom: number; modelYearTo: number; evidencePolarity: string; confidence: string; conflictState: string };
type TrimLink = Record<string, unknown> & { linkId: string; exactVariantId: string; canonicalTrimId: string; market: string; modelYearFrom: number; modelYearTo: number; assertionIds: string[]; sourceId: string };
type Mapping = { mappingId: string; sourceRowId: string };
type ReviewEvent = { eventId: string; subjectId: string; newState: string; reasonCode: string };

function assertionPayload(assertion: Assertion, mapping: Mapping): CanonicalFingerprintValue {
  return {
    recordType: "EQUIPMENT_ASSERTION_SEMANTIC_CONTENT", recordVersion: "1.0.0",
    exactVariantId: assertion.exactVariantId, featureCode: assertion.featureCode,
    availabilityStatus: assertion.availabilityStatus, provisionMode: assertion.provisionMode,
    marketApplicability: assertion.market, modelYearApplicability: { from: assertion.modelYearFrom, to: assertion.modelYearTo },
    trimApplicability: String(assertion.canonicalTrimId ?? "EXACT_VARIANT"), powertrainApplicability: "EXACT_CATALOG_POWERTRAIN",
    sourceIds: [assertion.source.sourceId], rawArtifactChecksums: [assertion.source.artifactSha256], sourceRowIds: [mapping.sourceRowId],
    locator: assertion.locator, semanticMappingIds: [mapping.mappingId], packageLinkIds: assertion.canonicalPackageId ? [String(assertion.canonicalPackageId)] : [],
    evidenceSemantics: { polarity: assertion.evidencePolarity, confidence: assertion.confidence, conflictState: assertion.conflictState },
  };
}

function trimPayload(input: typeof INCLUDED[number], link: TrimLink, assertions: Assertion[], catalogVariant: Record<string, unknown>): CanonicalFingerprintValue {
  const sources = [...new Map(assertions.map((item) => [item.source.sourceId, item.source.artifactSha256])).entries()].sort(([a], [b]) => a.localeCompare(b));
  return {
    recordType: "EQUIPMENT_TRIM_LINK_SEMANTIC_CONTENT", recordVersion: "1.0.0", exactVariantId: link.exactVariantId,
    canonicalBrand: input.brand, canonicalModel: input.model, canonicalTrim: input.trim, canonicalTrimId: link.canonicalTrimId,
    powertrain: (catalogVariant.powertrain ?? null) as CanonicalFingerprintValue, transmission: ((catalogVariant.powertrain as Record<string, unknown> | undefined)?.transmission ?? null) as CanonicalFingerprintValue,
    modelYear: link.modelYearFrom, market: link.market,
    identitySources: sources.map(([sourceId, artifactSha256]) => ({ sourceId, artifactSha256 })),
    locators: assertions.map((item) => item.locator).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    applicability: { from: link.modelYearFrom, to: link.modelYearTo, exactVariantOnly: true },
  };
}

async function main() {
  const [catalog, reviewEvents] = await Promise.all([load(CATALOG), load(path.join(WAVE, "second-review/independent-review-events.json"))]) as [{ records: Array<{ variant: Record<string, unknown> & { id: string } }> }, ReviewEvent[]];
  const reviewBySubject = new Map(reviewEvents.map((event) => [event.subjectId, event]));
  const originalFiles = [
    ...INCLUDED.flatMap((item) => [batchFile(item.batchId, "assertions.json"), batchFile(item.batchId, "trim-links.json")]),
    path.join(WAVE, "second-review/assertion-review-results.json"),
    path.join(WAVE, "second-review/trim-link-review-results.json"),
    path.join(WAVE, "second-review/independent-review-events.json"),
  ];
  const originalHashes = Object.fromEntries(await Promise.all(originalFiles.map(async (file) => [path.relative(ROOT, file), sha(await readFile(file))])));
  const successors: Array<Record<string, unknown>> = [];
  const trimSuccessors: Array<Record<string, unknown>> = [];
  const lifecycleEvents: Array<Record<string, unknown>> = [];
  const reviewSubjects: Array<Record<string, unknown>> = [];
  const semanticHashes: Array<Record<string, unknown>> = [];

  for (const input of INCLUDED) {
    const [assertionDoc, trimDoc, mappingDoc] = await Promise.all([load(batchFile(input.batchId, "assertions.json")), load(batchFile(input.batchId, "trim-links.json")), load(batchFile(input.batchId, "semantic-mappings.json"))]) as [{ assertions: Assertion[] }, { trimLinks: TrimLink[] }, { mappings: Mapping[] }];
    if (assertionDoc.assertions.length !== input.expectedAssertions || trimDoc.trimLinks.length !== 1) throw new Error(`R1_SCOPE_COUNT_MISMATCH:${input.batchId}`);
    const mappingById = new Map(mappingDoc.mappings.map((mapping) => [mapping.mappingId, mapping]));
    const catalogRecord = catalog.records.find((record) => record.variant.id === input.exactVariantId);
    if (!catalogRecord) throw new Error(`CATALOG_VARIANT_MISSING:${input.exactVariantId}`);
    const batchSuccessors = assertionDoc.assertions.map((original) => {
      const mapping = original.semanticMappingId ? mappingById.get(original.semanticMappingId) : undefined;
      if (!mapping) throw new Error(`SEMANTIC_MAPPING_MISSING:${original.assertionId}`);
      const conflictReview = reviewBySubject.get(original.assertionId);
      if (!conflictReview || conflictReview.newState !== "CONFLICT_REVIEW_REQUIRED" || conflictReview.reasonCode !== "SUBJECT_CONTENT_FINGERPRINT_MISSING") throw new Error(`EXPECTED_FINGERPRINT_REVIEW_CONFLICT_MISSING:${original.assertionId}`);
      const contentFingerprint = calculateEquipmentSubjectContentFingerprint(assertionPayload(original, mapping));
      const assertionId = id("EE-AST", CYCLE, original.assertionId, contentFingerprint);
      const successor = { ...original, assertionId, supersedesAssertionId: original.assertionId, contentFingerprint, verificationState: "PROVISIONAL", correctionContext: { correctionCycleId: CYCLE, correctionReason: "SUBJECT_CONTENT_FINGERPRINT_MISSING", fingerprintPolicyId: EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_POLICY.policyId, fingerprintPolicyVersion: EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_POLICY.version, predecessorSecondReviewEventId: conflictReview.eventId, collectorRole: "EQUIPMENT_COLLECTOR_PRIMARY", collectorInstanceId: COLLECTOR } };
      semanticHashes.push({ subjectId: assertionId, predecessorId: original.assertionId, semanticContentHashBefore: calculateEquipmentSubjectContentFingerprint(assertionPayload(original, mapping)), semanticContentHashAfter: contentFingerprint, unchanged: true });
      for (const toState of ["COLLECTED", "SECOND_REVIEW_REQUIRED"]) lifecycleEvents.push({ reviewEventId: id("EE-REV", CYCLE, assertionId, toState), subjectType: "ASSERTION", subjectId: assertionId, fromState: toState === "SECOND_REVIEW_REQUIRED" ? "COLLECTED" : undefined, toState, actorRole: "EQUIPMENT_COLLECTOR_PRIMARY", actorInstanceId: COLLECTOR, reviewedAt: CREATED_AT, reasonCode: toState === "COLLECTED" ? "FINGERPRINT_SUCCESSOR_COLLECTED" : "INDEPENDENT_FINGERPRINT_REVIEW_REQUIRED", correctionCycleId: CYCLE });
      reviewSubjects.push({ microBatchId: input.batchId, exactVariantId: input.exactVariantId, subjectType: "ASSERTION", subjectId: assertionId, predecessorId: original.assertionId, contentFingerprint, fingerprintPolicyId: EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_POLICY.policyId, fingerprintPolicyVersion: EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_POLICY.version, sourceChecksums: [original.source.artifactSha256], semanticImmutabilityHash: contentFingerprint, expectedReviewerRole: "EQUIPMENT_REVIEWER_SECONDARY", riskFlags: ["FINGERPRINT_ONLY_CORRECTION", "PROVISIONAL_SUCCESSOR"] });
      return successor;
    });
    successors.push(...batchSuccessors);
    const originalLink = trimDoc.trimLinks[0];
    const linkReview = reviewBySubject.get(originalLink.linkId);
    if (!linkReview || linkReview.reasonCode !== "SUBJECT_CONTENT_FINGERPRINT_MISSING") throw new Error(`EXPECTED_TRIM_FINGERPRINT_REVIEW_CONFLICT_MISSING:${originalLink.linkId}`);
    const linkPayload = trimPayload(input, originalLink, assertionDoc.assertions, catalogRecord.variant);
    const contentFingerprint = calculateEquipmentSubjectContentFingerprint(linkPayload);
    const linkId = id("EE-LINK-TRIM", CYCLE, originalLink.linkId, contentFingerprint);
    const linkSuccessor = { ...originalLink, linkId, supersedesTrimLinkId: originalLink.linkId, contentFingerprint, verificationState: "PROVISIONAL", reviewState: "SECOND_REVIEW_REQUIRED", correctionContext: { correctionCycleId: CYCLE, correctionReason: "SUBJECT_CONTENT_FINGERPRINT_MISSING", fingerprintPolicyId: EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_POLICY.policyId, fingerprintPolicyVersion: EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_POLICY.version, predecessorSecondReviewEventId: linkReview.eventId, collectorRole: "EQUIPMENT_COLLECTOR_PRIMARY", collectorInstanceId: COLLECTOR } };
    trimSuccessors.push(linkSuccessor);
    semanticHashes.push({ subjectId: linkId, predecessorId: originalLink.linkId, semanticContentHashBefore: contentFingerprint, semanticContentHashAfter: contentFingerprint, unchanged: true });
    for (const toState of ["COLLECTED", "SECOND_REVIEW_REQUIRED"]) lifecycleEvents.push({ reviewEventId: id("EE-REV", CYCLE, linkId, toState), subjectType: "TRIM_LINK", subjectId: linkId, fromState: toState === "SECOND_REVIEW_REQUIRED" ? "COLLECTED" : undefined, toState, actorRole: "EQUIPMENT_COLLECTOR_PRIMARY", actorInstanceId: COLLECTOR, reviewedAt: CREATED_AT, reasonCode: toState === "COLLECTED" ? "FINGERPRINT_SUCCESSOR_COLLECTED" : "INDEPENDENT_FINGERPRINT_REVIEW_REQUIRED", correctionCycleId: CYCLE });
    reviewSubjects.push({ microBatchId: input.batchId, exactVariantId: input.exactVariantId, subjectType: "TRIM_LINK", subjectId: linkId, predecessorId: originalLink.linkId, contentFingerprint, fingerprintPolicyId: EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_POLICY.policyId, fingerprintPolicyVersion: EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_POLICY.version, sourceChecksums: [...new Set(assertionDoc.assertions.map((item) => item.source.artifactSha256))].sort(), semanticImmutabilityHash: contentFingerprint, expectedReviewerRole: "EQUIPMENT_REVIEWER_SECONDARY", riskFlags: ["FINGERPRINT_ONLY_CORRECTION", "PROVISIONAL_SUCCESSOR"] });
  }
  if (successors.length !== 65 || trimSuccessors.length !== 2 || reviewSubjects.length !== 67 || lifecycleEvents.length !== 134) throw new Error("R1_EXPECTED_SUBJECT_COUNTS_MISMATCH");
  validateEquipmentSubjectSuccessors([
    ...successors.map((item) => ({ subjectId: String(item.assertionId), supersedesSubjectId: String(item.supersedesAssertionId), scopeKey: `${item.exactVariantId}:${item.featureCode}` })),
  ].flatMap((successor) => [{ subjectId: successor.supersedesSubjectId!, scopeKey: successor.scopeKey }, successor]));
  validateEquipmentSubjectSuccessors(trimSuccessors.flatMap((item) => {
    const scopeKey = `${item.exactVariantId}:${item.canonicalTrimId}`;
    return [{ subjectId: String(item.supersedesTrimLinkId), scopeKey }, { subjectId: String(item.linkId), supersedesSubjectId: String(item.supersedesTrimLinkId), scopeKey }];
  }));

  const volvoBatch = path.join(WAVE, "micro-batches", VOLVO.batchId);
  const [volvoAssertions, volvoAssociations, volvoTrimLinks, volvoLedger, volvoMappings, sourceMeta] = await Promise.all([
    load(path.join(volvoBatch, "assertions.json")), load(path.join(volvoBatch, "association-observations.json")), load(path.join(volvoBatch, "trim-links.json")),
    load(path.join(volvoBatch, "research-ledger.json")), load(path.join(volvoBatch, "semantic-mappings.json")),
    load(path.join(ROOT, "data/cars/vehicle_evidence/source_snapshots/SRC-000089/2026-08-19/metadata.json")),
  ]);
  const volvoCatalog = catalog.records.find((record) => record.variant.id === VOLVO.exactVariantId);
  if (!volvoCatalog) throw new Error("VOLVO_CATALOG_RECORD_MISSING");
  const volvoAffected = {
    assertionIds: volvoAssertions.assertions.map((item: { assertionId: string }) => item.assertionId),
    associationIds: volvoAssociations.observations.map((item: { observationId: string }) => item.observationId),
    trimLinkIds: volvoTrimLinks.trimLinks.map((item: { linkId: string }) => item.linkId),
    ledgerEntryIds: volvoLedger.entries.filter((item: { assertionIds: string[]; associationObservationIds: string[] }) => item.assertionIds.length || item.associationObservationIds.length).map((item: { ledgerEntryId: string }) => item.ledgerEntryId),
    mappingIds: volvoMappings.mappings.map((item: { mappingId: string }) => item.mappingId),
  };
  const handoff = {
    handoffId: "CATALOG-EVIDENCE-AUDIT-HANDOFF-VOLVO-EX30-P4-SMER-001", status: "AUDIT_NOT_STARTED", exactVariantId: VOLVO.exactVariantId,
    catalogIdentity: { brand: "Volvo", model: "EX30", trim: "P4 Long Range Ultra", modelYear: 2026, market: "TR", exactCatalogRecord: volvoCatalog },
    sourceIdentity: { sourceText: "EX30 Ultra, Single Motor Extended Range, Elektrikli (2026)", sourceId: sourceMeta.sourceId, artifactReference: sourceMeta.artifactReference, artifactSha256: sourceMeta.artifactSha256 },
    mismatchMatrix: [
      { field: "brand/model", catalog: "Volvo EX30", source: "EX30", status: "ALIGNED" },
      { field: "trim", catalog: "P4 Long Range Ultra", source: "Ultra", status: "UNRESOLVED_ALIAS" },
      { field: "powertrain", catalog: "P4 Long Range", source: "Single Motor Extended Range", status: "UNRESOLVED_ALIAS" },
      { field: "modelYear/market", catalog: "MY2026/TR", source: "2026/TR public configurator", status: "PARTIALLY_ALIGNED_IDENTITY_BRIDGE_REQUIRED" },
    ],
    aliasCandidates: [{ alias: "P4", candidate: "Single Motor Extended Range", status: "UNVERIFIED_DO_NOT_USE" }],
    unsupportedAssumptions: ["P4_EQUALS_SINGLE_MOTOR_EXTENDED_RANGE", "CATALOG_LONG_RANGE_EQUALS_OFFICIAL_EXTENDED_RANGE", "ULTRA_LABEL_ALONE_PROVES_CANONICAL_TRIM_IDENTITY"],
    affectedEvidence: volvoAffected,
    semanticMappingRisk: { requiresSeparateCorrectionIfIdentityPasses: true, featureCodes: ["ISOFIX_REAR_OUTER", "FRONT_SIDE_CURTAIN_AIRBAG_COVERAGE"], reason: "Source wording does not establish the exact controlled sub-scope without additional semantic review." },
    requiredOfficialSources: ["Volvo Turkey MY2026 exact configuration/derivative code table", "Volvo Turkey price/configurator document linking P4 to Single Motor Extended Range", "Official trim/powertrain alias registry or homologation/configuration code"],
    auditQuestions: ["Is P4 an internal Turkey catalog naming?", "Can P4 be officially mapped to Single Motor Extended Range?", "Can exact MY2026/TR applicability be established?", "Is Ultra exact?", "Should the catalog be corrected, aliased, or quarantined?", "Are persisted offer/card references affected?", "Do semantic mapping overclaims require a separate correction even if identity passes?"],
    stopConditions: ["NO_OFFICIAL_IDENTITY_BRIDGE", "MODEL_YEAR_APPLICABILITY_UNRESOLVED", "OFFICIAL_SOURCE_CONFLICT", "ALIAS_ONLY_INFERRED_FROM_TECHNICAL_SIMILARITY"],
    recommendedDispositionOptions: ["VALID_CURRENT_WITH_VERIFIED_ALIAS", "IDENTITY_FIELD_MISMATCH", "PROVENANCE_INSUFFICIENT", "OFFICIAL_SOURCES_CONFLICT", "QUARANTINE_PENDING_EVIDENCE"],
    constraints: ["NO_CATALOG_MUTATION", "NO_ALIAS_CREATION", "NO_EQUIPMENT_SUCCESSOR", "NO_AUDIT_RESULT_IN_HANDOFF"], createdAt: CREATED_AT,
  };

  const originalHashesAfter = Object.fromEntries(await Promise.all(originalFiles.map(async (file) => [path.relative(ROOT, file), sha(await readFile(file))])));
  if (JSON.stringify(originalHashes) !== JSON.stringify(originalHashesAfter)) throw new Error("R1_ORIGINAL_SUBJECT_MUTATED");
  const core = { correctionCycleId: CYCLE, state: "CORRECTION_SECOND_REVIEW_REQUIRED", fingerprintPolicy: EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_POLICY, assertionSuccessorCount: successors.length, trimLinkSuccessorCount: trimSuccessors.length, reviewSubjectCount: reviewSubjects.length, lifecycleEventCount: lifecycleEvents.length, distributions: { BYD: { assertions: 33, trimLinks: 1 }, Nissan: { assertions: 32, trimLinks: 1 }, Volvo: { successors: 0, auditHandoff: 1 } }, originalHashes, activePointerChanged: false, decisionEngineEffect: "ZERO", createdAt: CREATED_AT };
  const manifest = { ...core, canonicalChecksum: sha(JSON.stringify(core)) };
  await Promise.all([
    writeJson(path.join(R1, "manifest.json"), manifest), writeJson(path.join(R1, "assertion-successors.json"), { assertions: successors }),
    writeJson(path.join(R1, "trim-link-successors.json"), { trimLinks: trimSuccessors }), writeJson(path.join(R1, "collector-review-events.json"), { events: lifecycleEvents }),
    writeJson(path.join(R1, "independent-review-index.json"), { correctionCycleId: CYCLE, reviewStatus: "INDEPENDENT_REVIEW_NOT_STARTED", expectedReviewerRole: "EQUIPMENT_REVIEWER_SECONDARY", subjects: reviewSubjects }),
    writeJson(path.join(R1, "semantic-immutability.json"), { records: semanticHashes }), writeJson(path.join(R1, "original-immutability.json"), { status: "BYTE_IDENTICAL", before: originalHashes, after: originalHashesAfter }),
    writeJson(path.join(R1, "fingerprint-policy.json"), EQUIPMENT_SUBJECT_CONTENT_FINGERPRINT_POLICY),
    writeJson(path.join(R1, "volvo-catalog-evidence-audit-handoff/handoff.json"), handoff),
    writeJson(path.join(R1, "volvo-catalog-evidence-audit-handoff/affected-subjects.json"), volvoAffected),
    writeJson(path.join(R1, "volvo-catalog-evidence-audit-handoff/terminal-disposition.json"), { microBatchId: VOLVO.batchId, exactVariantId: VOLVO.exactVariantId, disposition: "CATALOG_EVIDENCE_AUDIT_REQUIRED", assertions: { count: 2, reviewState: "CONFLICT_REVIEW_REQUIRED" }, associations: { count: 24, reviewState: "CONFLICT_REVIEW_REQUIRED" }, trimLinks: { count: 1, reviewState: "CONFLICT_REVIEW_REQUIRED" }, successorCount: 0, auditHandoffOnly: true }),
  ]);
  const files = ["manifest.json", "assertion-successors.json", "trim-link-successors.json", "collector-review-events.json", "independent-review-index.json", "semantic-immutability.json", "original-immutability.json", "fingerprint-policy.json", "volvo-catalog-evidence-audit-handoff/handoff.json", "volvo-catalog-evidence-audit-handoff/affected-subjects.json", "volvo-catalog-evidence-audit-handoff/terminal-disposition.json"];
  await writeJson(path.join(R1, "checksums.json"), Object.fromEntries(await Promise.all(files.map(async (file) => [file, sha(await readFile(path.join(R1, file)))]))));
  console.log(JSON.stringify({ correctionCycleId: CYCLE, checksum: manifest.canonicalChecksum, assertions: successors.length, trimLinks: trimSuccessors.length, lifecycleEvents: lifecycleEvents.length, reviewSubjects: reviewSubjects.length, volvoSuccessors: 0 }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
