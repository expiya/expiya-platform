import { describe, expect, it } from "vitest";
import { validateExperiment } from "./experimentation/experimentPolicy";
const base = { experimentId: "e", hypothesis: "Açıklama anlaşılırlığını artırır", surface: "MATCH_EXPLANATION" as const, primaryMetric: "EXPLANATION_UNDERSTANDING" as const, guardrailMetrics: ["ERROR_RATE" as const], allocationKeys: ["anonymousBucket"], startsAt: "2026-09-01", endsAt: "2026-09-08", ownerId: "owner", privacyReviewId: "privacy", fairnessReviewId: "fair", rollbackPlanChecksum: `sha256:${"a".repeat(64)}`, status: "REVIEWED" as const, productionExecutionAuthorized: false as const };
describe("used-cars experiment policy", () => {
  it("accepts a reviewed draft without authorizing execution", () => expect(validateExperiment(base)).toMatchObject({ valid: true, organicRankingMutationAuthorized: false, productionExecutionAuthorized: false }));
  it("rejects paid membership and sponsored allocation", () => expect(validateExperiment({ ...base, allocationKeys: ["dealerPlan", "sponsoredStatus"] }).codes).toContain("FORBIDDEN_ALLOCATION_KEY"));
  it("rejects an already running experiment in the design gate", () => expect(validateExperiment({ ...base, status: "RUNNING" }).codes).toContain("PRODUCTION_EXECUTION_FORBIDDEN"));
});
