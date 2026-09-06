import { describe, expect, it } from "vitest";
import { validateVehicleAlertRequest } from "./alerts/contracts";
import { validateVehicleAlertPlans, vehicleAlertPlanDrafts } from "./alerts/plans";
const base = { alertId: "alert-1", preferenceFingerprint: `hmac-sha256:v1:${"a".repeat(64)}`, email: "demo@example.com", emailChallengeId: "email-challenge-demo", cadence: "WEEKLY" as const, plan: "FREE" as const, geography: "SELECTED_CITIES" as const, selectedCities: ["İstanbul"], expiresAt: "2026-10-01", serviceNotificationAccepted: true, marketingConsentBundled: false as const, organicRankingBenefit: false as const, paymentCollected: false as const, activationAuthorized: false as const };
const proof = { challengeId: "email-challenge-demo", normalizedEmail: "demo@example.com", purpose: "VEHICLE_ALERT" as const, verifiedAt: "2026-09-01T00:01:00Z" };
describe("used-cars vehicle alerts", () => {
  it("accepts a bounded request without authorizing delivery or payment", () => expect(validateVehicleAlertRequest(base, "2026-09-01", proof)).toMatchObject({ valid: true, emailDeliveryAuthorized: false, paymentCollectionAuthorized: false }));
  it("requires verified ownership of the submitted email", () => expect(validateVehicleAlertRequest(base, "2026-09-01").codes).toContain("VERIFIED_EMAIL_REQUIRED"));
  it("forbids bundled marketing consent", () => expect(validateVehicleAlertRequest({ ...base, marketingConsentBundled: true }, "2026-09-01", proof).codes).toContain("MARKETING_CONSENT_BUNDLING_FORBIDDEN"));
  it("limits free alerts to five cities", () => expect(validateVehicleAlertRequest({ ...base, selectedCities: ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Adana"] }, "2026-09-01", proof).codes).toContain("FREE_CITY_SCOPE_INVALID"));
  it("limits free alerts to twelve weeks", () => expect(validateVehicleAlertRequest({ ...base, expiresAt: "2026-11-25" }, "2026-09-01", proof).codes).toContain("FREE_DURATION_EXCEEDED"));
  it("limits pro alerts to one calendar year", () => expect(validateVehicleAlertRequest({ ...base, plan: "PRO", cadence: "INSTANT", geography: "NATIONWIDE_TR", selectedCities: [], expiresAt: "2027-09-02" }, "2026-09-01", proof).codes).toContain("PRO_DURATION_EXCEEDED"));
  it("keeps free and pro pricing drafts disabled and ranking-neutral", () => expect(validateVehicleAlertPlans(vehicleAlertPlanDrafts)).toMatchObject({ valid: true, billingActivationAuthorized: false, checkoutNavigationAuthorized: false }));
});
