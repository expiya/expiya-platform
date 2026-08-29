import { randomUUID } from "node:crypto";
import { runV3Turn } from "../engine.server";
import { resetV31OffersForTests } from "../offerGovernance.server";
import { runStoredV31Turn, resetV31StoreForTests } from "../store.server";
import type { V3JourneyFixture } from "./journeyFixtures";
import { evaluateV3JourneyInvariants, type V3JourneyTurnResult } from "./invariantAssertions";
import { createRecommendationTermsAcceptance } from "@/lib/legal/recommendationTerms";
import type { V3ConversationState } from "../types";
import { v3TestDiscriminatorAnswer } from "../testConversationDecision";

export async function runV3SmokeJourney(journey: V3JourneyFixture) {
  const conversationId = `pf-smoke-${journey.id}-${randomUUID()}`;
  const turns: V3JourneyTurnResult[] = [];
  let expectedRevision = 0;
  let priorState: V3ConversationState | undefined;
  for (const [index, message] of journey.messages.entries()) {
    const messageId = `${conversationId}-turn-${index + 1}`;
    const response = await runStoredV31Turn({
      conversationId, messageId, message, expectedRevision,
      run: (state) => runV3Turn({ conversationId, messageId, message, expectedRevision, state, ...(priorState?.pendingOffer ? { recommendationTermsAcceptance: createRecommendationTermsAcceptance() } : {}) }),
    });
    turns.push({ turn: index + 1, user: message, response });
    expectedRevision = response.state.revision;
    priorState = response.state;
  }
  const expectsReveal = (journey.expectation.recommendationCount ?? 0) > 0 || journey.expectation.maximumRecommendationCount !== undefined;
  const needsAdaptiveFinish = journey.expectation.offerMustBeObserved && (
    !turns.some((turn) => turn.response.offerAwaitingConsent) ||
    (expectsReveal && !(turns.at(-1)?.response.recommendations?.length))
  );
  if (needsAdaptiveFinish) {
    for (let index = 0; index < 12 && !priorState?.pendingOffer; index += 1) {
      const message = v3TestDiscriminatorAnswer(priorState?.lastQuestionKey);
      const messageId = `${conversationId}-adaptive-${index + 1}`;
      const response = await runStoredV31Turn({ conversationId, messageId, message, expectedRevision, run: (state) => runV3Turn({ conversationId, messageId, message, expectedRevision, state }) });
      turns.push({ turn: turns.length + 1, user: message, response });
      expectedRevision = response.state.revision;
      priorState = response.state;
    }
    if (expectsReveal && priorState?.pendingOffer) {
      const message = "Evet, göster";
      const messageId = `${conversationId}-adaptive-reveal`;
      const response = await runStoredV31Turn({ conversationId, messageId, message, expectedRevision, run: (state) => runV3Turn({ conversationId, messageId, message, expectedRevision, state, recommendationTermsAcceptance: createRecommendationTermsAcceptance() }) });
      turns.push({ turn: turns.length + 1, user: message, response });
      expectedRevision = response.state.revision;
      priorState = response.state;
    }
  }
  const assertions = evaluateV3JourneyInvariants(journey, turns);
  return {
    journey: { id: journey.id, description: journey.description },
    conversationId,
    turns: turns.map((turn) => ({ turn: turn.turn, user: turn.user, assistant: turn.response.message, state: turn.response.state, recommendations: turn.response.recommendations, offerAwaitingConsent: turn.response.offerAwaitingConsent })),
    assertions,
    failed: assertions.filter((item) => !item.pass),
  };
}

export function resetV3EvaluationStores() {
  resetV31StoreForTests();
  resetV31OffersForTests();
}
