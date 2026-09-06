import { describe, expect, it } from "vitest";
import { dealerListingAgreementDraft, validateDealerListingAgreementDraft } from "./legal/dealerListingAgreementDraft";
import { requiredUsedCarsLegalArtifacts } from "./legal/artifactRegistry";

describe("dealer listing agreement draft", () => {
  it("contains the EIDS/IETTS and content obligations", () => { const text = dealerListingAgreementDraft.clauses.join(" "); expect(text).toContain("EİDS"); expect(text).toContain("İETTS"); expect(text).toContain("münhasır olmayan"); expect(text).toContain("emredici hakları"); });
  it("requires legal counsel, checksum and activation before production use", () => expect(validateDealerListingAgreementDraft()).toMatchObject({ usable: false, codes: ["VERSIONED_CHECKSUM_REQUIRED", "LEGAL_COUNSEL_APPROVAL_REQUIRED", "ARTIFACT_NOT_ACTIVE"], acceptanceCollectionAuthorized: false, productionUseAuthorized: false }));
  it("pins the registry draft to the EIDS/IETTS contract version", () => expect(requiredUsedCarsLegalArtifacts.find(item => item.kind === "DEALER_MEMBERSHIP_AGREEMENT")).toMatchObject({ version: "0.2-draft-eids-ietts", status: "DRAFT", productionUseAuthorized: false }));
});
