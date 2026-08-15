import { describe, expect, it, vi } from "vitest";

vi.mock("./planCarsConversationTurn", () => ({
  planCarsConversationTurn: vi.fn().mockResolvedValue({
    requestedModel: "gpt-5.5",
    parseOutcome: "UNAVAILABLE",
    fallbackUsed: false,
  }),
}));

import { buildCarsRequirementLedger } from "./carsConversationMemory";
import {
  alreadyStatedCoverageLimitation,
  coverageLimitationMessage,
  coverageLimitationRepeat,
} from "./carsDirectRecommendation";
import { evaluateCarsConversationQuality } from "./evaluateCarsConversationQuality";
import {
  budgetCategoryFromText,
  emptyConversationTrace,
  isHardBudgetCeiling,
} from "./carsRequirementLedger";
import { runCarsConversationTurn } from "./runCarsConversationTurn";

const DISMISSIVE = /uyduramam|burada durabiliriz|rastgele isim saymam|sana model atamam|daha fazla bilgi verirsen belki/iu;
const GENERIC_HATCH = /küçük otomatik hatchback|parkı kolay|piyasası canlı/iu;
const IDENTITY = /Hyundai|IONIQ|RVC-/i;

describe("hard vs soft unsupported budget language", () => {
  it("does not treat approximate budget as a hard ceiling", () => {
    expect(isHardBudgetCeiling("Bütçem yaklaşık 2,5 milyon.")).toBe(false);
    expect(budgetCategoryFromText("Bütçem yaklaşık 2,5 milyon.")).toBe("SOFT_CONTEXT");
    const trace = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "Bütçem yaklaşık 2,5 milyon." },
    ]);
    expect(trace.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "BUDGET_MAX_TRY",
        value: 2_500_000,
        category: "SOFT_CONTEXT",
        evaluability: "UNDERSTOOD_NOT_EVALUABLE",
      }),
    ]));
  });

  it.each([
    "2 milyonun üzerine çıkmak istemiyorum.",
    "En fazla 2 milyon.",
    "2 milyon kesin üst sınırım.",
    "2 milyon, bütçeyi aşamam.",
  ])("treats %s as a hard unevaluated constraint", (text) => {
    expect(isHardBudgetCeiling(text)).toBe(true);
    expect(budgetCategoryFromText(text)).toBe("HARD_UNEVALUATED_CONSTRAINT");
    const trace = buildCarsRequirementLedger([{ id: "1", role: "user", content: text }]);
    expect(trace.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({
        key: "BUDGET_MAX_TRY",
        value: 2_000_000,
        category: "HARD_UNEVALUATED_CONSTRAINT",
        evaluability: "UNDERSTOOD_NOT_EVALUABLE",
      }),
    ]));
  });

  it("treats aşamam language as hard even without repeating the amount in isolation", () => {
    expect(isHardBudgetCeiling("Bütçeyi aşamam.")).toBe(true);
  });
});

describe("hard budget filters affordability before a budget-compatible offer", () => {
  it("does not offer an over-budget unique technical match as the winning candidate", async () => {
    const first = await runCarsConversationTurn({
      conversationId: "hard-budget-block",
      messages: [{
        id: "1",
        role: "user",
        content: "Bütçem 2 milyon, üzerine kesinlikle çıkmak istemiyorum. En az 7 koltuk ve en az 300 litre bagaj istiyorum.",
      }],
    });
    expect(first.kind).toBe("QUESTION");
    expect(first.message).not.toMatch(IDENTITY);
    expect(first.message).not.toMatch(/bütçene uyuyor|satın alabilirsin|bu fiyat aralığında|bütçenin içinde|ikinci elde bulunur|galeride vardır/iu);
    expect(first.conversation?.recommendationOfferStatus).not.toBe("AWAITING_CONSENT");
    expect(first.conversation?.heldAuthorization).toBeFalsy();
    expect(first.conversation?.offerPurpose).toBe("NO_AFFORDABLE_MATCH");
    expect(first.conversation?.turnProvenance?.affordabilityClaimAuthorized).toBe(false);
    expect(first.conversation?.turnProvenance?.purchasableUnitAuthorized).toBe(false);
    expect(first.conversation?.turnProvenance?.offerAuthorized).toBe(false);
    expect(first.conversation?.turnProvenance?.cardRevealAuthorized).toBe(false);
    expect(first.conversation?.turnProvenance?.budgetEvaluated).toBe(true);
    expect(first.conversation?.turnProvenance?.acquisitionMarket).toBe("NEW_ONLY");
    expect(first.conversation?.priceEvaluations?.some((item) => item.result === "FAIL")).toBe(true);
  });

  it("does not let a soft budget silently claim evaluation", async () => {
    const offer = await runCarsConversationTurn({
      conversationId: "soft-budget-no-claim",
      messages: [{ id: "1", role: "user", content: "Bütçem yaklaşık 2,5 milyon. En az 7 koltuk ve en az 300 litre bagaj istiyorum." }],
    });
    expect(offer.conversation?.recommendationOfferStatus).toBe("AWAITING_CONSENT");
    expect(offer.conversation?.turnProvenance?.budgetEvaluated).toBe(false);
    expect(offer.conversation?.turnProvenance?.unevaluatedBudgetPresent).toBe(true);
    expect(offer.conversation?.turnProvenance?.recommendationBlockedByHardConstraint).toBe(false);
    expect(offer.message).not.toMatch(/bütçenizi karşıl|bütçe.*karşılıyor|tüm (?:şart|ihtiyac)/iu);
  });
});

describe("safe governed offer remains unchanged without a hard unsupported conflict", () => {
  it("still offers on 7 seats and 300 L, then reveals the exact held candidate", async () => {
    const offer = await runCarsConversationTurn({
      conversationId: "safe-governed",
      messages: [{ id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." }],
    });
    expect(offer.kind).toBe("QUESTION");
    expect(offer.message).not.toMatch(IDENTITY);
    expect(offer.conversation?.recommendationOfferStatus).toBe("AWAITING_CONSENT");
    expect(offer.conversation?.heldAuthorization).toBeTruthy();
    expect(offer.conversation?.turnProvenance?.offerAuthorized).toBe(true);
    expect(offer.conversation?.turnProvenance?.recommendationBlockedByHardConstraint).toBe(false);

    const accepted = await runCarsConversationTurn({
      conversationId: "safe-governed",
      conversation: offer.conversation,
      messages: [
        { id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
        { id: "2", role: "assistant", content: offer.message },
        { id: "3", role: "user", content: "tamam, görelim bakalım." },
      ],
    });
    expect(accepted.kind).toBe("RECOMMENDATIONS");
    if (accepted.kind !== "RECOMMENDATIONS") return;
    expect(accepted.recommendations[0]?.car.brand).toBe("Hyundai");
    expect(accepted.recommendations[0]?.car.model).toMatch(/IONIQ 9/i);
    expect(accepted.conversation?.turnProvenance?.cardRevealAuthorized).toBe(true);
  });
});

describe("coverage-block tone", () => {
  it("never uses dismissive forbidden language", () => {
    const first = coverageLimitationMessage("clio", "SEN");
    const repeat = coverageLimitationRepeat("SEN");
    expect(first).not.toMatch(DISMISSIVE);
    expect(repeat).not.toMatch(DISMISSIVE);
    expect(first).toMatch(/makul/iu);
    expect(evaluateCarsConversationQuality({
      messages: [{ id: "1", role: "user", content: "Clio harici marka-model söyle." }],
      conversation: emptyConversationTrace(),
      assistantMessage: first,
    }).roboticTemplateHits).toBe(0);
  });

  it("gives one concise coverage response, then a respectful non-generic follow-up", async () => {
    const first = await runCarsConversationTurn({
      conversationId: "clio-tone",
      messages: [{ id: "1", role: "user", content: "Clio harici marka-model söyle." }],
    });
    expect(first.message).toMatch(/makul|güvenilir biçimde isimli/iu);
    expect(first.message).not.toMatch(DISMISSIVE);
    expect(first.message).not.toMatch(GENERIC_HATCH);
    expect(alreadyStatedCoverageLimitation([{ role: "assistant", content: first.message }])).toBe(true);

    const second = await runCarsConversationTurn({
      conversationId: "clio-tone",
      conversation: first.conversation,
      messages: [
        { id: "1", role: "user", content: "Clio harici marka-model söyle." },
        { id: "2", role: "assistant", content: first.message },
        { id: "3", role: "user", content: "Hadi, net bir isim istiyorum." },
      ],
    });
    expect(second.message).not.toBe(first.message);
    expect(second.message).not.toMatch(DISMISSIVE);
    expect(second.message).not.toMatch(GENERIC_HATCH);
    expect(second.message).not.toMatch(/Hyundai|IONIQ|Corolla|Civic|Captur/i);
    expect(second.conversation?.turnProvenance?.directRecommendationCoverage).toBe("DIRECT_RECOMMENDATION_BLOCKED_BY_COVERAGE");
  });
});
