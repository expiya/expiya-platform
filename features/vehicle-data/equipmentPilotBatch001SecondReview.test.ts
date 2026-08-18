import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import catalog from "@/data/production/catalog/releases/v0.55.1/catalog.json";
import assertions from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/assertions.json";
import batchLifecycle from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/batch-lifecycle.json";
import batchReviewEvents from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/batch-review-events.json";
import catalogQualityIssues from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/catalog-quality-issues.json";
import checksums from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/checksums.json";
import comparison from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/trim-comparison.json";
import ledger from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/research-ledger.json";
import packageLinks from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/package-links.json";
import reviewEvents from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/review-events.json";
import reviewResult from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/second-review-result.json";
import snapshots from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/snapshots/index.json";
import sourceInventory from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/source-inventory.json";
import sourceRegistryExtension from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/source-registry-extension.json";
import sourceReviewStatus from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/source-review-status.json";
import trimDrafts from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/trim-identity-drafts.json";
import trimLinks from "@/data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001/trim-links.json";
import { EQUIPMENT_FEATURE_CODES } from "@/types/equipmentEvidence";
import { createCanonicalTrimId } from "./equipmentCanonicalIdentity";

const root = "data/production/equipment-evidence/working/EE-PILOT-001/EE-PILOT-001-BATCH-001";
const exactVariantIds = ["6fd52c36-be09-5918-a70f-c5b8b3aba511", "ec80fc69-2bfd-566e-bbb8-ebd5ab1c9a36"] as const;
const sourceIds = ["SRC-000079", "SRC-000080", "SRC-000081"] as const;
const sha = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");
const json = (name: string) => JSON.parse(readFileSync(`${root}/${name}`, "utf8")) as unknown;

describe("EE-PILOT-001 Batch 001 independent second review", () => {
  it("fail-closed verifies collector artifact and snapshot checksums", () => {
    for (const [name, expected] of Object.entries(checksums)) expect(sha(readFileSync(`${root}/${name}`))).toBe(expected);
    for (const snapshot of snapshots) expect(`sha256:${sha(readFileSync(snapshot.canonicalArtifactReference))}`).toBe(snapshot.artifactSha256);
  });

  it("verifies the three official source records and safe immutable snapshots", () => {
    expect(sourceInventory.map((source) => source.sourceId)).toEqual(sourceIds);
    expect(sourceRegistryExtension.records.map((source) => source.source_id)).toEqual(sourceIds);
    for (const source of sourceInventory) {
      expect(new URL(source.originalUrl).hostname).toBe("www.dacia.com.tr");
      expect(source.snapshotResult).toBe("CAPTURED");
      expect(source.observedAt).toBe(batchLifecycle.researchStartedAt);
      expect(source.authority === "TR_DISTRIBUTOR" || source.authority === "OFFICIAL_CONFIGURATOR").toBe(true);
      const html = readFileSync(source.artifactReference, "utf8");
      expect(html).toMatch(/Eco-G 120/u);
      expect(html).not.toMatch(/authorization\s*[:=]\s*["'][^"']+|set-cookie\s*:|bearer\s+[a-z0-9._-]{12,}|session(?:id)?\s*[:=]\s*["'][^"']+|document\.cookie\s*=/iu);
    }
  });

  it("confirms usable snapshot content for the exact-configuration mismatch", () => {
    const equipment = readFileSync(sourceInventory[0].artifactReference, "utf8");
    const configurator = readFileSync(sourceInventory[1].artifactReference, "utf8");
    const comparisonHtml = readFileSync(sourceInventory[2].artifactReference, "utf8");
    expect(equipment).toContain("extreme Eco-G 120 auto - 7 koltuklu");
    expect(configurator).toContain("expression Eco-G 120 - 5 koltuklu");
    expect(configurator).toContain("BVM6");
    expect(comparisonHtml).toContain("Eco-G 120 auto");
    expect(`${equipment}${configurator}${comparisonHtml}`).not.toContain("essential 5 koltuk Eco-G 120 EDC");
    expect(`${equipment}${configurator}${comparisonHtml}`).not.toContain("expression 5 koltuk Eco-G 120 EDC");
  });

  it("pins both catalog identities and the historical v0.55.1 fingerprint", () => {
    expect(`sha256:${sha(readFileSync("data/production/catalog/releases/v0.55.1/catalog.json"))}`).toBe("sha256:96f318680dd788c9df0827cbe3ce5635a36a5f1b354ab8fc7e6654bfa3ddc07e");
    const variants = exactVariantIds.map((id) => catalog.records.find((record) => record.variant.id === id)?.variant);
    expect(variants.map((variant) => ({ brand: variant?.brand.value, model: variant?.model.value, trim: variant?.trim.value, modelYear: variant?.modelYear.value, seats: variant?.dimensions.seats?.value, fuel: variant?.powertrain.fuelType.value, transmission: variant?.powertrain.transmission.value }))).toEqual([
      { brand: "Dacia", model: "Jogger", trim: "essential 5 koltuk Eco-G 120 EDC", modelYear: 2026, seats: 5, fuel: "LPG", transmission: "6-speed dual-clutch automatic" },
      { brand: "Dacia", model: "Jogger", trim: "expression 5 koltuk Eco-G 120 EDC", modelYear: 2026, seats: 5, fuel: "LPG", transmission: "6-speed dual-clutch automatic" },
    ]);
  });

  it("has a complete 2 by 51 inconclusive ledger with linked sources and reasons", () => {
    expect(ledger).toHaveLength(102);
    expect(new Set(ledger.map((entry) => `${entry.exactVariantId}|${entry.featureCode}`))).toHaveLength(102);
    for (const exactVariantId of exactVariantIds) expect(new Set(ledger.filter((entry) => entry.exactVariantId === exactVariantId).map((entry) => entry.featureCode))).toEqual(new Set(EQUIPMENT_FEATURE_CODES));
    expect(ledger.every((entry) => entry.disposition === "RESEARCHED_INCONCLUSIVE" && entry.sourceIds.length > 0 && entry.inconclusiveReasonCodes.length > 0 && entry.assertionIds.length === 0)).toBe(true);
    expect(ledger.filter((entry) => entry.exactVariantId === exactVariantIds[0]).every((entry) => entry.inconclusiveReasonCodes.includes("OFFICIAL_EXACT_TRIM_NOT_FOUND"))).toBe(true);
    expect(ledger.filter((entry) => entry.exactVariantId === exactVariantIds[1]).every((entry) => entry.inconclusiveReasonCodes.includes("OFFICIAL_EXPRESSION_TRANSMISSION_MISMATCH"))).toBe(true);
    expect(ledger.every((entry) => entry.inconclusiveReasonCodes.includes("FAMILY_OR_OTHER_CONFIGURATION_EVIDENCE_NOT_PROJECTABLE"))).toBe(true);
    expect(ledger.some((entry) => entry.disposition === "RESEARCHED_CONCLUSIVE" || entry.assertionIds.length > 0)).toBe(false);
  });

  it("contains no assertion, link, negative claim, or authoritative projection", () => {
    expect(assertions).toEqual([]);
    expect(trimLinks).toEqual([]);
    expect(packageLinks).toEqual([]);
    expect(JSON.stringify({ assertions, trimLinks, packageLinks })).not.toMatch(/STANDARD|OPTIONAL|NOT_AVAILABLE|NEGATIVE/iu);
  });

  it("keeps deterministic trim candidates as unlinked drafts", () => {
    expect(trimDrafts).toHaveLength(2);
    for (const draft of trimDrafts) {
      expect(draft.linkStatus).toBe("NOT_CREATED");
      expect(draft.reason).toBe("OFFICIAL_EXACT_TRIM_MATCH_NOT_ESTABLISHED");
      expect(draft.deterministicCandidateCanonicalTrimId).toBe(createCanonicalTrimId({ market: "TR", brand: "Dacia", modelFamily: "Jogger", modelYear: 2026, trimName: draft.catalogTrim, configurationIdentity: draft.exactVariantId }));
    }
  });

  it("keeps all 51 comparisons inconclusive without hierarchy or inheritance", () => {
    expect(comparison).toHaveLength(51);
    expect(new Set(comparison.map((entry) => entry.featureCode))).toEqual(new Set(EQUIPMENT_FEATURE_CODES));
    expect(comparison.every((entry) => entry.status === "INCONCLUSIVE_FOR_BOTH" && entry.essentialAssertionIds.length === 0 && entry.expressionAssertionIds.length === 0)).toBe(true);
    expect(comparison.every((entry) => entry.reason.includes("no inheritance or absence inference is permitted"))).toBe(true);
  });

  it("appends an independent batch review without mutating subject review events", () => {
    expect(reviewEvents).toEqual([]);
    expect(batchReviewEvents).toEqual([expect.objectContaining({ subjectType: "BATCH", subjectId: "EE-PILOT-001-BATCH-001", fromState: "SECOND_REVIEW_REQUIRED", toState: "SECOND_REVIEW_PASSED", actorRole: "EQUIPMENT_REVIEWER_SECONDARY", actorInstanceId: "ACTOR-REVIEWER-CODEX-EQUIPMENT-001" })]);
    expect(batchReviewEvents[0].actorInstanceId).not.toBe(batchLifecycle.collectorInstanceId);
    expect(new Date(batchReviewEvents[0].reviewedAt).getTime()).toBeGreaterThanOrEqual(new Date(batchLifecycle.collectionCompletedAt).getTime());
    expect(JSON.stringify(batchReviewEvents)).not.toMatch(/OWNER_APPROVAL|APPROVED/u);
  });

  it("stores the accepted-inconclusive result outside the controlled lifecycle event", () => {
    expect(batchReviewEvents[0]).not.toHaveProperty("resultCode");
    expect(reviewResult).toMatchObject({ resultCode: "ACCEPTED_INCONCLUSIVE", reviewEventId: batchReviewEvents[0].reviewEventId, actorInstanceId: "ACTOR-REVIEWER-CODEX-EQUIPMENT-001", sourceRegistryDecision: { state: "RETAINED_IN_WORKING_EXTENSION", immutableArtifactsChecksumValid: true }, releaseEffects: { equipmentProductionAssertionReleaseCreated: false, activeEquipmentPointerChanged: false, ownerApprovalCreated: false, decisionBehaviorChanged: false } });
  });

  it("creates the blocking catalog-quality handoff without production effects", () => {
    expect(catalogQualityIssues).toHaveLength(1);
    expect(catalogQualityIssues[0]).toMatchObject({ issueId: "CATALOG-DQ-D41AFAEE91B604E17B74", issueType: "EXACT_VARIANT_OFFICIAL_CONFIGURATION_MISMATCH", severity: "BLOCKS_EQUIPMENT_PROJECTION", requiredFollowUp: "SEPARATE_CATALOG_EVIDENCE_AUDIT", effects: { catalogRecordChanged: false, variantDeleted: false, equipmentAssertionCreated: false, v1OrV2DecisionBehaviorChanged: false } });
    expect(catalogQualityIssues[0].exactVariants.map((variant) => variant.exactVariantId)).toEqual(exactVariantIds);
    expect(catalogQualityIssues[0].sources.map((source) => source.sourceId)).toEqual(sourceIds);
  });

  it("retains checksum-valid sources in the working extension pending governance", () => {
    expect(sourceReviewStatus.map((source) => source.sourceId)).toEqual(sourceIds);
    expect(sourceReviewStatus.every((source) => source.artifactState === "IMMUTABLE_CHECKSUM_VALID" && source.registryState === "WORKING_EXTENSION" && source.canonicalPromotionBlocker === "CANONICAL_SOURCE_REGISTRY_PROMOTION_GOVERNANCE_NOT_EXPLICIT")).toBe(true);
  });

  it("serializes every review artifact deterministically", () => {
    for (const name of ["batch-review-events.json", "second-review-result.json", "catalog-quality-issues.json", "source-review-status.json"]) expect(readFileSync(`${root}/${name}`, "utf8")).toBe(`${JSON.stringify(json(name), null, 2)}\n`);
    expect(batchReviewEvents[0].reviewEventId).toBe(`EE-REV-${sha("EE-PILOT-001-BATCH-001|SECOND_REVIEW_REQUIRED|SECOND_REVIEW_PASSED|ACTOR-REVIEWER-CODEX-EQUIPMENT-001").slice(0, 20).toUpperCase()}`);
  });
});
