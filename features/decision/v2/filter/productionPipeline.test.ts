import { describe, expect, it } from "vitest";
import { loadProductionCatalogSnapshotForTest } from "../catalog/productionSnapshotFixture.testSupport";
import { USAGE_CARGO_POLICIES_V1 } from "../usage/policy";
import { evaluateTechnicalCandidatePool } from "./pipeline";
import { V2_DECISION_FIELD_REGISTRY_V1 } from "./registry";

describe("WP5 production snapshot diagnostic", () => {
  it("evaluates every recommendation-eligible exact variant in the active pinned snapshot deterministically", async () => {
    const loaded = await loadProductionCatalogSnapshotForTest(new Date("2026-08-19T00:00:00.000Z"));
    expect(loaded.status).toBe("READY"); if (loaded.status !== "READY") return;
    const expectedCandidateCount = loaded.snapshot.variants.length;
    const input = { snapshot: loaded.snapshot, decisionFingerprint: "production-decision", activeConstraints: { activeHardConstraints: [], activeNonHardConstraints: [], supersessionTrace: [], diagnostics: [] }, activeRejections: { rejections: [] }, usageNeed: { commercialScenario: "UNSPECIFIED" as const, orientation: "UNKNOWN" as const }, fieldRegistry: V2_DECISION_FIELD_REGISTRY_V1, usagePolicies: USAGE_CARGO_POLICIES_V1 };
    const first = evaluateTechnicalCandidatePool(input); const second = evaluateTechnicalCandidatePool(input);
    expect(first).toEqual(second); expect(first.counts).toEqual({ initial: expectedCandidateCount, eligible: expectedCandidateCount, notEvaluable: 0, eliminated: 0 });
  });
});
