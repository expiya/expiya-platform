import { describe, expect, it } from "vitest";
import { evaluateGroundedResponse } from "./model-governance/responseGrounding";

describe("used-cars grounded response gate", () => {
  it("requires evidence for verified claims", () => expect(evaluateGroundedResponse([{ claimId: "c", status: "EXPIYA_VERIFIED", evidenceRefs: [], wording: "doğrulandı" }], "Bilgi doğrulandı").codes).toContain("VERIFIED_CLAIM_WITHOUT_EVIDENCE"));
  it("keeps dealer declarations distinct", () => expect(evaluateGroundedResponse([{ claimId: "c", status: "DEALER_DECLARATION", evidenceRefs: ["d"], wording: "Expiya doğruladı" }], "Satıcı beyanı").allowed).toBe(false));
  it("blocks prescriptive purchase and guarantee language", () => expect(evaluateGroundedResponse([], "Bu aracı kesin al; kilometre garantisi var.").purchaseDecisionAuthorized).toBe(false));
  it("allows an explicit uncertainty and safe-next-step explanation", () => expect(evaluateGroundedResponse([{ claimId: "c", status: "MISSING", evidenceRefs: [], wording: "bakım" }], "Bakım bilgisi eksik; satıcıdan belge isteyin ve bağımsız ekspertiz yaptırın.").allowed).toBe(true));
});
