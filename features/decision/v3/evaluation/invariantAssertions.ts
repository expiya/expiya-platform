import { activeDecisionPreferences } from "../ledger";
import type { V3PublicResponse } from "../types";
import type { V3JourneyFixture } from "./journeyFixtures";

export interface V3JourneyTurnResult {
  readonly turn: number;
  readonly user: string;
  readonly response: V3PublicResponse;
}

export interface V3InvariantResult {
  readonly name: string;
  readonly pass: boolean;
  readonly reason: string;
}

const result = (name: string, pass: boolean, reason: string): V3InvariantResult => ({ name, pass, reason });

export function evaluateV3JourneyInvariants(journey: V3JourneyFixture, turns: readonly V3JourneyTurnResult[]): readonly V3InvariantResult[] {
  const final = turns.at(-1)?.response;
  if (!final) return [result("journey-produced-output", false, "Yolculuk hiçbir motor çıktısı üretmedi.")];
  const active = activeDecisionPreferences(final.state.ledger);
  const expectation = journey.expectation;
  const checks: V3InvariantResult[] = [
    result("revision-increments-once", turns.every((turn) => turn.response.state.revision === turn.turn), "Her başarılı tur revision değerini tam bir artırmalıdır."),
    result("conversation-binding", turns.every((turn) => turn.response.state.conversationId === final.state.conversationId), "Tüm turlar aynı conversationId ile bağlı kalmalıdır."),
    result("one-material-question-per-turn", turns.every((turn) => (turn.response.message.match(/\?/gu) ?? []).length <= 1), "Bir turda en fazla bir soru işareti bulunmalıdır."),
    result("no-internal-jargon", turns.every((turn) => !/\b(?:candidate|ledger|route)\b|\d+\s+(?:aday|seçenek)/iu.test(turn.response.message)), "Public mesaj iç aday sayısı veya motor jargonu içermemelidir."),
    result("no-recommendation-before-consent", turns.slice(0, -1).every((turn) => !turn.response.recommendations?.length), "Son kullanıcı onayından önce recommendation kartı dönmemelidir."),
  ];

  if (expectation.finalPurchaseIntent) checks.push(result("final-purchase-intent", final.state.purchaseIntent === expectation.finalPurchaseIntent, `Beklenen ${expectation.finalPurchaseIntent}, gerçekleşen ${final.state.purchaseIntent}.`));
  if (expectation.finalLedgerLength !== undefined) checks.push(result("final-ledger-length", final.state.ledger.length === expectation.finalLedgerLength, `Beklenen ledger uzunluğu ${expectation.finalLedgerLength}, gerçekleşen ${final.state.ledger.length}.`));
  if (expectation.conversationMustEnd !== undefined) checks.push(result("conversation-ended", final.state.ended === expectation.conversationMustEnd, `Beklenen ended=${expectation.conversationMustEnd}, gerçekleşen ${final.state.ended}.`));
  if (expectation.finalLastQuestionKey !== undefined) {
    const expected = expectation.finalLastQuestionKey ?? undefined;
    checks.push(result("final-question-key", final.state.lastQuestionKey === expected, `Beklenen lastQuestionKey=${String(expected)}, gerçekleşen ${String(final.state.lastQuestionKey)}.`));
  }
  if (expectation.finalMessagePattern) checks.push(result("final-message-pattern", expectation.finalMessagePattern.test(final.message), `Final mesaj ${String(expectation.finalMessagePattern)} desenini karşılamalıdır.`));
  for (const [concept, expectedValue] of Object.entries(expectation.finalActivePreferences ?? {})) {
    const actual = active.find((item) => item.concept === concept)?.normalizedValue;
    checks.push(result(`active-preference:${concept}`, actual === expectedValue, `Beklenen ${concept}=${String(expectedValue)}, gerçekleşen ${String(actual)}.`));
  }
  for (const concept of expectation.absentActiveConcepts ?? []) checks.push(result(`absent-active-preference:${concept}`, !active.some((item) => item.concept === concept), `${concept} final aktif tercihler arasında bulunmamalıdır.`));
  for (const [concept, minimum] of Object.entries(expectation.minimumLedgerEvents ?? {})) {
    const actual = final.state.ledger.filter((item) => item.concept === concept).length;
    checks.push(result(`minimum-ledger-events:${concept}`, actual >= minimum, `Beklenen en az ${minimum} ${concept} olayı, gerçekleşen ${actual}.`));
  }
  if (expectation.finalLedgerEvent) {
    const expected = expectation.finalLedgerEvent;
    const event = [...final.state.ledger].reverse().find((item) => item.concept === expected.concept);
    const pass = Boolean(event)
      && (expected.normalizedValue === undefined || event?.normalizedValue === expected.normalizedValue)
      && (expected.decisionUse === undefined || event?.decisionUse === expected.decisionUse)
      && (expected.strength === undefined || event?.strength === expected.strength)
      && (expected.authority === undefined || event?.authority === expected.authority);
    checks.push(result(`ledger-event:${expected.concept}`, pass, `${expected.concept} için beklenen ledger özellikleri bulunmalıdır.`));
  }
  if (expectation.offerMustBeObserved) checks.push(result("offer-observed", turns.some((turn) => turn.response.offerAwaitingConsent === true), "Recommendation reveal öncesinde offer onayı istenmelidir."));
  if (expectation.recommendationCount !== undefined) checks.push(result("recommendation-count", (final.recommendations?.length ?? 0) === expectation.recommendationCount, `Beklenen ${expectation.recommendationCount} recommendation, gerçekleşen ${final.recommendations?.length ?? 0}.`));
  if (expectation.maximumRecommendationCount !== undefined) checks.push(result("maximum-recommendation-count", Boolean(final.recommendations?.length) && final.recommendations!.length <= expectation.maximumRecommendationCount, `Recommendation sayısı 1-${expectation.maximumRecommendationCount} aralığında olmalıdır; gerçekleşen ${final.recommendations?.length ?? 0}.`));
  if (expectation.recommendationWarningPattern) checks.push(result("recommendation-warning", Boolean(final.recommendations?.some((item) => item.warning && expectation.recommendationWarningPattern!.test(item.warning))), `En az bir recommendation ${String(expectation.recommendationWarningPattern)} uyarısını içermelidir.`));
  return checks;
}
