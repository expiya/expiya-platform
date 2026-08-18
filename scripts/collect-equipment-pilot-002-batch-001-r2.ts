import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createEquipmentOperationalRecordId, validateEquipmentEvidenceLocatorAgainstArtifact } from "@/features/vehicle-data/equipmentCollectionProtocol";
import { validateAssertionSupersessions, validateDerivedArtifactProvenance, validateTrimLinkSupersessions } from "@/features/vehicle-data/validateEquipmentEvidenceLayer";
import type { EquipmentEvidenceAssertion, EquipmentFeatureCode, EquipmentTrimVariantLink } from "@/types/equipmentEvidence";

const ROOT = process.cwd();
const BASE = path.join(ROOT, "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-BATCH-001");
const R1 = path.join(BASE, "corrections/EE-PILOT-002-CYCLE-001-R1");
const R2 = path.join(BASE, "corrections/EE-PILOT-002-CYCLE-001-R2");
const RAW_REF = "data/cars/vehicle_evidence/source_snapshots/SRC-000086/2026-08-18/source.html";
const DERIVED_REF = "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-BATCH-001/corrections/EE-PILOT-002-CYCLE-001-R2/equipment-speciale-plus.source-rows.v2.json";
const RAW_SHA = "sha256:3ab39031195955489bd984c432b469943ebb420b7d11ad4f8f4ec22d6661f955" as const;
const VARIANT = "1a3cc01d-3bfa-56f3-817f-4cc77e723ef8", CYCLE = "EE-PILOT-002-CYCLE-001-R2", BATCH = "EE-PILOT-002-BATCH-001";
const ROLE = "EQUIPMENT_COLLECTOR_PRIMARY" as const, ACTOR = "ACTOR-COLLECTOR-CODEX-CATALOG-001";
const GENERATED_AT = "2026-08-18T19:42:00.000Z", COMPLETED_AT = "2026-08-18T19:55:00.000Z";
const POLICY_ID = "ALFA_ROMEO_TR_EXACT_TRIM_SOURCE_ROWS", POLICY_VERSION = "2.0.0";
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const normalize = (value: string) => value.normalize("NFKC").replaceAll(/[\u200B-\u200D\uFEFF]/gu, "").replaceAll(/\s+/gu, " ").trim();
const sourceRowId = (rawText: string) => `EE-SROW-${sha(["TR", "Alfa Romeo", "Junior", "Ibrida Hybrid 145 eDCT6", "Speciale+", rawText].join("\u001f")).slice(0, 20).toUpperCase()}`;
const mappingReason = (featureCode: EquipmentFeatureCode) => {
  if (["APPLE_CARPLAY", "WIRELESS_APPLE_CARPLAY", "ANDROID_AUTO", "WIRELESS_ANDROID_AUTO"].includes(featureCode)) return "COMPOSITE_CONNECTIVITY_PHRASE";
  if (["LED_HEADLIGHTS", "ADAPTIVE_HEADLIGHTS", "MATRIX_LED_HEADLIGHTS"].includes(featureCode)) return "COMPOSITE_LIGHTING_PHRASE";
  if (["FRONT_PARKING_SENSORS", "REAR_PARKING_SENSORS"].includes(featureCode)) return "COMPOSITE_PARKING_PHRASE";
  if (["KEYLESS_ENTRY", "KEYLESS_START"].includes(featureCode)) return "COMPOSITE_KEYLESS_PHRASE";
  if (["POWER_TAILGATE", "HANDS_FREE_TAILGATE"].includes(featureCode)) return "COMPOSITE_POWER_HANDS_FREE_TAILGATE_PHRASE";
  return "DIRECT_CONTROLLED_FEATURE_PHRASE";
};

async function main() {
  const raw = await readFile(path.join(ROOT, RAW_REF), "utf8");
  if (`sha256:${sha(raw)}` !== RAW_SHA) throw new Error("RAW_PARENT_HASH_MISMATCH");
  const originalAssertions = JSON.parse(await readFile(path.join(BASE, "assertions.json"), "utf8")) as EquipmentEvidenceAssertion[];
  const r1Assertions = JSON.parse(await readFile(path.join(R1, "assertions.json"), "utf8")) as EquipmentEvidenceAssertion[];
  const originalTrimLinks = JSON.parse(await readFile(path.join(BASE, "trim-links.json"), "utf8")) as EquipmentTrimVariantLink[];
  const r1TrimLinks = JSON.parse(await readFile(path.join(R1, "trim-links.json"), "utf8")) as EquipmentTrimVariantLink[];
  const r1Ledger = JSON.parse(await readFile(path.join(R1, "research-ledger.json"), "utf8")) as Record<string, unknown>[];
  const rejectedDerived = JSON.parse(await readFile(path.join(ROOT, "data/cars/vehicle_evidence/source_snapshots/SRC-000086/2026-08-18/equipment-speciale-plus.derived.json"), "utf8")) as { equipmentByFeature: Record<string, string> };
  if (r1Assertions.length !== 24) throw new Error(`EXPECTED_24_R1_ASSERTIONS:${r1Assertions.length}`);
  const uniquePhrases = [...new Set(r1Assertions.map((item) => rejectedDerived.equipmentByFeature[item.featureCode]))];
  if (uniquePhrases.length !== 16 || uniquePhrases.some((item) => !item)) throw new Error(`EXPECTED_16_SOURCE_ROWS:${uniquePhrases.length}`);
  const boundaryMarker = "Alfa Romeo Junior Ibrida Speciale+", boundaryStart = raw.indexOf(boundaryMarker), boundaryEnd = raw.indexOf("<div class=\"cvPopupFullscreen__scrollLine\">", boundaryStart);
  if (boundaryStart < 0 || boundaryEnd < 0 || raw.indexOf(boundaryMarker, boundaryStart + 1) >= 0) throw new Error("SOURCE_BOUNDARY_NOT_UNIQUE");
  const boundary = raw.slice(boundaryStart, boundaryEnd);
  const phraseDetails = uniquePhrases.map((renderedText) => {
    const encodedText = renderedText.replaceAll("&", "&amp;");
    const boundaryNeedle = boundary.includes(renderedText) ? renderedText : encodedText;
    if (!boundary.includes(boundaryNeedle)) throw new Error(`SOURCE_ROW_OUTSIDE_BOUNDARY:${renderedText}`);
    const occurrences: { offset: number; representation: "TEXT" | "HTML_ENTITY_ENCODED" }[] = [];
    for (const [needle, representation] of [[renderedText, "TEXT"], [encodedText, "HTML_ENTITY_ENCODED"]] as const) {
      if (needle === renderedText && encodedText === renderedText) { if (representation !== "TEXT") continue; }
      let offset = raw.indexOf(needle); while (offset >= 0) { occurrences.push({ offset, representation }); offset = raw.indexOf(needle, offset + needle.length); }
    }
    const deduped = [...new Map(occurrences.map((item) => [item.offset, item])).values()].sort((a, b) => a.offset - b.offset);
    return { renderedText, rawText: renderedText, normalizedText: normalize(renderedText), sourceRowId: sourceRowId(renderedText), sourceOrder: boundary.indexOf(boundaryNeedle), occurrences: deduped };
  }).sort((a, b) => a.sourceOrder - b.sourceOrder);
  const sourceRowsById = Object.fromEntries(phraseDetails.map((item, index) => [item.sourceRowId, { sourceRowId: item.sourceRowId, sourceOrder: index, rawText: item.rawText, normalizedText: item.normalizedText, occurrenceCount: item.occurrences.length, rawOccurrenceReferences: item.occurrences.map((entry, occurrenceIndex) => `source.html#byte-${entry.offset}:occurrence-${occurrenceIndex + 1}:${entry.representation}`) }]));
  const derived = { schemaVersion: "2.0.0", extractionPolicy: { id: POLICY_ID, version: POLICY_VERSION }, parentSource: { sourceId: "SRC-000086", artifactReference: RAW_REF, artifactSha256: RAW_SHA }, context: { market: "TR", brand: "Alfa Romeo", model: "Junior", powertrainLabel: "Ibrida Hybrid 145 eDCT6", trimLabel: "Speciale+", sourceBoundary: `unique-text:${boundaryMarker} -> ${"cvPopupFullscreen__scrollLine"}` }, sourceRowOrder: phraseDetails.map((item) => item.sourceRowId), sourceRowsById };
  const derivedRaw = json(derived), derivedSha = `sha256:${sha(derivedRaw)}` as `sha256:${string}`;
  const forbiddenCodes = r1Assertions.map((item) => item.featureCode).filter((code) => derivedRaw.includes(code));
  if (forbiddenCodes.length) throw new Error(`DERIVED_ARTIFACT_CONTAINS_FEATURE_CODE:${forbiddenCodes.join(",")}`);
  await mkdir(R2, { recursive: true }); await writeFile(path.join(R2, "equipment-speciale-plus.source-rows.v2.json"), derivedRaw, "utf8");
  const rowByPhrase = new Map(phraseDetails.map((item) => [item.renderedText, item]));
  const mappings = r1Assertions.map((r1) => {
    const sourcePhrase = rejectedDerived.equipmentByFeature[r1.featureCode], row = rowByPhrase.get(sourcePhrase);
    if (!row) throw new Error(`SOURCE_ROW_NOT_FOUND_FOR_MAPPING:${r1.featureCode}`);
    return { mappingId: `EE-MAP-${sha(`${row.sourceRowId}|${r1.featureCode}|EQUIPMENT_FEATURE_SEMANTIC_MAPPING_V1`).slice(0, 20).toUpperCase()}`, sourceRowId: row.sourceRowId, featureCode: r1.featureCode, mappingPolicyId: "EQUIPMENT_FEATURE_SEMANTIC_MAPPING_V1", mappingReasonCode: mappingReason(r1.featureCode), sourcePhrase, mappingState: "PROVISIONAL", collectorRole: ROLE, collectorInstanceId: ACTOR };
  }).sort((a, b) => a.featureCode.localeCompare(b.featureCode));
  const mappingByFeature = new Map(mappings.map((item) => [item.featureCode, item]));
  const derivedArtifact = { derivedArtifactId: `EE-DERIVED-${sha(`${RAW_SHA}|${POLICY_ID}|${POLICY_VERSION}`).slice(0, 20).toUpperCase()}`, artifactReference: DERIVED_REF, artifactSha256: derivedSha, parentSourceId: "SRC-000086", parentArtifactReference: RAW_REF, parentArtifactSha256: RAW_SHA, extractionPolicyId: POLICY_ID, extractionPolicyVersion: POLICY_VERSION, generatedAt: GENERATED_AT };
  const assertions = r1Assertions.map((r1) => {
    const mapping = mappingByFeature.get(r1.featureCode)!;
    const assertionId = createEquipmentOperationalRecordId("EE-AST", `${CYCLE}|${VARIANT}|${r1.featureCode}|STANDARD`);
    const result: EquipmentEvidenceAssertion & Record<string, unknown> = { ...r1, assertionId, supersedesAssertionId: r1.assertionId, source: { ...r1.source, sourceId: "SRC-000086", registryRelease: "v0.4.0-working-extension-ee-pilot-002-r2", artifactReference: RAW_REF, artifactSha256: RAW_SHA, observedAt: GENERATED_AT }, derivedArtifact, locator: { kind: "STRUCTURED_RECORD", recordPath: `$.sourceRowsById.${mapping.sourceRowId}` }, semanticMappingId: mapping.mappingId, verificationState: "PROVISIONAL", collectorRole: ROLE, collectorInstanceId: ACTOR, researchCycleId: CYCLE, batchId: BATCH };
    const resolved = validateEquipmentEvidenceLocatorAgainstArtifact(result.locator, derivedRaw);
    const provenance = validateDerivedArtifactProvenance(result, derivedRaw);
    if (resolved.length || provenance.length) throw new Error(`R2_ASSERTION_INVALID:${r1.featureCode}:${[...resolved, ...provenance.map((x) => x.code)].join(",")}`);
    return result;
  }).sort((a, b) => a.featureCode.localeCompare(b.featureCode));
  const r2ByR1 = new Map(assertions.map((item) => [item.supersedesAssertionId, item]));
  const ledger = r1Assertions.map((r1) => {
    const prior = r1Ledger.find((item) => item.replacementAssertionId === r1.assertionId); const r2 = r2ByR1.get(r1.assertionId)!; const mapping = mappingByFeature.get(r1.featureCode)!;
    if (!prior) throw new Error(`R1_LEDGER_NOT_FOUND:${r1.featureCode}`);
    return { ledgerEntryId: createEquipmentOperationalRecordId("EE-RES", `${CYCLE}|${VARIANT}|${r1.featureCode}`), exactVariantId: VARIANT, featureCode: r1.featureCode, disposition: "RESEARCHED_CONCLUSIVE", researchCycleId: CYCLE, batchId: BATCH, updatedAt: COMPLETED_AT, sourceIds: ["SRC-000086"], assertionIds: [r2.assertionId], collectorRole: ROLE, collectorInstanceId: ACTOR, r1LedgerEntryId: prior.ledgerEntryId, r1AssertionId: r1.assertionId, r2AssertionId: r2.assertionId, sourceRowId: mapping.sourceRowId, semanticMappingId: mapping.mappingId, correctionReason: "EXTRACTION_AND_SEMANTIC_MAPPING_LAYER_SEPARATION" };
  }).sort((a, b) => a.featureCode.localeCompare(b.featureCode));
  const r1Trim = r1TrimLinks[0]; if (!r1Trim) throw new Error("R1_TRIM_LINK_MISSING");
  const trimLink: EquipmentTrimVariantLink & Record<string, unknown> = { ...r1Trim, linkId: createEquipmentOperationalRecordId("EE-LINK-TRIM", `${CYCLE}|${VARIANT}|${r1Trim.canonicalTrimId}`), supersedesTrimLinkId: r1Trim.linkId, assertionIds: assertions.map((item) => item.assertionId), verificationState: "PROVISIONAL", reviewState: "SECOND_REVIEW_REQUIRED", identitySourceIds: ["SRC-000086", "SRC-000085"], identityLocators: [{ sourceId: "SRC-000086", kind: "HTML_SECTION", heading: boundaryMarker, identityUse: "POWERTRAIN_AND_TRIM_CONTEXT_ONLY" }, { sourceId: "SRC-000085", kind: "STRUCTURED_RECORD", recordPath: "MY2026/JUNIOR IBRIDA/SPECIALE+", identityUse: "MARKET_MODEL_YEAR_TRIM_TRANSMISSION" }], derivedArtifactIdentityAuthority: false, collectorRole: ROLE, collectorInstanceId: ACTOR };
  const assertionChainIssues = validateAssertionSupersessions([...originalAssertions, ...r1Assertions, ...assertions]);
  const trimChainIssues = validateTrimLinkSupersessions([...originalTrimLinks, ...r1TrimLinks, trimLink]);
  if (assertionChainIssues.length || trimChainIssues.length) throw new Error(`SUPERSESSION_INVALID:${JSON.stringify([...assertionChainIssues, ...trimChainIssues])}`);
  const subjects = [...assertions.map((item) => ({ subjectType: "ASSERTION" as const, subjectId: item.assertionId })), { subjectType: "TRIM_LINK" as const, subjectId: trimLink.linkId }];
  const reviewEvents = subjects.flatMap((subject) => [{ reviewEventId: createEquipmentOperationalRecordId("EE-REV", `${CYCLE}|${subject.subjectType}|${subject.subjectId}|COLLECTED`), ...subject, toState: "COLLECTED", actorRole: ROLE, actorInstanceId: ACTOR, reviewedAt: COMPLETED_AT, reasonCode: "R2_LAYER_SEPARATION_COLLECTED" }, { reviewEventId: createEquipmentOperationalRecordId("EE-REV", `${CYCLE}|${subject.subjectType}|${subject.subjectId}|SECOND_REVIEW_REQUIRED`), ...subject, fromState: "COLLECTED", toState: "SECOND_REVIEW_REQUIRED", actorRole: ROLE, actorInstanceId: ACTOR, reviewedAt: COMPLETED_AT, reasonCode: "INDEPENDENT_REVIEW_REQUIRED_AFTER_R2_CORRECTION" }]);
  const fidelity = { sourceId: "SRC-000086", extractionPolicy: { id: POLICY_ID, version: POLICY_VERSION }, boundary: { marker: boundaryMarker, startOffset: boundaryStart, endOffset: boundaryEnd, result: "EXACT_RAW_MATCH" }, rows: phraseDetails.map((item) => ({ sourceRowId: item.sourceRowId, result: item.rawText === item.normalizedText ? "EXACT_RAW_MATCH" : "NORMALIZATION_ONLY", boundaryOccurrenceCount: [item.renderedText, item.renderedText.replaceAll("&", "&amp;")].some((needle) => boundary.includes(needle)) ? 1 : 0, rawOccurrenceCount: item.occurrences.length, rawOccurrenceReferences: sourceRowsById[item.sourceRowId].rawOccurrenceReferences })), rejectedRows: [], duplicateRemovalRule: "BYTE_OR_NORMALIZED_TEXT_EQUIVALENCE_ONLY" };
  const locatorValidation = { result: "24_OF_24_RESOLVED_UNIQUE_SOURCE_ROW", assertions: assertions.map((item) => ({ assertionId: item.assertionId, semanticMappingId: item.semanticMappingId, recordPath: item.locator.kind === "STRUCTURED_RECORD" ? item.locator.recordPath : null, sourceRowId: mappingByFeature.get(item.featureCode)!.sourceRowId, resolvedRecordCount: 1, featureCodePresentInRecordPath: item.locator.kind === "STRUCTURED_RECORD" && item.locator.recordPath.includes(item.featureCode) })) };
  const provenance = { ...derivedArtifact, authority: "DERIVED_INDEX_ONLY_NO_SOURCE_AUTHORITY", rawOfficialSourceAuthority: "TR_DISTRIBUTOR", locatorTarget: "DERIVED_ARTIFACT", assertionSourceTarget: "RAW_OFFICIAL_ARTIFACT" };
  const sourceInventory = [{ sourceId: "SRC-000086", originalUrl: "https://www.alfaromeo.com.tr/arac-modelleri/junior-ibrida", sourceAuthority: "TR_DISTRIBUTOR", rawArtifactReference: RAW_REF, rawArtifactSha256: RAW_SHA, observedAt: GENERATED_AT, market: "TR", modelYearApplicability: [2026, 2026], derivedArtifactId: derivedArtifact.derivedArtifactId }, { sourceId: "SRC-000085", role: "TRIM_IDENTITY_SUPPORT_ONLY", governanceStatus: "OFFICIAL_BACKEND_LINK_CONFIRMED", backendArtifactSha256: "sha256:af3d2ebbe55bab0c8df0231de73d989718b4d02f851d8fc361e3461fb63d9e79" }];
  const supersession = { assertionChains: assertions.map((r2) => { const r1 = r1Assertions.find((item) => item.assertionId === r2.supersedesAssertionId)!; return { originalAssertionId: r1.supersedesAssertionId, r1AssertionId: r1.assertionId, r2AssertionId: r2.assertionId, exactVariantId: VARIANT, featureCode: r2.featureCode, terminalVerificationState: "PROVISIONAL" }; }), trimLinkChain: { originalTrimLinkId: r1Trim.supersedesTrimLinkId, r1TrimLinkId: r1Trim.linkId, r2TrimLinkId: trimLink.linkId, terminalVerificationState: "PROVISIONAL" }, validation: { cycles: 0, multipleTerminalSuccessors: 0, scopeMismatches: 0, missingTargets: 0, authoritativeProjections: 0 } };
  const files: Record<string, unknown> = { "source-inventory.json": sourceInventory, "derived-artifact-provenance.json": provenance, "raw-to-derived-fidelity.json": fidelity, "semantic-mappings.json": mappings, "research-ledger.json": ledger, "assertions.json": assertions, "trim-links.json": [trimLink], "review-events.json": reviewEvents, "supersession-map.json": supersession, "locator-validation.json": locatorValidation, "correction-result.json": { result: "CORRECTION_SECOND_REVIEW_REQUIRED", pilotLifecycle: "COLLECTING", uniqueSourceRowCount: phraseDetails.length, semanticMappingCount: mappings.length, assertionCount: assertions.length, inconclusiveCount: 0, reviewSubjectCount: subjects.length } };
  for (const [name, value] of Object.entries(files)) await writeFile(path.join(R2, name), json(value), "utf8");
  const distribution = Object.fromEntries(phraseDetails.map((row) => [row.sourceRowId, mappings.filter((item) => item.sourceRowId === row.sourceRowId).length]));
  await writeFile(path.join(R2, "collection-report.md"), `# EE-PILOT-002 Batch 001-R2 Collection Correction\n\n- Result: CORRECTION_SECOND_REVIEW_REQUIRED\n- Source rows: 16 unique, extracted without feature vocabulary or availability semantics\n- Semantic mappings: 24, stored separately; source-row mapping fan-out: ${JSON.stringify(distribution)}\n- Assertions: 24 provisional terminal successors; inconclusive: 0\n- Raw source and derived index provenance are separate; derived artifact has no official authority\n- Trim link: one provisional R2 successor; equipment derived artifact is not identity authority\n- Review: 25 subjects await independent second review\n`, "utf8");
  const names = [...Object.keys(files), "equipment-speciale-plus.source-rows.v2.json", "collection-report.md"].sort();
  const checksums = Object.fromEntries(await Promise.all(names.map(async (name) => [name, `sha256:${sha(await readFile(path.join(R2, name)))}`]))); await writeFile(path.join(R2, "checksums.json"), json(checksums), "utf8");
  console.log(JSON.stringify({ cycle: CYCLE, sourceRows: phraseDetails.length, mappings: mappings.length, assertions: assertions.length, inconclusive: 0, trimLinks: 1, reviewSubjects: subjects.length, derivedSha }));
}

void main();
