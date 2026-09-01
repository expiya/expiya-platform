import { describe, expect, it } from "vitest";
import { validateAnalyticsStream } from "./analytics/contracts";
import { composeSearchSurface, assertOrganicRankingInput } from "./matching/commercialSeparation";
import { deriveAgeMileageCorridor, evaluateUsedCarCandidate, rankOrganicMatches, type UsedCarCandidateFacts } from "./matching/policy";
import { validateMembershipPlan } from "./memberships/plans";
import { canPerformSecondReview, canTransitionModerationTask, isModerationDecisionComplete, type ModerationTask } from "./moderation/workflow";
import { assessUsedCarsFoundationReadiness } from "./readiness/assessFoundationReadiness";
import type { UsedCarPreferenceLedger } from "./risk/preferenceLedger";

const ledger: UsedCarPreferenceLedger = {
  version: "used-car-preference-ledger/v1", totalBudgetTry: 2_000_000,
  usagePurposes: ["FAMILY"], annualMileageKm: 15_000, bodyStyles: ["SUV"], fuelTypes: ["GASOLINE"], transmissions: ["AUTOMATIC"],
  minimumModelYear: { value: 2020, strength: "HARD" }, maximumMileageKm: { value: 100_000, strength: "HARD" },
  paintTolerance: "LIMITED", replacedPartTolerance: "LIMITED", heavyDamageApproach: "EXCLUDE",
  maintenanceExpectation: "DOCUMENTED", warrantyExpectation: "PREFERRED", unexpectedExpenseTolerance: "LOW",
  nearbyServiceAccessRequired: true, resalePriority: "HIGH", classicInterest: false,
};

const candidate: UsedCarCandidateFacts = {
  inventoryUnitId: "unit-a", taxonomyFamilyId: "family-a", modelYear: 2022, mileageKm: 48_000,
  askingPriceTry: 1_700_000, bodyStyle: "SUV", fuelType: "GASOLINE", transmission: "AUTOMATIC",
  heavyDamageDeclared: false, maintenanceDocumented: true, warrantyAvailable: false,
  serviceAccessAvailable: true, evidenceReadiness: 0.8, operationalAvailability: 1,
};

describe("used-cars matching policy", () => {
  it("derives an advisory age-mileage corridor without presenting certainty", () => {
    expect(deriveAgeMileageCorridor(ledger, 2026)).toMatchObject({ minimumModelYear: 2020, maximumMileageKm: 100_000, advisoryOnly: true });
    expect(deriveAgeMileageCorridor({ ...ledger, minimumModelYear: undefined, maximumMileageKm: undefined }, 2026)).toMatchObject({ minimumModelYear: 2022, maximumMileageKm: 70_000, advisoryOnly: true });
  });

  it("applies hard constraints before scoring and treats unknown heavy damage as unsafe", () => {
    expect(evaluateUsedCarCandidate({ ledger, corridor: deriveAgeMileageCorridor(ledger, 2026), candidate }).eligible).toBe(true);
    expect(evaluateUsedCarCandidate({ ledger, corridor: deriveAgeMileageCorridor(ledger, 2026), candidate: { ...candidate, askingPriceTry: 2_100_000 } })).toMatchObject({ eligible: false, rejectionCodes: ["HARD_BUDGET_EXCEEDED"] });
    expect(evaluateUsedCarCandidate({ ledger, corridor: deriveAgeMileageCorridor(ledger, 2026), candidate: { ...candidate, heavyDamageDeclared: null } })).toMatchObject({ eligible: false, rejectionCodes: ["HEAVY_DAMAGE_NOT_SAFELY_EXCLUDED"] });
    expect(evaluateUsedCarCandidate({ ledger, corridor: deriveAgeMileageCorridor(ledger, 2026), candidate: { ...candidate, operationalAvailability: 0 } })).toMatchObject({ eligible: false, rejectionCodes: ["NOT_OPERATIONALLY_AVAILABLE"] });
  });

  it("returns separate fit dimensions, uncertainty and safe next steps", () => {
    const evaluation = evaluateUsedCarCandidate({ ledger: { ...ledger, heavyDamageApproach: "CONSIDER_WITH_EVIDENCE" }, corridor: deriveAgeMileageCorridor(ledger, 2026), candidate: { ...candidate, heavyDamageDeclared: null, maintenanceDocumented: false } });
    expect(evaluation.result).toMatchObject({ organic: true, dimensions: { operationalAvailability: 1 } });
    expect(evaluation.result?.uncertainties).toContain("Ağır hasar bilgisi eksik.");
    expect(evaluation.result?.safeNextSteps).toContain("Bağımsız ekspertiz planlayın.");
  });

  it("ranks deterministically using only organic dimensions", () => {
    const first = evaluateUsedCarCandidate({ ledger, corridor: deriveAgeMileageCorridor(ledger, 2026), candidate }).result!;
    const second = { ...first, inventoryUnitId: "unit-b", dimensions: { ...first.dimensions, needFit: 0.5 } };
    expect(rankOrganicMatches([second, first]).map((item) => item.inventoryUnitId)).toEqual(["unit-a", "unit-b"]);
  });
});

describe("commercial neutrality and analytics separation", () => {
  const match = evaluateUsedCarCandidate({ ledger, corridor: deriveAgeMileageCorridor(ledger, 2026), candidate }).result!;

  it("rejects commercial fields from organic ranking input", () => {
    expect(() => assertOrganicRankingInput({ matches: [match], policyVersion: "v1", catalogReleaseVersion: "tax-v1" })).not.toThrow();
    expect(() => assertOrganicRankingInput({ matches: [match], policyVersion: "v1", catalogReleaseVersion: "tax-v1", planCode: "ENTERPRISE" } as never)).toThrow("COMMERCIAL_FIELD_FORBIDDEN_IN_ORGANIC_RANKING:planCode");
  });

  it("keeps organic and sponsored streams structurally separate", () => {
    expect(composeSearchSurface([match], [{ listingId: "listing-sponsored", label: "SPONSORED", campaignId: "campaign-1" }])).toMatchObject({ streamsMixed: false });
  });

  it("requires all membership plans to have zero organic ranking benefit", () => {
    expect(validateMembershipPlan({ code: "ENTERPRISE", billingPeriod: "YEARLY", activeStockLimit: 10_000, branchLimit: 100, userLimit: 1_000, analyticsLevel: "ADVANCED", feedIntegration: true, organicRankingBenefit: false })).toBe(true);
    expect(validateMembershipPlan({ code: "STARTER", billingPeriod: "MONTHLY", activeStockLimit: 0, branchLimit: 1, userLimit: 2, analyticsLevel: "BASIC", feedIntegration: false, organicRankingBenefit: false })).toBe(false);
  });

  it("does not mix sponsored campaign attributes into organic analytics", () => {
    const base = { version: "used-cars-analytics/v1" as const, namespace: "used_b2c" as const, occurredAt: "2026-09-01T00:00:00.000Z" };
    expect(validateAnalyticsStream({ ...base, eventName: "organic_impression", attributes: { rank: 1 } })).toBe(true);
    expect(validateAnalyticsStream({ ...base, eventName: "organic_impression", attributes: { rank: 1, campaignId: "campaign-1" } })).toBe(false);
    expect(validateAnalyticsStream({ ...base, eventName: "sponsored_impression", attributes: { sponsored: true, campaignId: "campaign-1" } })).toBe(true);
    expect(validateAnalyticsStream({ ...base, eventName: "sponsored_impression", attributes: { campaignId: "campaign-1" } })).toBe(false);
  });
});

describe("moderation execution and final readiness", () => {
  const task: ModerationTask = {
    id: "task-1", subjectType: "LISTING", subjectId: "listing-1", subjectRevisionId: "revision-1",
    status: "DECIDED", assignedActorId: "moderator-1", firstDecisionActorId: "moderator-1",
    decision: "APPROVE", reasonCode: "ALL_GATES_PASSED",
  };

  it("requires an explicit claimed-decision path and independent appeal review", () => {
    expect(canTransitionModerationTask("OPEN", "DECIDED")).toBe(false);
    expect(canTransitionModerationTask("OPEN", "CLAIMED")).toBe(true);
    expect(isModerationDecisionComplete(task)).toBe(true);
    expect(canPerformSecondReview({ ...task, status: "SECOND_REVIEW" }, "moderator-1")).toBe(false);
    expect(canPerformSecondReview({ ...task, status: "SECOND_REVIEW" }, "moderator-2")).toBe(true);
  });

  it("marks the foundation complete while keeping pilot writes and launch unauthorized", () => {
    const readiness = assessUsedCarsFoundationReadiness({
      architectureApproved: true, domainContractsReady: true, tenantIsolationTestsPassed: true,
      publicProjectionTestsPassed: true, mediaFraudTestsPassed: true, leadConsentRetentionTestsPassed: true,
      taxonomyGovernanceTestsPassed: true, matchingFairnessTestsPassed: true,
      legalReviewComplete: false, rlsDesignApproved: false, productionAdaptersPresent: false,
    });
    expect(readiness).toMatchObject({ foundationComplete: true, pilotDataWriteAuthorized: false, productionLaunchAuthorized: false });
    expect(readiness.blockingCodes).toEqual(["LEGAL_REVIEW_REQUIRED", "RLS_DESIGN_APPROVAL_REQUIRED", "PRODUCTION_ADAPTERS_NOT_IMPLEMENTED"]);
  });
});

