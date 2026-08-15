import { describe, expect, it, vi } from "vitest";

vi.mock("./planCarsConversationTurn", () => ({
  planCarsConversationTurn: vi.fn().mockResolvedValue({
    requestedModel: "gpt-5.5",
    parseOutcome: "UNAVAILABLE",
    fallbackUsed: false,
  }),
}));

import { PHASE1_ACTIVE_ACQUISITION_MARKET } from "@/types/carsConversation";

import {
  detectAcquisitionMarket,
  isDirectAffordabilityQuestion,
  isUsedPurchaseRequest,
  resolveAcquisitionMarket,
} from "./carsAcquisitionAuthority";
import { buildCarsRequirementLedger } from "./carsConversationMemory";
import { runCarsConversationTurn } from "./runCarsConversationTurn";

const IDENTITY = /Hyundai|IONIQ|RVC-/i;
const DISCLAIMER = /Bu bir satış ilanı değil|fiyat tavanını bu öneriyle henüz kıyaslamadım|teknik olarak ihtiyaçlarına uyan/iu;
const MARKET_QUESTION = /sıfır mı düşünüyorsun|ikinci el de olur mu/iu;
const FIXED_PERCENT = /%20|yüzde 20|20\s*%/;

describe("Phase 1 new-car scope", () => {
  it("defaults the active market to NEW_ONLY", () => {
    expect(PHASE1_ACTIVE_ACQUISITION_MARKET).toBe("NEW_ONLY");
    expect(resolveAcquisitionMarket(buildCarsRequirementLedger([
      { id: "1", role: "user", content: "En az 7 koltuk istiyorum." },
    ]))).toBe("NEW_ONLY");
    expect(detectAcquisitionMarket("Bütçem en fazla 2 milyon.")).toBeUndefined();
  });

  it("does not ask a new/used questionnaire in ordinary discovery", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "no-market-q",
      messages: [{ id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." }],
    });
    expect(response.message).not.toMatch(MARKET_QUESTION);
    expect(response.conversation?.askedQuestionPurposes).not.toContain("ACQUISITION_MARKET");
    expect(response.conversation?.acquisitionMarket).toBe("NEW_ONLY");
  });

  it("answers a used purchase request with a concise new-car boundary", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "used-request",
      messages: [{ id: "1", role: "user", content: "İkinci el bir araç arıyorum." }],
    });
    expect(response.message).toMatch(/sıfır/iu);
    expect(response.message).not.toMatch(/alın|tavsiye ederim|5[,.]81/iu);
    expect(response.message).not.toMatch(MARKET_QUESTION);
    expect(response.kind).not.toBe("RECOMMENDATIONS");
    expect(response.conversation?.turnProvenance?.usedPurchaseRequestDetected).toBe(true);
    expect(response.conversation?.acquisitionMarket).toBe("NEW_ONLY");
    expect(isUsedPurchaseRequest("İkinci el bir araç arıyorum.")).toBe(true);
  });

  it("gives the new-car boundary precedence for a punctuated model-year used request", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "used-request-model-year",
      messages: [{ id: "1", role: "user", content: "İkinci el, 2021 model bir araç arıyorum. Ne önerirsin?" }],
    });
    expect(response.message).toBe("Şu an sıfır araçlarla bakıyorum. İkinci el ilan veya stok önermiyorum; istersen ihtiyaçlarına uyan sıfır bir yapılandırmaya bakabiliriz.");
    expect(response.kind).not.toBe("RECOMMENDATIONS");
    expect(response.conversation?.turnProvenance).toMatchObject({
      modelAttempted: false,
      usedPurchaseRequestDetected: true,
      activePhase1Market: "NEW_ONLY",
      cardRevealAuthorized: false,
    });
    expect(isUsedPurchaseRequest("İkinci el, 2021 model bir araç arıyorum. Ne önerirsin?")).toBe(true);
  });

  it("fails closed on a used listing URL without fetching or recommending purchase", async () => {
    const response = await runCarsConversationTurn({
      conversationId: "listing-url",
      messages: [{ id: "1", role: "user", content: "https://www.sahibinden.com/ilan/hyundai-ioniq-9" }],
    });
    expect(response.kind).toBe("QUESTION");
    expect(response.message).toMatch(/bağlantı/iu);
    expect(response.message).not.toMatch(/5[,.]81|alınır|tavsiye/iu);
    expect(response.kind).not.toBe("RECOMMENDATIONS");
    expect(response.conversation?.turnProvenance?.listingUrlSubmissionDetected).toBe(true);
    expect(response.conversation?.acquisitionMarket).toBe("NEW_ONLY");
  });
});

describe("hard budget filters the full candidate set", () => {
  it("does not offer IONIQ 9 as the budget-compatible winner for a 2M hard ceiling", async () => {
    const first = await runCarsConversationTurn({
      conversationId: "hard-2m",
      messages: [{
        id: "1",
        role: "user",
        content: "Sadece sıfır araç düşünüyorum. Bütçem en fazla 2 milyon. En az 7 koltuk ve en az 300 litre bagaj istiyorum.",
      }],
    });
    expect(first.kind).toBe("QUESTION");
    expect(first.kind).not.toBe("RECOMMENDATIONS");
    expect(first.message).not.toMatch(IDENTITY);
    expect(first.message).not.toMatch(/En güçlü aday|görmek ister misin/iu);
    expect(first.message).not.toMatch(/2 milyon.{0,24}yeter|bütçene uyuyor/iu);
    expect(first.message).not.toMatch(FIXED_PERCENT);
    expect(first.conversation?.recommendationOfferStatus).not.toBe("AWAITING_CONSENT");
    expect(first.conversation?.heldAuthorization).toBeFalsy();
    expect(first.conversation?.offerPurpose).toBe("NO_AFFORDABLE_MATCH");
    expect(first.conversation?.turnProvenance?.priceEvaluationRequested).toBe(true);
    expect(first.conversation?.priceEvaluations?.some((item) => (
      item.candidateId === "RVC-PILOT-0001" && item.result === "FAIL" && item.amountTry === 5_810_000
    ))).toBe(true);
    expect(first.conversation?.turnProvenance?.candidateSetAfterPriceFilter).toEqual([]);
    expect(first.conversation?.noAffordableMatchStatus).toMatch(/NO_AFFORDABLE_EXACT_MATCH|NEAREST_OVER_BUDGET_AVAILABLE/);

    const consent = await runCarsConversationTurn({
      conversationId: "hard-2m",
      conversation: first.conversation,
      messages: [
        { id: "1", role: "user", content: "Sadece sıfır araç düşünüyorum. Bütçem en fazla 2 milyon. En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
        { id: "2", role: "assistant", content: first.message },
        { id: "3", role: "user", content: "Evet, göster." },
      ],
    });
    expect(consent.kind).not.toBe("RECOMMENDATIONS");
    expect(consent.message).not.toMatch(IDENTITY);
  });

  it("keeps budget optional and does not ask it when technical criteria already identify a unique fit", async () => {
    const offer = await runCarsConversationTurn({
      conversationId: "no-budget-fit",
      messages: [{ id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." }],
    });
    expect(offer.message).not.toMatch(/bütçe/iu);
    expect(offer.conversation?.recommendationOfferStatus).toBe("AWAITING_CONSENT");
    expect(offer.conversation?.offerPurpose).toBe("MODEL_FIT_OFFER");
    expect(offer.conversation?.turnProvenance?.affordabilityClaimAuthorized).toBe(false);
    expect(offer.conversation?.turnProvenance?.priceEvaluationRequested).not.toBe(true);

    const shown = await runCarsConversationTurn({
      conversationId: "no-budget-fit",
      conversation: offer.conversation,
      messages: [
        { id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
        { id: "2", role: "assistant", content: offer.message },
        { id: "3", role: "user", content: "Tamam, göster." },
      ],
    });
    expect(shown.kind).toBe("RECOMMENDATIONS");
    if (shown.kind !== "RECOMMENDATIONS") return;
    expect(shown.recommendations[0]?.car.model).toMatch(/IONIQ 9/i);
    expect(shown.recommendations[0]?.isTopPick).toBe(false);
    expect(shown.recommendations[0]?.configurationKind).toBe("NEW_VEHICLE_CONFIGURATION");
    expect(shown.message).not.toMatch(DISCLAIMER);
    expect(shown.message).not.toMatch(/bütçene uyuyor|satın alabilirsin/iu);
    expect(shown.conversation?.shownCandidate?.runtimeVehicleCandidateId).toBe("RVC-PILOT-0001");
  });
});

describe("direct affordability binds to the shown candidate", () => {
  it("answers the shown IONIQ 9 price question without a second offer or card", async () => {
    expect(isDirectAffordabilityQuestion("Peki bu araç 2 milyon bütçeme uygun mu?")).toBe(true);
    const offer = await runCarsConversationTurn({
      conversationId: "shown-then-budget",
      messages: [{ id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." }],
    });
    const shown = await runCarsConversationTurn({
      conversationId: "shown-then-budget",
      conversation: offer.conversation,
      messages: [
        { id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
        { id: "2", role: "assistant", content: offer.message },
        { id: "3", role: "user", content: "Tamam, göster." },
      ],
    });
    expect(shown.kind).toBe("RECOMMENDATIONS");
    const answer = await runCarsConversationTurn({
      conversationId: "shown-then-budget",
      conversation: shown.conversation,
      messages: [
        { id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
        { id: "2", role: "assistant", content: offer.message },
        { id: "3", role: "user", content: "Tamam, göster." },
        { id: "4", role: "assistant", content: shown.message, recommendationIds: shown.kind === "RECOMMENDATIONS" ? shown.recommendations.map((item) => item.car.id) : [] },
        { id: "5", role: "user", content: "Peki bu araç 2 milyon bütçeme uygun mu?" },
      ],
    });
    expect(answer.kind).toBe("QUESTION");
    expect(answer.kind).not.toBe("RECOMMENDATIONS");
    expect(answer.message).toMatch(/IONIQ 9|5[,.]81/i);
    expect(answer.message).toMatch(/üzerinde|uymuyor/iu);
    expect(answer.message).not.toMatch(/görmek ister misin/iu);
    expect(answer.message).not.toMatch(FIXED_PERCENT);
    expect(answer.conversation?.turnProvenance?.directAffordabilityQuestionDetected).toBe(true);
    expect(answer.conversation?.turnProvenance?.directQuestionAnswered).toBe(true);
    expect(answer.conversation?.affordabilityState).toBe("AFFORDABILITY_FAIL");
    expect(answer.conversation?.shownCandidate?.runtimeVehicleCandidateId).toBe("RVC-PILOT-0001");
    expect(answer.conversation?.recommendationOfferStatus).toBe("REVEALED");

    const alternatives = await runCarsConversationTurn({
      conversationId: "shown-then-budget",
      conversation: answer.conversation,
      messages: [
        { id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
        { id: "2", role: "assistant", content: offer.message },
        { id: "3", role: "user", content: "Tamam, göster." },
        { id: "4", role: "assistant", content: shown.message, recommendationIds: shown.kind === "RECOMMENDATIONS" ? shown.recommendations.map((item) => item.car.id) : [] },
        { id: "5", role: "user", content: "Peki bu araç 2 milyon bütçeme uygun mu?" },
        { id: "6", role: "assistant", content: answer.message },
        { id: "7", role: "user", content: "Alternatif var mı?" },
      ],
    });
    expect(alternatives.kind).not.toBe("RECOMMENDATIONS");
    expect(alternatives.message).not.toMatch(/görmek ister misin/iu);
    expect(alternatives.message).not.toMatch(/Civic|Corolla|Captur|Golf/i);
    expect(alternatives.conversation?.recommendationOfferStatus).toBe("REVEALED");
    expect(alternatives.conversation?.shownCandidate?.runtimeVehicleCandidateId).toBe("RVC-PILOT-0001");
  });
});

describe("requirement correction reruns governed evaluation", () => {
  it("invalidates a held offer when a hard requirement is corrected", async () => {
    const offer = await runCarsConversationTurn({
      conversationId: "correction",
      messages: [{ id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." }],
    });
    expect(offer.conversation?.recommendationOfferStatus).toBe("AWAITING_CONSENT");
    const corrected = await runCarsConversationTurn({
      conversationId: "correction",
      conversation: offer.conversation,
      messages: [
        { id: "1", role: "user", content: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
        { id: "2", role: "assistant", content: offer.message },
        { id: "3", role: "user", content: "Hayır, 5 koltuk yeter. Bagaj en az 350 litre olsun." },
      ],
    });
    expect(corrected.conversation?.recommendationOfferStatus === "AWAITING_CONSENT"
      || corrected.conversation?.state === "FINAL_DISCRIMINATOR_REQUIRED"
      || corrected.kind === "QUESTION").toBe(true);
    expect(corrected.message).not.toMatch(IDENTITY);
  });
});
