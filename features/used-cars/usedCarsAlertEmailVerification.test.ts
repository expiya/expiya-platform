import { describe, expect, it } from "vitest";
import { assessVehicleAlertEmailChallenge, validateVehicleAlertEmailProof } from "./alerts/emailVerification";

const challenge = { challengeId: "email-challenge-1", normalizedEmail: "user@example.com", purpose: "VEHICLE_ALERT" as const, codeDigest: `hmac-sha256:v1:${"a".repeat(64)}`, issuedAt: "2026-09-01T10:00:00Z", expiresAt: "2026-09-01T10:10:00Z", attemptCount: 0, maximumAttempts: 5 as const, resendAvailableAt: "2026-09-01T10:01:00Z", consumedAt: null };
describe("used-cars alert email verification", () => {
  it("requires an unexpired, unused challenge below five attempts", () => expect(assessVehicleAlertEmailChallenge(challenge, "2026-09-01T10:05:00Z")).toMatchObject({ usable: true, emailDeliveryAuthorized: false }));
  it("locks the challenge after five attempts", () => expect(assessVehicleAlertEmailChallenge({ ...challenge, attemptCount: 5 }, "2026-09-01T10:05:00Z").codes).toContain("ATTEMPT_LIMIT_REACHED"));
  it("binds proof to normalized email, challenge and purpose", () => expect(validateVehicleAlertEmailProof(" User@Example.com ", "email-challenge-1", { challengeId: "email-challenge-1", normalizedEmail: "user@example.com", purpose: "VEHICLE_ALERT", verifiedAt: "2026-09-01T10:05:00Z" }).valid).toBe(true));
  it("rejects a proof for another address", () => expect(validateVehicleAlertEmailProof("other@example.com", "email-challenge-1", { challengeId: "email-challenge-1", normalizedEmail: "user@example.com", purpose: "VEHICLE_ALERT", verifiedAt: "2026-09-01T10:05:00Z" }).code).toBe("VERIFIED_EMAIL_REQUIRED"));
});
