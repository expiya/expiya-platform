import { describe, expect, it } from "vitest";
import { evaluateExperimentGuardrails } from "./experimentation/guardrails";
const clean = { experimentId: "e", sampleSize: 100, crossTenantIncidents: 0, consentFailures: 0, misleadingVerificationIncidents: 0, prescriptivePurchaseResponses: 0, sponsoredOrganicMixingIncidents: 0, accessibilityRegressionRatio: 0, complaintRatio: 0, errorRatio: 0 };
describe("used-cars experiment guardrails", () => {
  it("never automatically rolls out a winner", () => expect(evaluateExperimentGuardrails(clean)).toMatchObject({ continueExperiment: true, winnerSelectionAllowed: true, automaticRolloutAuthorized: false }));
  it("stops on trust and commercial separation failures", () => expect(evaluateExperimentGuardrails({ ...clean, misleadingVerificationIncidents: 1, sponsoredOrganicMixingIncidents: 1 }).stopCodes).toEqual(expect.arrayContaining(["MISLEADING_VERIFICATION", "SPONSORED_ORGANIC_MIXING"])));
  it("does not name a winner with insufficient samples", () => expect(evaluateExperimentGuardrails({ ...clean, sampleSize: 50 })).toMatchObject({ continueExperiment: true, winnerSelectionAllowed: false }));
});
