import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createEquipmentOperationalRecordId } from "@/features/vehicle-data/equipmentCollectionProtocol";
import { EQUIPMENT_ASSOCIATION_AUTHORITY_MATRIX, validateEquipmentAssociationObservation } from "@/features/vehicle-data/equipmentAssociationObservation";
import type { EquipmentAssociationObservation } from "@/types/equipmentEvidence";

const ROOT = process.cwd(), BATCH = "EE-PILOT-002-BATCH-002", CYCLE = "EE-PILOT-002-BATCH-002-R1";
const ACTOR = "ACTOR-COLLECTOR-CODEX-CATALOG-001", ROLE = "EQUIPMENT_COLLECTOR_PRIMARY", CREATED = "2026-08-18T22:40:00.000Z";
const BASE = path.join(ROOT, "data/production/equipment-evidence/working/EE-PILOT-002", BATCH);
const OUT = path.join(BASE, "corrections", CYCLE);
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
const fingerprint = (value: unknown) => `sha256:${sha(json(value))}` as `sha256:${string}`;

async function main() {
  await mkdir(OUT, { recursive: true });
  const assertionsRaw = await readFile(path.join(BASE, "assertions.json"));
  const trimLinksRaw = await readFile(path.join(BASE, "trim-links.json"));
  const mappingsRaw = await readFile(path.join(BASE, "semantic-mappings.json"));
  const rowsRaw = await readFile(path.join(BASE, "tonale-equipment.source-rows.v1.json"));
  const assertions = JSON.parse(assertionsRaw.toString()) as Array<Record<string, unknown>>;
  const mappings = JSON.parse(mappingsRaw.toString()) as Array<Record<string, unknown>>;
  const rows = JSON.parse(rowsRaw.toString()) as { sourceRowsById: Record<string, { exactVariantId: string; sourceId: string }> };
  const secondReview = JSON.parse(await readFile(path.join(BASE, "second-review/assertion-review-results.json"), "utf8"));
  if (assertions.length !== 49 || secondReview.filter((item: { disposition: string }) => item.disposition === "CONFLICT_REVIEW_REQUIRED").length !== 49) throw new Error("EXPECTED_49_CONFLICT_ASSERTIONS");

  const sourceRecovery = {
    result: "NO_EXACT_MY2026_PROVISION_SOURCE_RECOVERED", searchedAt: CREATED,
    reviewedOfficialSources: [
      { url: "https://www.alfaromeo.com.tr/configurator/", result: "PUBLIC_SHELL_NO_DETERMINISTIC_EXACT_PROVISION_STATE", captured: false },
      { url: "https://www.alfaromeo.com.tr/content/dam/alfa/tr/katalog/tonale-yeni/TONALE-e-brosur-TR.pdf", result: "REJECTED_TAXONOMY_AND_APPLICABILITY_MISMATCH", details: "Sprint/Ti/Veloce/Edizione Speciale matrix is not exact Speciale Hybrid 175 MY2026 authority", captured: false },
      { url: "https://www.alfaromeo.com.tr/content/dam/alfa/tr/katalog/2025/eylul/tonale/AR_TONALE_BROSUR_2025_02.pdf", result: "REJECTED_HISTORICAL_HYBRID_160", captured: false },
      { url: "https://arjfiyat.tofas.com.tr/pricelists?brand=alfa-romeo&hidebutton=true", result: "IDENTITY_AND_PRICE_ONLY_NO_FEATURE_PROVISION_ROWS", captured: true, sourceId: "SRC-000088" },
      { url: "https://www.alfaromeo.com.tr/arac-modelleri/yeni-tonale", result: "EXACT_TRIM_LISTING_WITH_PROVISION_UNRESOLVED", captured: true, sourceId: "SRC-000087" },
    ], explicitStandardFeatureCount: 0, explicitOptionalFeatureCount: 0, explicitPackageDependentFeatureCount: 0,
    newSourceCount: 0, newSnapshots: [], conclusion: "All 49 reviewed mappings remain association-only; no successor availability assertion is authorized.",
  };
  const observations: EquipmentAssociationObservation[] = assertions.map((assertion) => {
    const pairMappings = mappings.filter((mapping) => mapping.exactTrimApplicability === (assertion.exactVariantId === "54bbe431-a3c2-56d0-8177-cefdf0330bcb" ? "Ti" : "Speciale") && mapping.featureCode === assertion.featureCode);
    const semanticMappingIds = pairMappings.map((mapping) => String(mapping.mappingId)).sort();
    const sourceRowIds = [...new Set(pairMappings.map((mapping) => String(mapping.sourceRowId)))].sort();
    const observationBase = { observationId: createEquipmentOperationalRecordId("EE-OBS", `${CYCLE}|${assertion.exactVariantId}|${assertion.featureCode}`), observationType: "LISTED_FOR_EXACT_TRIM" as const,
      exactVariantId: String(assertion.exactVariantId), featureCode: assertion.featureCode as EquipmentAssociationObservation["featureCode"], provisionKnowledge: "PROVISION_UNRESOLVED" as const,
      sourceId: "SRC-000087", sourceRowId: sourceRowIds[0], supportingSourceRowIds: sourceRowIds, semanticMappingId: semanticMappingIds[0], semanticMappingIds,
      marketApplicability: "TR" as const, modelYearApplicability: [2026], trimApplicability: assertion.exactVariantId === "54bbe431-a3c2-56d0-8177-cefdf0330bcb" ? "Ti" : "Speciale",
      powertrainApplicability: assertion.exactVariantId === "54bbe431-a3c2-56d0-8177-cefdf0330bcb" ? "DIESEL_130_TCT6" : "HYBRID_175_TCT7",
      verificationState: "PROVISIONAL" as const, reviewState: "SECOND_REVIEW_REQUIRED" as const, decisionUse: "CONFIRMATION_REQUIRED" as const,
      confidence: "MEDIUM" as const, conflictState: "CLEAR" as const, collectorActorId: ACTOR, createdAt: CREATED };
    return { ...observationBase, contentFingerprint: fingerprint(observationBase) };
  }).sort((a, b) => `${a.exactVariantId}|${a.featureCode}`.localeCompare(`${b.exactVariantId}|${b.featureCode}`));
  const invalid = observations.flatMap((item) => validateEquipmentAssociationObservation(item).map((issue) => ({ observationId: item.observationId, issue })));
  if (invalid.length) throw new Error(`INVALID_OBSERVATIONS:${JSON.stringify(invalid)}`);
  if (observations.some((item) => !rows.sourceRowsById[item.sourceRowId] || rows.sourceRowsById[item.sourceRowId].exactVariantId !== item.exactVariantId)) throw new Error("OBSERVATION_SOURCE_SCOPE_MISMATCH");

  const transitions = assertions.map((assertion) => {
    const observation = observations.find((item) => item.exactVariantId === assertion.exactVariantId && item.featureCode === assertion.featureCode)!;
    return { transitionId: createEquipmentOperationalRecordId("EE-CORR", `${CYCLE}|${assertion.assertionId}|${observation.observationId}`), correctionCycleId: CYCLE,
      fromSubjectType: "EQUIPMENT_ASSERTION", fromAssertionId: assertion.assertionId, fromReviewDisposition: "CONFLICT_REVIEW_REQUIRED",
      toSubjectType: "EQUIPMENT_ASSOCIATION_OBSERVATION", toObservationId: observation.observationId, result: "EXACT_TRIM_ASSOCIATION_ONLY",
      semantics: "The historical assertion remains unchanged and unverified; this transition does not supersede, validate, or promote it.", collectorActorId: ACTOR, createdAt: CREATED };
  });
  const correctionLedger = assertions.map((assertion) => {
    const observation = observations.find((item) => item.exactVariantId === assertion.exactVariantId && item.featureCode === assertion.featureCode)!;
    return { correctionLedgerId: createEquipmentOperationalRecordId("EE-RES", `${CYCLE}|${assertion.exactVariantId}|${assertion.featureCode}`), correctionCycleId: CYCLE,
      exactVariantId: assertion.exactVariantId, featureCode: assertion.featureCode, originalAssertionId: assertion.assertionId,
      classification: "EXACT_TRIM_ASSOCIATION_ONLY", successorAssertionId: null, observationId: observation.observationId,
      sourceIds: ["SRC-000087"], collectorActorId: ACTOR, createdAt: CREATED };
  });
  const subjects = [...observations.map((item) => ({ subjectType: "ASSOCIATION_OBSERVATION", subjectId: item.observationId })), ...transitions.map((item) => ({ subjectType: "CORRECTION_TRANSITION", subjectId: item.transitionId }))];
  const reviewEvents = subjects.flatMap((subject) => [
    { reviewEventId: createEquipmentOperationalRecordId("EE-REV", `${subject.subjectType}|${subject.subjectId}|COLLECTED`), ...subject, toState: "COLLECTED", actorRole: ROLE, actorInstanceId: ACTOR, reviewedAt: CREATED, reasonCode: "R1_AVAILABILITY_SEMANTICS_CORRECTION_CAPTURED" },
    { reviewEventId: createEquipmentOperationalRecordId("EE-REV", `${subject.subjectType}|${subject.subjectId}|SECOND_REVIEW_REQUIRED`), ...subject, fromState: "COLLECTED", toState: "SECOND_REVIEW_REQUIRED", actorRole: ROLE, actorInstanceId: ACTOR, reviewedAt: CREATED, reasonCode: "INDEPENDENT_SEMANTICS_REVIEW_REQUIRED" },
  ]);
  const preservation = { originalAssertions: { path: "assertions.json", sha256: `sha256:${sha(assertionsRaw)}`, count: 49 }, originalTrimLinks: { path: "trim-links.json", sha256: `sha256:${sha(trimLinksRaw)}`, count: 2 },
    rawRows: { path: "tonale-equipment.source-rows.v1.json", sha256: `sha256:${sha(rowsRaw)}`, count: Object.keys(rows.sourceRowsById).length }, mappings: { path: "semantic-mappings.json", sha256: `sha256:${sha(mappingsRaw)}`, count: mappings.length }, mutationPerformed: false };
  const files: Record<string, unknown> = { "source-recovery-report.json": sourceRecovery, "association-observations.json": observations, "correction-transitions.json": transitions,
    "correction-research-ledger.json": correctionLedger, "review-events.json": reviewEvents, "authority-matrix.json": { currentGlobalAuthority: "SHADOW_AND_EXPLANATION_DISABLED", futureUpperBoundsOnly: true, matrix: EQUIPMENT_ASSOCIATION_AUTHORITY_MATRIX },
    "historical-artifact-preservation.json": preservation, "successor-assertions.json": [], "new-source-inventory.json": [], "new-semantic-mappings.json": [],
    "correction-result.json": { correctionCycleId: CYCLE, disposition: "CORRECTION_SECOND_REVIEW_REQUIRED", provisionAssertionRecovered: 0, exactTrimAssociationOnly: observations.length,
      remainsInconclusiveFromOriginalLedger: 53, sourceConflict: 0, historicalConflictAssertionsPreserved: 49, passedTrimLinksPreserved: 2, correctionEventCount: transitions.length,
      reviewSubjectCount: subjects.length, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED", activePointerChanged: false } };
  for (const [name, value] of Object.entries(files)) await writeFile(path.join(OUT, name), json(value));
  await writeFile(path.join(OUT, "correction-report.md"), `# ${CYCLE}\n\n- Source recovery: no exact MY2026 provision source recovered\n- Successor availability assertions: 0\n- Exact-trim association observations: ${observations.length}\n- Original inconclusive ledger rows retained: 53\n- Historical conflict assertions preserved: 49\n- Passed trim links preserved: 2\n- Correction transitions: ${transitions.length}\n- Independent review subjects: ${subjects.length}\n- Decision authority: SHADOW_AND_EXPLANATION_DISABLED\n`);
  const names = [...Object.keys(files), "correction-report.md"].sort();
  const checksums = Object.fromEntries(await Promise.all(names.map(async (name) => [name, `sha256:${sha(await readFile(path.join(OUT, name)))}`])));
  await writeFile(path.join(OUT, "checksums.json"), json(checksums));
  console.log(JSON.stringify({ cycle: CYCLE, successorAssertions: 0, observations: observations.length, transitions: transitions.length, reviewSubjects: subjects.length, originalInconclusive: 53 }, null, 2));
}

void main();
