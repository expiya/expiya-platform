import { describe, expect, it } from "vitest";
import { classifyDeterministicOfferResponse, createDeterministicOfferResponsePlan } from "./offerResponse";
describe("deterministic offer responses", () => {
  it.each(["Paylaş", " göster bakalım! ", "EVET 👍", "Hadi görelim", "Seçenekleri göster"])("classifies consent: %s", (text) => expect(classifyDeterministicOfferResponse(text)).toBe("ACCEPT"));
  it.each(["Hayır", "gösterme", "Göstermek istemiyorum", "vazgeçtim", "sonra bakalım", "gerek yok"])("classifies decline: %s", (text) => expect(classifyDeterministicOfferResponse(text)).toBe("DECLINE"));
  it.each(["Belki", "Bilmiyorum", "Hangileri?", "Neye göre?", "Bir düşüneyim", "Belki paylaşırım"])("does not infer ambiguous response: %s", (text) => expect(classifyDeterministicOfferResponse(text)).toBeNull());
  it("creates a decision-neutral authoritative plan", () => { const plan = createDeterministicOfferResponsePlan("m", "ACCEPT"); expect(plan.result.acts).toEqual(["OFFER_ACCEPTANCE"]); expect(plan.acceptedConstraintMutations).toEqual([]); expect(plan.acceptedBudgetMutations).toEqual([]); expect(plan.acceptedPersonaMutations).toEqual([]); });
});
