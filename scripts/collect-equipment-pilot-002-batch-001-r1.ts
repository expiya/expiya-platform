import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { createEquipmentOperationalRecordId, validateEquipmentEvidenceLocatorAgainstArtifact } from "@/features/vehicle-data/equipmentCollectionProtocol";
import type { EquipmentEvidenceAssertion, EquipmentTrimVariantLink } from "@/types/equipmentEvidence";

const ROOT = process.cwd();
const BATCH = path.join(ROOT, "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-BATCH-001");
const CORRECTION = path.join(BATCH, "corrections/EE-PILOT-002-CYCLE-001-R1");
const RAW_REF = "data/cars/vehicle_evidence/source_snapshots/SRC-000086/2026-08-18/source.html";
const DERIVED_REF = "data/cars/vehicle_evidence/source_snapshots/SRC-000086/2026-08-18/equipment-speciale-plus.derived.json";
const VARIANT_ID = "1a3cc01d-3bfa-56f3-817f-4cc77e723ef8", SOURCE_ID = "SRC-000086";
const CYCLE_ID = "EE-PILOT-002-CYCLE-001-R1", BATCH_ID = "EE-PILOT-002-BATCH-001";
const ACTOR_ROLE = "EQUIPMENT_COLLECTOR_PRIMARY" as const, ACTOR_ID = "ACTOR-COLLECTOR-CODEX-CATALOG-001";
const OBSERVED_AT = "2026-08-18T18:58:00.000Z", COMPLETED_AT = "2026-08-18T19:12:00.000Z";
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

async function main() {
  const originalAssertions = JSON.parse(await readFile(path.join(BATCH, "assertions.json"), "utf8")) as (EquipmentEvidenceAssertion & Record<string, unknown>)[];
  const originalLedger = JSON.parse(await readFile(path.join(BATCH, "research-ledger.json"), "utf8")) as Record<string, unknown>[];
  const originalTrimLinks = JSON.parse(await readFile(path.join(BATCH, "trim-links.json"), "utf8")) as (EquipmentTrimVariantLink & Record<string, unknown>)[];
  const originalComparison = JSON.parse(await readFile(path.join(BATCH, "trim-comparison.json"), "utf8")) as Record<string, unknown>[];
  const ibrida = originalAssertions.filter((item) => item.exactVariantId === VARIANT_ID);
  if (ibrida.length !== 24) throw new Error(`EXPECTED_24_IBRIDA_ASSERTIONS:${ibrida.length}`);
  const raw = await readFile(path.join(ROOT, RAW_REF), "utf8"), rawSha = `sha256:${sha(raw)}` as const;
  if (rawSha !== "sha256:3ab39031195955489bd984c432b469943ebb420b7d11ad4f8f4ec22d6661f955") throw new Error("SRC_000086_RAW_CHECKSUM_MISMATCH");
  const marker = "Alfa Romeo Junior Ibrida Speciale+";
  if (raw.split(marker).length - 1 !== 1) throw new Error("IBRIDA_SPECIALE_HEADING_NOT_UNIQUE");
  const start = raw.indexOf(marker), endMarker = "<div class=\"cvPopupFullscreen__scrollLine\">", end = raw.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error("IBRIDA_SPECIALE_SECTION_BOUNDARY_NOT_FOUND");
  const section = raw.slice(start, end);
  const equipmentByFeature: Record<string, string> = {};
  for (const item of ibrida) {
    const text = String((item.locator as { row?: string }).row ?? "");
    const normalizedHtmlText = text.replaceAll("&", "&amp;");
    if (!text || (!section.includes(text) && !section.includes(normalizedHtmlText))) throw new Error(`CORRECTION_EVIDENCE_NOT_FOUND:${item.featureCode}`);
    equipmentByFeature[item.featureCode] = text;
  }
  const derived = { schemaVersion: "1.0.0", extractionPolicyVersion: "ALFA_ROMEO_TR_EXACT_TRIM_ROWS_V1", sourceId: SOURCE_ID, sourceArtifactReference: RAW_REF, sourceArtifactSha256: rawSha, market: "TR", modelYear: 2026, exactPowertrain: "Junior Ibrida Hybrid 145 eDCT6", trim: "Speciale+", uniqueBoundary: { marker, occurrenceCount: 1, endMarker }, equipmentByFeature: Object.fromEntries(Object.entries(equipmentByFeature).sort(([a], [b]) => a.localeCompare(b))) };
  const derivedRaw = json(derived), derivedSha = `sha256:${sha(derivedRaw)}` as const;
  await mkdir(path.dirname(path.join(ROOT, DERIVED_REF)), { recursive: true });
  await writeFile(path.join(ROOT, DERIVED_REF), derivedRaw, "utf8");

  const replacements = ibrida.map((old) => {
    const assertionId = createEquipmentOperationalRecordId("EE-AST", `${CYCLE_ID}|${VARIANT_ID}|${old.featureCode}|STANDARD`);
    return { ...old, assertionId, supersedesAssertionId: old.assertionId, source: { ...old.source, sourceId: SOURCE_ID, registryRelease: "v0.4.0-working-extension-ee-pilot-002-r1", artifactReference: DERIVED_REF, artifactSha256: derivedSha, observedAt: OBSERVED_AT }, locator: { kind: "STRUCTURED_RECORD" as const, recordPath: `$.equipmentByFeature.${old.featureCode}` }, verificationState: "PROVISIONAL" as const, collectorRole: ACTOR_ROLE, collectorInstanceId: ACTOR_ID, researchCycleId: CYCLE_ID, batchId: BATCH_ID };
  }).sort((a, b) => a.featureCode.localeCompare(b.featureCode));
  for (const item of replacements) {
    const expected = equipmentByFeature[item.featureCode];
    const issues = validateEquipmentEvidenceLocatorAgainstArtifact(item.locator, derivedRaw, expected);
    if (issues.length) throw new Error(`NEW_LOCATOR_INVALID:${item.featureCode}:${issues.join(",")}`);
  }
  const replacementByOld = new Map(replacements.map((item) => [item.supersedesAssertionId, item.assertionId]));
  const correctionLedger = ibrida.map((old) => {
    const original = originalLedger.find((item) => item.exactVariantId === VARIANT_ID && item.featureCode === old.featureCode);
    if (!original) throw new Error(`ORIGINAL_LEDGER_MISSING:${old.featureCode}`);
    const successor = replacementByOld.get(old.assertionId)!;
    return { ledgerEntryId: createEquipmentOperationalRecordId("EE-RES", `${CYCLE_ID}|${VARIANT_ID}|${old.featureCode}`), exactVariantId: VARIANT_ID, featureCode: old.featureCode, disposition: "RESEARCHED_CONCLUSIVE", researchCycleId: CYCLE_ID, batchId: BATCH_ID, updatedAt: COMPLETED_AT, sourceIds: [SOURCE_ID], assertionIds: [successor], collectorRole: ACTOR_ROLE, collectorInstanceId: ACTOR_ID, originalLedgerEntryId: original.ledgerEntryId, originalAssertionId: old.assertionId, replacementAssertionId: successor, correctionReason: "NON_UNIQUE_HTML_LOCATOR_RECOLLECTION" };
  }).sort((a, b) => a.featureCode.localeCompare(b.featureCode));
  const oldTrim = originalTrimLinks.find((item) => item.exactVariantId === VARIANT_ID);
  if (!oldTrim) throw new Error("ORIGINAL_IBRIDA_TRIM_LINK_MISSING");
  const trimLinkId = createEquipmentOperationalRecordId("EE-LINK-TRIM", `${CYCLE_ID}|${VARIANT_ID}|${oldTrim.canonicalTrimId}`);
  const trimLink = { ...oldTrim, linkId: trimLinkId, supersedesTrimLinkId: oldTrim.linkId, assertionIds: replacements.map((item) => item.assertionId), verificationState: "PROVISIONAL" as const, reviewState: "SECOND_REVIEW_REQUIRED", provenanceSourceIds: [SOURCE_ID, "SRC-000085"], locatorChain: [{ sourceId: SOURCE_ID, kind: "STRUCTURED_RECORD", recordPath: "$.trim" }, { sourceId: "SRC-000085", kind: "STRUCTURED_RECORD", recordPath: "$.officialPriceRows[?powertrain=IBRIDA]", governanceReference: "Official alfaromeo.com.tr price page embeds arjfiyat.tofas.com.tr/pricelists?brand=alfa-romeo" }], collectorRole: ACTOR_ROLE, collectorInstanceId: ACTOR_ID };
  const subjects = [...replacements.map((item) => ({ subjectType: "ASSERTION" as const, subjectId: item.assertionId })), { subjectType: "TRIM_LINK" as const, subjectId: trimLinkId }];
  const reviewEvents = subjects.flatMap((subject) => [
    { reviewEventId: createEquipmentOperationalRecordId("EE-REV", `${CYCLE_ID}|${subject.subjectType}|${subject.subjectId}|COLLECTED`), ...subject, toState: "COLLECTED", actorRole: ACTOR_ROLE, actorInstanceId: ACTOR_ID, reviewedAt: COMPLETED_AT, reasonCode: "CORRECTION_RECOLLECTION_COMPLETE" },
    { reviewEventId: createEquipmentOperationalRecordId("EE-REV", `${CYCLE_ID}|${subject.subjectType}|${subject.subjectId}|SECOND_REVIEW_REQUIRED`), ...subject, fromState: "COLLECTED", toState: "SECOND_REVIEW_REQUIRED", actorRole: ACTOR_ROLE, actorInstanceId: ACTOR_ID, reviewedAt: COMPLETED_AT, reasonCode: "INDEPENDENT_REVIEW_REQUIRED_AFTER_LOCATOR_CORRECTION" },
  ]);
  const locatorValidation = { sourceId: SOURCE_ID, rawArtifactSha256: rawSha, derivedArtifactSha256: derivedSha, extractionPolicyVersion: derived.extractionPolicyVersion, oldLocator: { elementReference: "#modal-avhpos5auh", result: "HTML_LOCATOR_NOT_UNIQUE", occurrenceCount: raw.match(/id=["']modal-avhpos5auh["']/gu)?.length ?? 0 }, newLocators: replacements.map((item) => ({ assertionId: item.assertionId, recordPath: item.locator.recordPath, result: "RESOLVED_UNIQUE_1_OF_1", contentSha256: `sha256:${sha(equipmentByFeature[item.featureCode])}` })) };
  const preview = { previewAuthority: "NON_AUTHORITATIVE_REVIEW_PREVIEW", researchCycleId: CYCLE_ID, reason: "Correction successors remain PROVISIONAL pending independent second review", comparisons: originalComparison };
  const sourceInventory = [{ sourceId: SOURCE_ID, originalUrl: "https://www.alfaromeo.com.tr/arac-modelleri/junior-ibrida", authority: "TR_DISTRIBUTOR", sourceType: "OFFICIAL_EQUIPMENT_LIST", observedAt: OBSERVED_AT, market: "TR", modelYearApplicability: [2026, 2026], exactPowertrainApplicability: "IBRIDA_HYBRID_145_EDCT6_SPECIALE_PLUS", rawArtifactReference: RAW_REF, rawArtifactSha256: rawSha, derivedArtifactReference: DERIVED_REF, derivedArtifactSha256: derivedSha, extractionPolicyVersion: derived.extractionPolicyVersion, snapshotResult: "CAPTURED_AND_STRUCTURED" }, { sourceId: "SRC-000085", role: "TRIM_IDENTITY_SUPPORT", governanceStatus: "OFFICIAL_BACKEND_LINK_CONFIRMED", originalUrl: "https://arjfiyat.tofas.com.tr/pricelists?brand=alfa-romeo", officialFrontendArtifact: "data/cars/vehicle_evidence/working/ALFA_ROMEO_BATCH_01/snapshots/2026-08-16/price-page.html", officialFrontendArtifactSha256: "sha256:dceb2bcc7fdf0385af3be36556e0519ca2b4f565d6c36220b0478b853f58ed70", backendArtifactReference: "data/cars/vehicle_evidence/source_snapshots/SRC-000085/2026-08-16/source.html", backendArtifactSha256: "sha256:af3d2ebbe55bab0c8df0231de73d989718b4d02f851d8fc361e3461fb63d9e79", evidence: "Official Alfa Romeo Türkiye price page line 1220 assigns the arjfiyat.tofas.com.tr endpoint to its price-list iframe location." }];
  const files: Record<string, unknown> = { "source-inventory.json": sourceInventory, "research-ledger.json": correctionLedger, "assertions.json": replacements, "trim-links.json": [trimLink], "review-events.json": reviewEvents, "supersession-map.json": { assertionSupersessions: replacements.map((item) => ({ predecessorAssertionId: item.supersedesAssertionId, successorAssertionId: item.assertionId, exactVariantId: item.exactVariantId, featureCode: item.featureCode })), trimLinkSupersessions: [{ predecessorTrimLinkId: oldTrim.linkId, successorTrimLinkId: trimLink.linkId, exactVariantId: VARIANT_ID, canonicalTrimId: oldTrim.canonicalTrimId }] }, "locator-validation.json": locatorValidation, "trim-comparison-r1-preview.json": preview, "correction-result.json": { result: "CORRECTION_SECOND_REVIEW_REQUIRED", pilotLifecycle: "COLLECTING", assertionCount: replacements.length, trimLinkCount: 1, reviewSubjectCount: subjects.length } };
  await mkdir(CORRECTION, { recursive: true });
  for (const [name, value] of Object.entries(files)) await writeFile(path.join(CORRECTION, name), json(value), "utf8");
  const report = `# EE-PILOT-002 Batch 001-R1 Correction Collection\n\n- Result: CORRECTION_SECOND_REVIEW_REQUIRED\n- Source: ${SOURCE_ID}; raw ${rawSha}; derived ${derivedSha}\n- Locator: checksum-bound STRUCTURED_RECORD paths extracted by ${derived.extractionPolicyVersion}\n- Recollected features: 24/24 conclusive; 24 provisional successor assertions\n- Trim link: one provisional successor; SRC-000085 backend ownership linkage confirmed from official Alfa Romeo Türkiye price-page snapshot\n- Supersession: append-only; original assertions, ledger, trim link and second-review artifacts unchanged\n- Review: 25 subjects await independent second review; no VERIFIED assertion or production projection created\n`;
  await writeFile(path.join(CORRECTION, "collection-report.md"), report, "utf8");
  const names = [...Object.keys(files), "collection-report.md"].sort();
  const checksums = Object.fromEntries(await Promise.all(names.map(async (name) => [name, `sha256:${sha(await readFile(path.join(CORRECTION, name)))}`])));
  await writeFile(path.join(CORRECTION, "checksums.json"), json(checksums), "utf8");
  console.log(JSON.stringify({ sourceId: SOURCE_ID, rawSha, derivedSha, correctionLedger: correctionLedger.length, successorAssertions: replacements.length, trimLinks: 1, reviewSubjects: subjects.length }));
}

void main();
