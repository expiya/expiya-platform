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
  detectAcquisitionMarket,
  isDealerListingClaim,
  messageClaimsAffordability,
} from "./carsAcquisitionAuthority";
import { runCarsConversationTurn } from "./runCarsConversationTurn";

const AFFORDABILITY = /bütçene uyuyor|satın alabilirsin|bu fiyat aralığında|bütçenin içinde|ikinci elde bulunur|galeride vardır|5[,.]81/iu;
const IDENTITY = /Hyundai|IONIQ|RVC-/i;

describe("acquisition-market binders", () => {
  it.each([
    ["sıfır istiyorum", "NEW_ONLY"],
    ["ikinci el istemiyorum", "NEW_ONLY"],
    ["yalnız sıfır", "NEW_ONLY"],
    ["sıfır araç bakıyorum", "NEW_ONLY"],
    ["temiz ikinci el olur", "USED_ONLY"],
    ["ikinci el bakıyorum", "USED_ONLY"],
    ["sıfıra gerek yok, ikinci el istiyorum", "USED_ONLY"],
    ["ikinci el olabilir", "NEW_OR_USED"],
    ["sıfır şart değil", "NEW_OR_USED"],
    ["ikisine de açığım", "NEW_OR_USED"],
    ["galeriden de olabilir", "NEW_OR_USED"],
    ["aslında ikinci el de düşünebilirim", "NEW_OR_USED"],
    ["Temiz ikinci el de olabilir.", "NEW_OR_USED"],
  ] as const)("binds %s to %s", (text, market) => {
    expect(detectAcquisitionMarket(text)).toBe(market);
  });

  it("does not treat a budget ceiling as new-only", () => {
    expect(detectAcquisitionMarket("Bütçem en fazla 2 milyon.")).toBeUndefined();
    const trace = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "Bütçem en fazla 2 milyon." },
    ]);
    expect(trace.acquisitionMarket).toBe("UNRESOLVED");
    expect(trace.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "BUDGET_MAX_TRY", category: "HARD_UNEVALUATED_CONSTRAINT" }),
    ]));
    expect(trace.requirements.some((entry) => entry.key === "ACQUISITION_MARKET")).toBe(false);
  });

  it("supersedes a prior market intent", () => {
    const trace = buildCarsRequirementLedger([
      { id: "1", role: "user", content: "Sıfır istiyorum." },
      { id: "2", role: "user", content: "Aslında ikinci el de düşünebilirim." },
    ]);
    expect(trace.acquisitionMarket).toBe("NEW_OR_USED");
    expect(trace.requirements).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: "ACQUISITION_MARKET", value: "NEW_OR_USED", previousValue: "NEW_ONLY" }),
    ]));
  });
});

describe("budget is optional for unique technical fit", () => {
  it("does not ask budget when seats and cargo already identify a unique fit", async () => {
    const offer = await runCarsConversationTurn({
      conversationId: "no-budget",
      messages: [{ id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." }],
    });
    expect(offer.kind).toBe("QUESTION");
    expect(offer.message).not.toMatch(/bütçe/iu);
    expect(offer.message).not.toMatch(IDENTITY);
    expect(offer.conversation?.recommendationOfferStatus).toBe("AWAITING_CONSENT");
    expect(offer.conversation?.offerPurpose).toBe("MODEL_FIT_OFFER");
    expect(offer.conversation?.turnProvenance?.affordabilityClaimAuthorized).toBe(false);

    const shown = await runCarsConversationTurn({
      conversationId: "no-budget",
      conversation: offer.conversation,
      messages: [
        { id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
        { id: "2", role: "assistant", content: offer.message },
        { id: "3", role: "user", content: "Göster." },
      ],
    });
    expect(shown.kind).toBe("RECOMMENDATIONS");
    if (shown.kind !== "RECOMMENDATIONS") return;
    expect(shown.recommendations[0]?.car.model).toMatch(/IONIQ 9/i);
    expect(shown.message).not.toMatch(AFFORDABILITY);
    expect(shown.conversation?.turnProvenance?.cardRevealAuthorized).toBe(true);
  });
});

describe("new and used scoping", () => {
  it("does not use a new price to disprove used-market fit and does not invent a listing", async () => {
    const offer = await runCarsConversationTurn({
      conversationId: "used-allowed",
      messages: [{
        id: "1",
        role: "user",
        content: "Temiz ikinci el de olabilir. Bütçem en fazla 2 milyon. En az 7 koltuk ve en az 300 litre bagaj istiyorum.",
      }],
    });
    expect(offer.conversation?.acquisitionMarket).toBe("NEW_OR_USED");
    expect(offer.conversation?.recommendationLevel).toBe("USED_MODEL_GUIDANCE");
    expect(offer.message).not.toMatch(AFFORDABILITY);
    expect(offer.message).not.toMatch(/5[,.]81|aktif yeni fiyat/iu);
    expect(offer.kind).toBe("QUESTION");
    expect(offer.message).not.toMatch(IDENTITY);
  });

  it("does not treat NEW_ONLY plus hard budget as a purchasable 2M option", async () => {
    const offer = await runCarsConversationTurn({
      conversationId: "new-only",
      messages: [{
        id: "1",
        role: "user",
        content: "Sıfır araç istiyorum. Bütçem en fazla 2 milyon. En az 7 koltuk ve en az 300 litre bagaj istiyorum.",
      }],
    });
    expect(offer.conversation?.acquisitionMarket).toBe("NEW_ONLY");
    expect(offer.conversation?.turnProvenance?.purchasableUnitAuthorized).toBe(false);
    expect(offer.conversation?.turnProvenance?.affordabilityState).not.toBe("AFFORDABILITY_PASS");
    expect(offer.conversation?.recommendationLevel).toBe("MODEL_FIT_GUIDANCE");
    expect(offer.message).not.toMatch(AFFORDABILITY);
    expect(offer.kind).not.toBe("RECOMMENDATIONS");
  });
});

describe("listing claims", () => {
  it("detects a dealer listing claim without treating it as market-openness", () => {
    expect(isDealerListingClaim("Bir galeride 1,9 milyona IONIQ 9 gördüm.")).toBe(true);
    expect(detectAcquisitionMarket("Bir galeride 1,9 milyona IONIQ 9 gördüm.")).toBeUndefined();
  });

  it("invites listing analysis and does not recommend purchase", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "listing-claim",
      messages: [{ id: "1", role: "user", content: "Bir galeride 1,9 milyona IONIQ 9 gördüm." }],
    });
    expect(response.kind).toBe("QUESTION");
    expect(response.message).toMatch(/bağlantı|ilan/iu);
    expect(response.message).toMatch(/al demiyorum|satın al/iu);
    expect(response.message).not.toMatch(/5[,.]81/iu);
    expect(response.message).not.toMatch(AFFORDABILITY);
    expect(response.conversation?.turnProvenance?.listingClaimDetected).toBe(true);
    expect(response.conversation?.recommendationLevel).toBe("LISTING_ANALYSIS_ONLY");
    expect(response.conversation?.turnProvenance?.purchasableUnitAuthorized).toBe(false);
  });
});

describe("affordability wording", () => {
  it("never treats forbidden affordability copy as a pass", () => {
    expect(messageClaimsAffordability("Bu araç bütçene uyuyor.")).toBe(true);
    expect(messageClaimsAffordability("Koltuk ve bagaj ihtiyacına teknik olarak uyan önerim şu.")).toBe(false);
  });
});
