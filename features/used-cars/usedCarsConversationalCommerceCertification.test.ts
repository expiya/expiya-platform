import { describe, expect, it } from "vitest";
import { validateConversationProviderAdapter } from "./conversation-orchestration/providerAdapterManifest";
import { assessConversationSafetyEval, requiredConversationSafetyScenarios } from "./conversation-orchestration/safetyEval";
import { assessNegotiationFairness } from "./negotiation/fairnessAudit";
import { assessConversationKillSwitchDrill, requiredConversationKillScopes } from "./conversation-orchestration/killSwitchDrill";
describe("used-cars conversational commerce certification", () => {
  it("keeps provider-neutral adapters disabled", () => expect(validateConversationProviderAdapter({ capability: "LIVE_VIDEO", providerCode: null, opaqueSubjectIds: true, shortLivedSingleUseTokens: true, signedTimestampedWebhooks: true, replayProtection: true, recordingDefaultOff: true, transcriptionDefaultOff: true, trainingUseDefaultOff: true, dataLocationReviewed: false, dpaApproved: false, productionEnabled: false })).toEqual({ valid: true, codes: [], realSessionAuthorized: false }));
  it("requires seventeen safety scenarios", () => expect(assessConversationSafetyEval([]).missing).toEqual(requiredConversationSafetyScenarios));
  it("rejects protected-attribute negotiation", () => expect(assessNegotiationFairness({ policyVersion: "v1", minimumOffersPerCohort: 100, maximumOfferDeltaRatio: 0, protectedAttributesUsed: ["gender"], sameInputConsistencyRatio: 1, hiddenFloorDisclosureCount: 0, unauthorizedBindingOfferCount: 0, independentReviewerId: "auditor", evidenceChecksum: `sha256:${"a".repeat(64)}` }).codes).toContain("PROTECTED_ATTRIBUTE_USE_FORBIDDEN"));
  it("requires six kill-switch scopes without auto restart", () => expect(assessConversationKillSwitchDrill([])).toMatchObject({ missing: requiredConversationKillScopes, automaticRestartAuthorized: false }));
});
