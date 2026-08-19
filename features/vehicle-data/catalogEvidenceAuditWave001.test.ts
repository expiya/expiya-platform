import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const base = "outputs/catalog-evidence-audit-wave-001";
const read = <T>(name: string): T => JSON.parse(readFileSync(`${base}/${name}`, "utf8")) as T;

const allowed = new Set([
  "IDENTITY_CONFIRMED",
  "PROVENANCE_REINFORCEMENT_REQUIRED",
  "IDENTITY_FIELD_MISMATCH",
  "PROVENANCE_INSUFFICIENT",
  "DEFERRED_IDENTITY_AUDIT",
  "SOURCE_INSUFFICIENT",
  "QUARANTINE_RECOMMENDED",
]);

describe("Catalog Evidence Audit Wave 001", () => {
  it("reconciles the accepted scope to 19 unique exact IDs without rewriting the historical blocker", () => {
    const blocker = read<{ status: string; expected: { uniqueExactVariantCount: number }; observed: { uniqueExactVariantCount: number } }>("scope-reconciliation-blocker.json");
    const scope = read<{ historicalBlockerPreserved: boolean; scope: Record<string, number>; exactVariantIds: string[]; excludedSourceInsufficientExactVariantIds: string[] }>("scope-resolution-19.json");

    expect(blocker).toMatchObject({ status: "BLOCKED_SCOPE_CARDINALITY_MISMATCH", expected: { uniqueExactVariantCount: 18 }, observed: { uniqueExactVariantCount: 19 } });
    expect(scope.historicalBlockerPreserved).toBe(true);
    expect(scope.scope).toMatchObject({ terminalCatalogEvidenceAuditRequired: 16, additionalVolvoCatalogEvidenceHandoff: 1, alpineDeferredIdentityAudit: 2, uniqueExactVariantCount: 19 });
    expect(scope.exactVariantIds).toHaveLength(19);
    expect(new Set(scope.exactVariantIds).size).toBe(19);
    expect(scope.excludedSourceInsufficientExactVariantIds).toHaveLength(3);
    expect(scope.exactVariantIds.some((id) => scope.excludedSourceInsufficientExactVariantIds.includes(id))).toBe(false);
  });

  it("produces a controlled terminal disposition and complete identity checks for 19/19 subjects", () => {
    const scope = read<{ exactVariantIds: string[] }>("scope-resolution-19.json");
    const audit = read<{ results: Array<{ exactVariantId: string; disposition: string; officialSources: string[]; fieldChecks: Record<string, string> }>; summary: Record<string, number | string> }>("audit-results.json");

    expect(audit.results).toHaveLength(19);
    expect(new Set(audit.results.map((result) => result.exactVariantId))).toEqual(new Set(scope.exactVariantIds));
    for (const result of audit.results) {
      expect(allowed.has(result.disposition)).toBe(true);
      expect(result.officialSources.length).toBeGreaterThan(0);
      expect(Object.keys(result.fieldChecks).sort()).toEqual([
        "bodySeatsDrive", "exactApplicability", "lifecycle", "market", "modelFamily",
        "modelYear", "powertrain", "provenance", "transmission", "trim",
      ]);
    }
    expect(audit.summary).toMatchObject({ IDENTITY_CONFIRMED: 2, PROVENANCE_REINFORCEMENT_REQUIRED: 8, IDENTITY_FIELD_MISMATCH: 7, DEFERRED_IDENTITY_AUDIT: 2, total: 19, terminalDispositionCoverage: "19/19" });
  });

  it("rejects an unproven Volvo alias and keeps equipment semantics outside identity authority", () => {
    const audit = read<{ results: Array<{ exactVariantId: string; disposition: string; equipmentSemanticRiskExcludedFromIdentityDecision?: boolean; reason: string }> }>("audit-results.json");
    const recommendation = read<{ volvoConclusion: { authoritativeBridgeFound: boolean; equipmentSemanticsUsedInIdentityDecision: boolean; requiredTreatment: string } }>("immutable-patch-release-recommendation.json");
    const volvo = audit.results.find((result) => result.exactVariantId === "19951113-2e40-5526-b568-2ae1984c27e0");

    expect(volvo).toMatchObject({ disposition: "IDENTITY_FIELD_MISMATCH", equipmentSemanticRiskExcludedFromIdentityDecision: true });
    expect(volvo?.reason).toContain("does not publish P4");
    expect(recommendation.volvoConclusion).toMatchObject({ authoritativeBridgeFound: false, equipmentSemanticsUsedInIdentityDecision: false });
    expect(recommendation.volvoConclusion.requiredTreatment).toContain("Do not alias");
  });

  it("verifies the three source-insufficient records without adding or mutating them", () => {
    const backlog = read<{ verificationStatus: string; entries: Array<{ disposition: string; addedToAuditSubjects: boolean }>; escalationMutation: boolean; backlogMutation: boolean }>("source-insufficient-backlog-verification.json");
    expect(backlog.verificationStatus).toBe("VERIFIED_UNCHANGED_AND_OUTSIDE_19_SUBJECT_SCOPE");
    expect(backlog.entries).toHaveLength(3);
    expect(backlog.entries.every((entry) => entry.disposition === "SOURCE_INSUFFICIENT" && entry.addedToAuditSubjects === false)).toBe(true);
    expect(backlog.escalationMutation).toBe(false);
    expect(backlog.backlogMutation).toBe(false);
  });
});
