import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { evaluateEquipmentAssociationObservation, validateEquipmentAssociationObservation } from "./equipmentAssociationObservation";
import type { EquipmentAssociationObservation } from "@/types/equipmentEvidence";

const root = process.cwd();
const base = path.join(root, "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-BATCH-002");
const r1 = path.join(base, "corrections/EE-PILOT-002-BATCH-002-R1");
const read = <T>(dir: string, name: string) => JSON.parse(readFileSync(path.join(dir, name), "utf8")) as T;
const sha = (file: string) => `sha256:${createHash("sha256").update(readFileSync(file)).digest("hex")}`;

describe("Batch 002 R1 availability semantics correction", () => {
  const observations = read<EquipmentAssociationObservation[]>(r1, "association-observations.json");
  const transitions = read<Array<{ fromAssertionId: string; toObservationId: string; result: string }>>(r1, "correction-transitions.json");
  const preservation = read<{ originalAssertions: { sha256: string }; originalTrimLinks: { sha256: string }; mutationPerformed: boolean }>(r1, "historical-artifact-preservation.json");

  it("preserves all 49 conflict assertions and both passed trim links byte-identically", () => {
    expect(sha(path.join(base, "assertions.json"))).toBe(preservation.originalAssertions.sha256);
    expect(sha(path.join(base, "trim-links.json"))).toBe(preservation.originalTrimLinks.sha256);
    expect(preservation.mutationPerformed).toBe(false);
  });

  it("creates 49 association-only observations and no successor assertions", () => {
    expect(observations).toHaveLength(49);
    expect(read<unknown[]>(r1, "successor-assertions.json")).toEqual([]);
    expect(transitions).toHaveLength(49);
    expect(transitions.every((item) => item.result === "EXACT_TRIM_ASSOCIATION_ONLY")).toBe(true);
  });

  it("keeps assertion and observation type boundaries separate", () => {
    expect(observations.every((item) => item.observationType === "LISTED_FOR_EXACT_TRIM")).toBe(true);
    expect(observations.every((item) => !("availabilityStatus" in item) && !("provisionMode" in item))).toBe(true);
    expect(observations.every((item) => item.provisionKnowledge === "PROVISION_UNRESOLVED")).toBe(true);
  });

  it("gives observations no filter, rank, confirmed explanation, or production authority", () => {
    expect(observations.every((item) => {
      const effect = evaluateEquipmentAssociationObservation(item);
      return effect.hardFilter === false && effect.rankingContribution === 0 && effect.confirmedUserFacingFact === false
        && effect.productionProjectionEligible === false && effect.confirmationRequired === true;
    })).toBe(true);
  });

  it("requires exact variant, source row, mapping, and review boundary", () => {
    expect(observations.flatMap(validateEquipmentAssociationObservation)).toEqual([]);
    expect(validateEquipmentAssociationObservation({ ...observations[0], sourceRowId: "" })).toContain("ASSOCIATION_EXACT_PROVENANCE_REQUIRED");
  });

  it("rejects availability and INCLUDED fields on observations", () => {
    expect(validateEquipmentAssociationObservation({ ...observations[0], availabilityStatus: "STANDARD", provisionMode: "INCLUDED" }))
      .toEqual(expect.arrayContaining(["ASSOCIATION_AVAILABILITY_STATUS_FORBIDDEN", "ASSOCIATION_PROVISION_MODE_FORBIDDEN"]));
  });

  it("maintains exact trim and powertrain scope", () => {
    expect(observations.every((item) => (item.trimApplicability === "Ti" && item.powertrainApplicability === "DIESEL_130_TCT6" && item.exactVariantId === "54bbe431-a3c2-56d0-8177-cefdf0330bcb")
      || (item.trimApplicability === "Speciale" && item.powertrainApplicability === "HYBRID_175_TCT7" && item.exactVariantId === "f12f742b-111c-54de-a006-61361fb1ae04"))).toBe(true);
  });

  it("retains all supporting row and mapping references deterministically", () => {
    expect(observations.every((item) => item.supportingSourceRowIds.includes(item.sourceRowId) && item.semanticMappingIds.includes(item.semanticMappingId))).toBe(true);
    expect(new Set(observations.map((item) => `${item.exactVariantId}|${item.featureCode}`)).size).toBe(49);
  });

  it("does not use a new or historical provision source", () => {
    const recovery = read<{ explicitStandardFeatureCount: number; explicitOptionalFeatureCount: number; explicitPackageDependentFeatureCount: number; newSourceCount: number }>(r1, "source-recovery-report.json");
    expect(recovery).toMatchObject({ explicitStandardFeatureCount: 0, explicitOptionalFeatureCount: 0, explicitPackageDependentFeatureCount: 0, newSourceCount: 0 });
  });

  it("requires independent review for observations and correction transitions", () => {
    const events = read<Array<{ actorRole: string; toState: string }>>(r1, "review-events.json");
    expect(events).toHaveLength(196);
    expect(events.every((item) => item.actorRole === "EQUIPMENT_COLLECTOR_PRIMARY")).toBe(true);
    expect(events.filter((item) => item.toState === "SECOND_REVIEW_REQUIRED")).toHaveLength(98);
    expect(events.some((item) => item.toState === "SECOND_REVIEW_PASSED")).toBe(false);
  });

  it("records no activation in R1 while preserving Decision Engine authority after later activation", () => {
    const active = JSON.parse(readFileSync(path.join(root, "data/production/equipment-evidence/active.json"), "utf8"));
    const result = read<{ decisionAuthority: string; activePointerChanged: boolean }>(r1, "correction-result.json");
    expect(active.activeEquipmentEvidenceRelease).toBe("v1.4.0-reviewed-associations-catalog-v0.55.2-2026-08-18");
    expect(result).toMatchObject({ decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED", activePointerChanged: false });
  });
});
