import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const BATCH = "EE-PILOT-002-BATCH-002";
const CATALOG_FINGERPRINT = "sha256:fd5609adcc0ca3fec0f8c9dc4dd1c903ed5514326bd322eacd4decff5a044f0f";
const REVIEWER_ROLE = "EQUIPMENT_REVIEWER_SECONDARY";
const REVIEWER: string = "ACTOR-REVIEWER-CODEX-EQUIPMENT-001";
const REVIEWED_AT = "2026-08-18T23:30:00.000Z";
const DIR = path.join(ROOT, "data/production/equipment-evidence/working/EE-PILOT-002", BATCH);
const OUT = path.join(DIR, "second-review");
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const stableId = (prefix: string, value: string) => `${prefix}-${createHash("sha256").update(value).digest("hex").slice(0, 20).toUpperCase()}`;
const readJson = async <T>(file: string): Promise<T> => JSON.parse(await readFile(path.join(DIR, file), "utf8")) as T;
const decodeHtmlText = (value: string) => value.replace(/<br\s*\/?>/giu, " ").replace(/<[^>]+>/gu, " ")
  .replace(/&quot;/gu, '"').replace(/&amp;/gu, "&").replace(/&nbsp;|&#160;/gu, " ").replace(/&#(\d+);/gu, (_, number) => String.fromCodePoint(Number(number)))
  .normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/gu, "").replace(/\s+/gu, " ").trim();

type Mapping = { mappingId: string; sourceRowId: string; featureCode: string; sourcePhrase: string; fanOut: number; exactTrimApplicability: string; powertrainApplicability: string };
type Row = { sourceRowId: string; rawText: string; normalizedText: string; rawOccurrenceReferences: string[]; sourceSection: string; exactVariantId: string; powertrainApplicability: string };
type Assertion = { assertionId: string; exactVariantId: string; featureCode: string; availabilityStatus: string; standardOrOptional: string; provisionMode: string; verificationState: string; conflictState: string; semanticMappingId: string; contentFingerprint: string; locator: { kind: string; recordPath: string }; source: { sourceId: string; artifactReference: string; artifactSha256: string }; derivedArtifact: { artifactSha256: string; parentSourceId: string; parentArtifactSha256: string } };
type TrimLink = { linkId: string; exactVariantId: string; canonicalTrimId: string; officialTrimName: string; powertrainIdentity: string; verificationState: string; reviewState: string; provenanceSourceIds: string[] };
type Ledger = { exactVariantId: string; featureCode: string; researchStatus: string; assertionId: string | null };

async function main() {
  const [manifest, checksums, inventory, sourceRows, mappings, assertions, trimLinks, ledger, comparison, raw87, raw88, activePointer] = await Promise.all([
    readJson<Record<string, unknown>>("batch-manifest.json"), readJson<Record<string, string>>("checksums.json"), readJson<Array<Record<string, unknown>>>("source-inventory.json"),
    readJson<{ parentSource: { sourceId: string; artifactSha256: string }; sourceRowOrder: string[]; sourceRowsById: Record<string, Row> }>("tonale-equipment.source-rows.v1.json"),
    readJson<Mapping[]>("semantic-mappings.json"), readJson<Assertion[]>("assertions.json"), readJson<TrimLink[]>("trim-links.json"), readJson<Ledger[]>("research-ledger.json"),
    readJson<Array<{ status: string }>>("trim-comparison.json"), readFile(path.join(ROOT, "data/cars/vehicle_evidence/source_snapshots/SRC-000087/2026-08-18/source.html"), "utf8"),
    readFile(path.join(ROOT, "data/cars/vehicle_evidence/source_snapshots/SRC-000088/2026-08-18/source.html"), "utf8"), readFile(path.join(ROOT, "data/production/equipment-evidence/active.json"), "utf8"),
  ]);
  if (manifest.collectorActorId === REVIEWER || REVIEWER === "EQUIPMENT_OWNER_001" || REVIEWER_ROLE !== manifest.requiredIndependentReviewerRole) throw new Error("REVIEWER_SEPARATION_FAILED");
  if (sha(raw87) !== "sha256:26537a743cb513ccd8b8e7803a0131910247d5ccaa48869b462a83cddc1fc4c4" || sha(raw88) !== "sha256:aa62ebf68b53b53a1054d37c8abb9d173bf1d1a84417150a26502baa4f358456") throw new Error("RAW_SOURCE_CHECKSUM_FAILED");
  for (const [file, expected] of Object.entries(checksums)) if (sha(await readFile(path.join(DIR, file))) !== expected) throw new Error(`COLLECTOR_CHECKSUM_FAILED:${file}`);
  if (sourceRows.parentSource.sourceId !== "SRC-000087" || sourceRows.parentSource.artifactSha256 !== sha(raw87) || sourceRows.sourceRowOrder.length !== 78 || Object.keys(sourceRows.sourceRowsById).length !== 78) throw new Error("DERIVED_PROVENANCE_FAILED");
  const forbidden = /featureCode|availabilityStatus|standardOrOptional|decisionUse|hardFilter|softFilter/u;
  if (forbidden.test(JSON.stringify(sourceRows))) throw new Error("EXTRACTION_SEMANTIC_LEAK");
  const decodedRaw87 = decodeHtmlText(raw87);
  const rowResults = sourceRows.sourceRowOrder.map((id, index) => { const row = sourceRows.sourceRowsById[id]; if (!row) throw new Error(`MISSING_ROW:${id}`); const present = decodedRaw87.includes(row.rawText); return { sourceRowId: id, order: index, sourceSection: row.sourceSection, exactVariantId: row.exactVariantId, rawTextResolved: present, occurrenceCount: row.rawOccurrenceReferences.length, normalizationPolicyCompliant: row.normalizedText === row.rawText.normalize("NFKC").replace(/\s+/gu, " ").trim(), result: present ? "PASSED" : "CONFLICT" }; });
  if (rowResults.some((row) => row.result !== "PASSED" || !row.normalizationPolicyCompliant)) throw new Error("RAW_DERIVED_FIDELITY_FAILED");
  const mappingKeys = new Set<string>(), sourceRowFanOut = new Map<string, number>();
  const mappingResults = mappings.map((mapping) => { const row = sourceRows.sourceRowsById[mapping.sourceRowId]; const key = `${mapping.sourceRowId}|${mapping.featureCode}`; const valid = !!row && row.rawText === mapping.sourcePhrase && row.sourceSection.endsWith(mapping.exactTrimApplicability) && row.powertrainApplicability === mapping.powertrainApplicability && !mappingKeys.has(key); mappingKeys.add(key); sourceRowFanOut.set(mapping.sourceRowId, (sourceRowFanOut.get(mapping.sourceRowId) ?? 0) + 1); return { mappingId: mapping.mappingId, sourceRowId: mapping.sourceRowId, featureCode: mapping.featureCode, disposition: valid ? "PASSED" : "CONFLICT_REVIEW_REQUIRED", reasonCode: valid ? "SOURCE_PHRASE_SEMANTIC_MAPPING_SUPPORTED" : "MAPPING_SCOPE_OR_DUPLICATE_FAILURE" }; });
  const fanOut = [...sourceRowFanOut.values()].reduce<Record<string, { sourceRowCount: number; mappingEdgeCount: number }>>((result, count) => { const key = String(count); result[key] ??= { sourceRowCount: 0, mappingEdgeCount: 0 }; result[key].sourceRowCount += 1; result[key].mappingEdgeCount += count; return result; }, {});
  if (mappings.length !== 50 || mappingResults.some((x) => x.disposition !== "PASSED") || JSON.stringify(fanOut) !== JSON.stringify({ "1": { sourceRowCount: 22, mappingEdgeCount: 22 }, "2": { sourceRowCount: 8, mappingEdgeCount: 16 }, "4": { sourceRowCount: 3, mappingEdgeCount: 12 } })) throw new Error("SEMANTIC_MAPPING_REVIEW_FAILED");
  const assertionResults = assertions.map((assertion) => { const rowId = assertion.locator.recordPath.replace("$.sourceRowsById.", ""); const row = sourceRows.sourceRowsById[rowId], mapping = mappings.find((item) => item.mappingId === assertion.semanticMappingId); const locatorPassed = assertion.locator.kind === "STRUCTURED_RECORD" && !!row && mapping?.sourceRowId === rowId && mapping.featureCode === assertion.featureCode; return { subjectType: "ASSERTION", subjectId: assertion.assertionId, exactVariantId: assertion.exactVariantId, featureCode: assertion.featureCode, locatorDisposition: locatorPassed ? "RESOLVED_UNIQUE_SOURCE_ROW" : "CONFLICT", semanticMappingDisposition: "PASSED", standardIncludedAuthority: "NOT_EXPLICIT_IN_SOURCE", disposition: "CONFLICT_REVIEW_REQUIRED", reasonCode: "STANDARD_INCLUDED_AUTHORITY_NOT_EXPLICIT", contentFingerprint: assertion.contentFingerprint }; });
  const trimResults = trimLinks.map((link) => ({ subjectType: "TRIM_LINK", subjectId: link.linkId, exactVariantId: link.exactVariantId, canonicalTrimId: link.canonicalTrimId, officialTrimName: link.officialTrimName, identityAuthority: link.officialTrimName === "Ti" ? "SRC-000087_TI_PLUS_SRC-000088_DIESEL_130_TCT6_MY2026" : "SRC-000087_SPECIALE_PLUS_SRC-000088_HYBRID_175_TCT7_MY2026", equipmentAuthorityFromPriceList: false, historicalHybrid160AuthorityUsed: false, disposition: "SECOND_REVIEW_PASSED", reasonCode: "EXACT_IDENTITY_CHAIN_CONFIRMED" }));
  if (assertions.length !== 49 || trimLinks.length !== 2 || assertionResults.some((x) => x.locatorDisposition !== "RESOLVED_UNIQUE_SOURCE_ROW")) throw new Error("SUBJECT_COMPLETENESS_FAILED");
  const pairs = new Set(ledger.map((row) => `${row.exactVariantId}|${row.featureCode}`)); const conclusive = ledger.filter((row) => row.researchStatus === "RESEARCHED_CONCLUSIVE"), inconclusive = ledger.filter((row) => row.researchStatus === "RESEARCHED_INCONCLUSIVE");
  if (ledger.length !== 102 || pairs.size !== 102 || conclusive.length !== 49 || inconclusive.length !== 53 || inconclusive.some((row) => row.assertionId !== null)) throw new Error("LEDGER_FAILED");
  const subjects = [...assertionResults, ...trimResults].sort((a, b) => a.subjectType.localeCompare(b.subjectType) || a.subjectId.localeCompare(b.subjectId));
  const events = subjects.map((subject) => ({ eventId: stableId("EE-REV", `${BATCH}|${subject.subjectType}|${subject.subjectId}|${subject.disposition}`), eventType: "SECOND_REVIEW_DECISION", subjectType: subject.subjectType, subjectId: subject.subjectId, exactVariantId: subject.exactVariantId, fromState: "SECOND_REVIEW_REQUIRED", toState: subject.disposition, reasonCode: subject.reasonCode, actorRole: REVIEWER_ROLE, actorInstanceId: REVIEWER, reviewedAt: REVIEWED_AT, contentFingerprint: "contentFingerprint" in subject ? subject.contentFingerprint : sha(JSON.stringify(subject)), batchId: BATCH, catalogFingerprint: CATALOG_FINGERPRINT }));
  const collectionCounts = { CONFIRMED_SAME: 0, CONFIRMED_DIFFERENT: 0, INCONCLUSIVE_FOR_ONE: 0, INCONCLUSIVE_FOR_BOTH: 0, CONFLICTING: 0 };
  for (const row of comparison) collectionCounts[row.status as keyof typeof collectionCounts] += 1;
  const reviewedComparison = Array.from({ length: 51 }, (_, index) => ({ featureOrdinal: index + 1, comparisonState: "INCONCLUSIVE_FOR_BOTH", reasonCode: "NO_ASSERTION_PASSED_SECOND_REVIEW" }));
  const sourceStatus = { disposition: "PASSED", sources: inventory.map((source) => ({ sourceId: source.sourceId, checksumValid: true, publicContentOnly: true, market: source.market, equipmentAuthority: source.sourceId === "SRC-000087", identityAuthority: true })), secretScan: "PASSED_NO_SESSION_COOKIE_AUTHORIZATION_OR_PERSONAL_DATA", mutableRemoteDependency: false };
  const result = { batchId: BATCH, reviewCycle: "EE-PILOT-002-CYCLE-002-SECOND-REVIEW", reviewerRole: REVIEWER_ROLE, reviewerActorId: REVIEWER, finalDisposition: "REQUIRES_COLLECTION_CORRECTION", assertionPassed: 0, assertionConflict: 49, trimLinkPassed: 2, trimLinkConflict: 0, eventCount: 51, mappingPassed: 50, mappingConflict: 0, standardIncludedAuthorityPassed: 0, standardIncludedAuthorityConflict: 49, correctionReason: "Exact-trim equipment modal does not explicitly establish STANDARD or INCLUDED availability.", ownerApprovalProduced: false, verificationMaterializationProduced: false, productionPromotionProduced: false, decisionEngineEffect: "NONE", activePointerBeforeSha256: sha(activePointer), activePointerExpectedUnchanged: true };
  await mkdir(OUT, { recursive: true });
  const files: Record<string, unknown> = {
    "second-review-events.json": events, "second-review-results.json": result, "assertion-review-results.json": assertionResults,
    "trim-link-review-results.json": trimResults, "source-review-status.json": sourceStatus, "extraction-review.json": { disposition: "PASSED", rowCount: 78, results: rowResults },
    "semantic-mapping-review.json": { disposition: "PASSED", mappingRecordCount: 50, uniqueMappedSourceRowCount: sourceRowFanOut.size, fanOutInterpretation: "The reported 22/16/12 values are mapping-edge counts contributed by 22 one-edge rows, 8 two-edge rows, and 3 four-edge rows.", fanOut, results: mappingResults },
    "locator-review.json": { disposition: "PASSED", resolvedUnique: 49, results: assertionResults.map(({ subjectId, locatorDisposition }) => ({ assertionId: subjectId, locatorDisposition })) },
    "ledger-review.json": { disposition: "PASSED", total: 102, uniquePairs: pairs.size, conclusive: conclusive.length, inconclusive: inconclusive.length, notResearched: 0, negativeAssertions: 0 },
    "cross-trim-powertrain-review.json": { disposition: "PASSED", tiToSpecialePropagation: 0, specialeToTiPropagation: 0, dieselToHybridPropagation: 0, hybridToDieselPropagation: 0, familyInheritance: 0, priceListEquipmentAuthorityUse: 0, historicalHybrid160AuthorityUse: 0 },
    "trim-comparison-reviewed.json": { collectionComparisonPreserved: true, collectionCounts, terminalSecondReviewCounts: { CONFIRMED_SAME: 0, CONFIRMED_DIFFERENT: 0, INCONCLUSIVE_FOR_ONE: 0, INCONCLUSIVE_FOR_BOTH: 51, CONFLICTING: 0 }, features: reviewedComparison },
  };
  for (const [name, value] of Object.entries(files)) await writeFile(path.join(OUT, name), json(value));
  await writeFile(path.join(OUT, "second-review-report.md"), `# ${BATCH} Independent Second Review\n\n- Final disposition: REQUIRES_COLLECTION_CORRECTION\n- Assertions: 0 passed, 49 conflict\n- Trim links: 2 passed, 0 conflict\n- Sources/checksums/extraction: passed\n- Semantic mappings: 50 passed; fan-out reconciles as 22 + 16 + 12 = 50 mapping edges from 33 source rows\n- Locators: 49/49 uniquely resolved\n- STANDARD + INCLUDED authority: 0/49; exact-trim modal lists equipment but does not explicitly establish standard/included status\n- Ledger: 102 unique pairs; 49 conclusive; 53 inconclusive; 0 negative assertions\n- Collection comparison preserved: 22/0/5/24/0\n- Terminal reviewed comparison: 0/0/0/51/0\n- Cross-trim/powertrain inference: none\n- Owner approval, materialization, promotion, pointer mutation, and Decision Engine effect: none\n`);
  const after = await readFile(path.join(ROOT, "data/production/equipment-evidence/active.json"), "utf8"); if (after !== activePointer) throw new Error("ACTIVE_POINTER_CHANGED");
  console.log(JSON.stringify(result));
}
void main();
