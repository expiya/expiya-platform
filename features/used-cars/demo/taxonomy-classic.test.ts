import { describe, expect, it } from "vitest";
import { DEMO_CLASSIC_CLAIMS, isClassicClaimVerified } from "./classic";
import { DEMO_IDENTITY_REQUEST } from "./taxonomyRequest";

describe("taxonomy request and classic vehicle demos", () => {
  it("never lets a seller create canonical identity", () => {
    expect(DEMO_IDENTITY_REQUEST.sellerCanCreateCanonicalIdentity).toBe(false);
  });
  it("does not mark unsupported classic claims as verified", () => {
    expect(DEMO_CLASSIC_CLAIMS.some(claim => isClassicClaimVerified(claim))).toBe(false);
    expect(DEMO_CLASSIC_CLAIMS.every(claim => claim.specialistRequired)).toBe(true);
  });
});
