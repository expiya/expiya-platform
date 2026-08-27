import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { configuredSmsOtpAdapter, consumePhoneVerification, DisabledSmsOtpAdapter, InMemorySmsOtpAdapter, issuePhoneOtp, resetOtpForTests, verifyPhoneOtp } from "./otp.server";

describe("SMS OTP phone verification", () => {
  beforeEach(resetOtpForTests);
  afterEach(() => {
    delete process.env.CARS_SMS_OTP_ENDPOINT;
    delete process.env.CARS_SMS_OTP_BEARER_TOKEN;
    delete process.env.CARS_PHASE3_EXTERNAL_EXECUTION_ENABLED;
  });

  it("keeps real SMS delivery fail-closed while legal readiness is false", () => {
    process.env.CARS_SMS_OTP_ENDPOINT = "https://sms.invalid/send";
    process.env.CARS_SMS_OTP_BEARER_TOKEN = "not-a-real-token";
    process.env.CARS_PHASE3_EXTERNAL_EXECUTION_ENABLED = "true";
    expect(configuredSmsOtpAdapter()).toBeInstanceOf(DisabledSmsOtpAdapter);
  });

  it("binds a short-lived OTP and verification token to phone and handoff", async () => {
    const adapter = new InMemorySmsOtpAdapter();
    const issued = await issuePhoneOtp({ phone: "0532 123 45 67", handoff: "p3.bound" }, adapter, 1_000);
    expect(adapter.deliveries).toHaveLength(1);
    const verified = verifyPhoneOtp({ challengeId: issued.challengeId, code: adapter.deliveries[0]!.code, handoff: "p3.bound" }, 2_000);
    expect(consumePhoneVerification({ token: verified.verificationToken, phone: "+90 532 123 45 67", handoff: "p3.bound" }, 3_000).phone).toBe("+905321234567");
    expect(() => consumePhoneVerification({ token: verified.verificationToken, phone: "05321234567", handoff: "p3.bound" }, 4_000)).toThrow("PHONE_NOT_VERIFIED");
  });

  it("rejects wrong codes, another handoff and expiry", async () => {
    const adapter = new InMemorySmsOtpAdapter();
    const issued = await issuePhoneOtp({ phone: "05321234567", handoff: "p3.bound" }, adapter, 1_000);
    expect(() => verifyPhoneOtp({ challengeId: issued.challengeId, code: "000000", handoff: "p3.bound" }, 2_000)).toThrow("OTP_CODE_INVALID");
    expect(() => verifyPhoneOtp({ challengeId: issued.challengeId, code: adapter.deliveries[0]!.code, handoff: "p3.other" }, 2_000)).toThrow("OTP_CHALLENGE_INVALID");
    expect(() => verifyPhoneOtp({ challengeId: issued.challengeId, code: adapter.deliveries[0]!.code, handoff: "p3.bound" }, 302_000)).toThrow("OTP_CHALLENGE_INVALID");
  });
});
