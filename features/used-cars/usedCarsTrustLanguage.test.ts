import { describe, expect, it } from "vitest";
import { usedCarsTrustLanguage, validateTrustLanguageRegistry } from "./content/trustLanguage";
describe("used-cars trust language", () => {
  it("covers all eight assertion statuses", () => { expect(usedCarsTrustLanguage).toHaveLength(8); expect(validateTrustLanguageRegistry(usedCarsTrustLanguage)).toEqual([]); });
  it("allows positive verification wording only for Expiya verified", () => expect(usedCarsTrustLanguage.filter((entry) => entry.positiveVerificationClaimAllowed).map((entry) => entry.status)).toEqual(["EXPIYA_VERIFIED"]));
});
