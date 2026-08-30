import { describe, expect, it } from "vitest";
import { decryptPaidReportDeliveryEmail, encryptPaidReportDeliveryEmail } from "./deliveryEmailCipher.server";

const environment = { NODE_ENV: "test", PAID_REPORT_PII_KEY: Buffer.alloc(32, 7).toString("base64url") } as unknown as NodeJS.ProcessEnv;
describe("paid report delivery email encryption", () => {
  it("stores a randomized authenticated ciphertext instead of the address", () => {
    const first = encryptPaidReportDeliveryEmail("Ada@Example.com", environment); const second = encryptPaidReportDeliveryEmail("Ada@Example.com", environment);
    expect(first).not.toBe(second); expect(first).not.toContain("example.com"); expect(decryptPaidReportDeliveryEmail(first, environment)).toBe("ada@example.com");
  });
  it("fails closed when the key is missing", () => { expect(() => encryptPaidReportDeliveryEmail("ada@example.com", {} as NodeJS.ProcessEnv)).toThrow("PAID_REPORT_PII_KEY_REQUIRED"); });
});
