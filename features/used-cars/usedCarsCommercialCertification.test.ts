import { describe, expect, it } from "vitest";
import { validateCommercialOfferSnapshot } from "./memberships/offerSnapshot";
import { assessBillingCertification, requiredBillingCertificationScenarios } from "./memberships/billingCertification";
import { assessRankingIndependenceAudit } from "./memberships/rankingIndependenceAudit";
describe("used-cars commercial certification", () => {
  it("requires a versioned used-cars offer with separated approval", () => expect(validateCommercialOfferSnapshot({ offerId: "o1", product: "VEHICLE_ALERT_PRO", productCode: "USED_CARS_ALERT_PRO", priceMinor: 10000, currency: "TRY", taxIncluded: true, billingPeriod: "YEARLY", entitlementVersion: "v1", termsVersion: "v1", cancellationRefundVersion: "v1", validUntil: "2026-10-01", approvedByCommercialId: "commercial", approvedByLegalId: "legal", checksum: `sha256:${"a".repeat(64)}`, organicRankingBenefit: false, productionEnabled: false }, "2026-09-01")).toMatchObject({ valid: true, checkoutAuthorized: false, chargeAuthorized: false }));
  it("requires twelve billing and refund scenarios", () => expect(assessBillingCertification([]).missing).toEqual(requiredBillingCertificationScenarios));
  it("fails ranking audit on billing coupling or sponsored mixing", () => expect(assessRankingIndependenceAudit({ evaluationWindowDays: 28, paidEligibleListings: 100, unpaidEligibleListings: 100, matchedCohortCount: 5, maximumExposureDelta: .01, rankingSchemaCommercialFields: ["planCode"], rankingServiceBillingAccess: true, sponsoredOrganicMixingCount: 1, manualOrganicOverrideCount: 0, independentReviewerId: "auditor", evidenceChecksum: `sha256:${"b".repeat(64)}` }).codes).toEqual(expect.arrayContaining(["COMMERCIAL_RANKING_COUPLING", "ORGANIC_INDEPENDENCE_VIOLATION"])));
});
