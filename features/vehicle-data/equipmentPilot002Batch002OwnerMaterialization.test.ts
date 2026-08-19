import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { getReviewedEquipmentAssociations, getVerifiedEquipmentAssertions, getVerifiedEquipmentTrimLinks, parseEquipmentReviewedAssociationCandidate } from "./equipmentReviewedAssociationAdapter";
import { canonicalJson } from "./equipmentVerificationMaterialization";

const root = process.cwd();
const dir = path.join(root, "data/production/equipment-evidence/release-candidates/v1.4.0-reviewed-associations-catalog-v0.55.2-2026-08-18");
const read = <T>(name: string): T => JSON.parse(readFileSync(path.join(dir, name), "utf8")) as T;
const sha = (file: string) => `sha256:${createHash("sha256").update(readFileSync(file)).digest("hex")}`;
const payloadRaw = readFileSync(path.join(dir, "equipment-evidence-release-candidate.json"), "utf8");
const payload = parseEquipmentReviewedAssociationCandidate(JSON.parse(payloadRaw));
const approvals = read<Array<Record<string, unknown>>>("owner-approval-events.json");
const associations = read<Array<Record<string, unknown>>>("reviewed-association-materializations.json");
const trims = read<Array<Record<string, unknown>>>("verified-trim-link-materializations.json");
const coverage = read<Record<string, unknown> & { verifiedAssertionCoverage: { exactVariantCount: number }; reviewedAssociationCoverage: { exactVariantCount: number }; uncoveredCoverage: { exactVariantCount: number } }>("coverage-report.json");
const tonaleIds = ["54bbe431-a3c2-56d0-8177-cefdf0330bcb", "f12f742b-111c-54de-a006-61361fb1ae04"];

describe("Batch 002 owner approval materialization release candidate", () => {
  it("creates 49 observation, 2 trim-link, and 51 total approval events", () => {
    expect(approvals.filter((x) => x.subjectType === "ASSOCIATION_OBSERVATION")).toHaveLength(49);
    expect(approvals.filter((x) => x.subjectType === "TRIM_LINK")).toHaveLength(2);
    expect(approvals).toHaveLength(51);
  });
  it("materializes 49 reviewed associations and two Tonale trim links", () => { expect(associations).toHaveLength(49); expect(trims).toHaveLength(2); });
  it("preserves 47 verified assertions and four cumulative trim links", () => { expect(payload.verifiedAssertions).toHaveLength(47); expect(payload.verifiedTrimLinks).toHaveLength(4); });
  it("keeps coverage tiers separate", () => { expect(coverage.verifiedAssertionCoverage.exactVariantCount).toBe(2); expect(coverage.reviewedAssociationCoverage.exactVariantCount).toBe(2); expect(coverage.uncoveredCoverage.exactVariantCount).toBe(562); });
  it("keeps associations outside availability, provision, and projection semantics", () => {
    for (const item of associations) {
      expect(item).not.toHaveProperty("availabilityStatus"); expect(item).not.toHaveProperty("provisionMode"); expect(item).not.toHaveProperty("projectionAuthority");
      expect(item).toMatchObject({ materializationType: "REVIEWED_EQUIPMENT_ASSOCIATION", provisionKnowledge: "PROVISION_UNRESOLVED", decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED" });
    }
  });
  it("exposes association and assertion tiers through different adapter APIs", () => {
    expect(getVerifiedEquipmentAssertions(payload)).toHaveLength(47); expect(getReviewedEquipmentAssociations(payload)).toHaveLength(49); expect(getVerifiedEquipmentTrimLinks(payload)).toHaveLength(4);
    expect(getVerifiedEquipmentAssertions(payload).some((x) => tonaleIds.includes(x.exactVariantId))).toBe(false);
  });
  it("creates no Tonale availability projection and preserves Junior projections", () => {
    expect(payload.projections).toHaveLength(47); expect(payload.projections.some((x) => tonaleIds.includes((x as { exactVariantId?: string }).exactVariantId ?? ""))).toBe(false);
  });
  it("preserves exact trim and powertrain isolation", () => {
    const diesel = associations.filter((x) => x.exactVariantId === tonaleIds[0]), hybrid = associations.filter((x) => x.exactVariantId === tonaleIds[1]);
    expect(diesel.every((x) => x.trimApplicability === "Ti" && x.powertrainApplicability === "DIESEL_130_TCT6")).toBe(true);
    expect(hybrid.every((x) => x.trimApplicability === "Speciale" && x.powertrainApplicability === "HYBRID_175_TCT7")).toBe(true);
  });
  it("does not materialize transitions, conflict assertions, or inconclusive ledger rows", () => {
    expect(approvals.some((x) => x.subjectType === "CORRECTION_TRANSITION" || x.subjectType === "ASSERTION" || x.subjectType === "RESEARCH_LEDGER")).toBe(false);
  });
  it("is canonical and checksum-bound", () => { expect(payloadRaw).toBe(canonicalJson(JSON.parse(payloadRaw))); const manifest = read<{ payloadSha256: string }>("manifest.json"); expect(manifest.payloadSha256).toBe(`sha256:${createHash("sha256").update(payloadRaw).digest("hex")}`); });
  it("retains deterministic immutable candidate artifacts", () => {
    expect(sha(path.join(dir, "equipment-evidence-release-candidate.json"))).toBe(read<{ payloadSha256: string }>("manifest.json").payloadSha256);
  });
  it("keeps all decision and public-output effects disabled", () => {
    const dry = read<Record<string, unknown>>("decision-neutrality-dry-run.json");
    expect(dry).toMatchObject({ status: "PASSED", tonaleAvailabilityProjectionCount: 0, hardFilter: false, ranking: false, questionGeneration: false, userFacingConfirmedFact: false, candidateImpact: "NONE", publicOutputImpact: "NONE" });
  });
});
