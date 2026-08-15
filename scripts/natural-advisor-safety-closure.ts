/**
 * Live public-route verification for Natural Advisor Safety Closure.
 * Run against a local production server that already loaded server env:
 *   PORT=4014 npm run start
 *   npx tsx --tsconfig tsconfig.json scripts/natural-advisor-safety-closure.ts http://127.0.0.1:4014
 * Does not print secrets.
 */
void (async function runNaturalAdvisorSafetyClosure() {
const closureBase = process.argv[2] ?? "http://127.0.0.1:4014";

interface TurnCapture {
  readonly user: string;
  readonly assistant: string;
  readonly act?: string;
  readonly origin?: string;
  readonly selectedModel?: string;
  readonly requestedModel?: string;
  readonly parseOutcome?: string;
  readonly fallback?: string;
  readonly offer?: string;
  readonly kind?: string;
  readonly cardCount: number;
  readonly identityLeak: boolean;
  readonly heldAuthorizationPresent: boolean;
  readonly hardUnevaluatedConstraints?: readonly string[];
  readonly recommendationBlockedByHardConstraint?: boolean;
  readonly blockedConstraintKinds?: readonly string[];
  readonly candidateHeld?: boolean;
  readonly offerAuthorized?: boolean;
  readonly cardRevealAuthorized?: boolean;
  readonly budgetEvaluated?: boolean;
  readonly unevaluatedBudgetPresent?: boolean;
  readonly directRecommendationCoverage?: string;
  readonly cardBrand?: string;
  readonly cardModel?: string;
}

async function post(conversationId: string, messages: unknown[], conversation?: unknown) {
  const response = await fetch(`${closureBase}/api/cars/conversation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `10.62.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`,
    },
    body: JSON.stringify({ conversationId, messages, conversation }),
  });
  const payload = await response.json() as Record<string, unknown>;
  return { status: response.status, payload };
}

function leak(message: string): boolean {
  return /Hyundai|IONIQ|RVC-PILOT/i.test(message);
}

function capture(user: string, payload: Record<string, unknown>): TurnCapture {
  const conversation = payload.conversation as Record<string, unknown> | undefined;
  const provenance = conversation?.turnProvenance as Record<string, unknown> | undefined;
  const recommendations = payload.recommendations as unknown[] | undefined;
  return {
    user,
    assistant: String(payload.message ?? ""),
    act: provenance?.latestPrimaryAct as string | undefined,
    origin: provenance?.userFacingOrigin as string | undefined,
    selectedModel: provenance?.selectedModel as string | undefined,
    requestedModel: provenance?.requestedModel as string | undefined,
    parseOutcome: provenance?.parseOutcome as string | undefined,
    fallback: provenance?.fallbackReason as string | undefined,
    offer: conversation?.recommendationOfferStatus as string | undefined,
    kind: payload.kind as string | undefined,
    cardCount: recommendations?.length ?? 0,
    identityLeak: leak(String(payload.message ?? "")),
    heldAuthorizationPresent: Boolean(conversation?.heldAuthorization),
    hardUnevaluatedConstraints: provenance?.hardUnevaluatedConstraints as readonly string[] | undefined,
    recommendationBlockedByHardConstraint: provenance?.recommendationBlockedByHardConstraint as boolean | undefined,
    blockedConstraintKinds: provenance?.blockedConstraintKinds as readonly string[] | undefined,
    candidateHeld: provenance?.candidateHeld as boolean | undefined,
    offerAuthorized: provenance?.offerAuthorized as boolean | undefined,
    cardRevealAuthorized: provenance?.cardRevealAuthorized as boolean | undefined,
    budgetEvaluated: provenance?.budgetEvaluated as boolean | undefined,
    unevaluatedBudgetPresent: provenance?.unevaluatedBudgetPresent as boolean | undefined,
    directRecommendationCoverage: provenance?.directRecommendationCoverage as string | undefined,
    cardBrand: Array.isArray(recommendations) && recommendations[0] && typeof recommendations[0] === "object"
      ? String((recommendations[0] as { car?: { brand?: string; model?: string } }).car?.brand ?? "")
      : undefined,
    cardModel: Array.isArray(recommendations) && recommendations[0] && typeof recommendations[0] === "object"
      ? String((recommendations[0] as { car?: { brand?: string; model?: string } }).car?.model ?? "")
      : undefined,
  };
}

async function runTurns(name: string, steps: string[]) {
  const conversationId = `safety-${name}-${Date.now()}`;
  const messages: { id: string; role: "user" | "assistant"; content: string }[] = [];
  let conversation: unknown;
  const captures: TurnCapture[] = [];
  for (const [index, user] of steps.entries()) {
    messages.push({ id: `u-${index}`, role: "user", content: user });
    const { payload } = await post(conversationId, messages, conversation);
    captures.push(capture(user, payload));
    conversation = payload.conversation;
    messages.push({ id: `a-${index}`, role: "assistant", content: String(payload.message ?? "") });
  }
  return captures;
}

function dismissive(text: string): boolean {
  return /uyduramam|burada durabiliriz|rastgele isim saymam|sana model atamam|daha fazla bilgi verirsen belki/iu.test(text);
}

function repeatsGenericAdvice(turns: TurnCapture[]): boolean {
  const frames = /küçük otomatik hatchback|kolay park|düşük (?:masraf|gider)|ikinci el|temiz örnek|tek seçenek değil|rastgele (?:seç|model)/iu;
  const hits = turns.filter((turn) => frames.test(turn.assistant));
  return hits.length >= 2;
}

async function main() {
  const hardBudget = await runTurns("hard-budget", [
    "Merhaba",
    "Araba almayı düşünüyorum.",
    "Bütçem 2 milyon, üzerine kesinlikle çıkmak istemiyorum.",
    "En az 7 koltuk ve en az 300 litre bagaj istiyorum.",
    "Göster.",
  ]);
  const safeGoverned = await runTurns("safe-governed", [
    "En az 7 koltuk ve en az 300 litre bagaj istiyorum.",
    "tamam, görelim bakalım.",
  ]);
  const clio = await runTurns("clio", [
    "İlk arabam olacak.",
    "Şehir içinde kullanacağım, otomatik ve parkı kolay olsun.",
    "Arkadaşlarım Clio önerdi, sen ne dersin?",
    "Clio harici marka-model söyle.",
    "Hadi, net bir isim istiyorum.",
  ]);

  const failures: string[] = [];
  for (const turn of hardBudget) {
    if (turn.identityLeak) failures.push("hard-identity");
    if (turn.cardCount > 0) failures.push("hard-card");
    if (turn.heldAuthorizationPresent) failures.push("hard-hold-exposed");
    if (turn.offerAuthorized) failures.push("hard-offer-authorized");
    if (turn.kind === "RECOMMENDATIONS") failures.push("hard-recommendations");
    if (/tüm (?:şart|ihtiyac)|bütçenizi karşıl|bütçe.*karşılıyor/iu.test(turn.assistant)) failures.push("hard-false-fit");
  }
  const seatsTurn = hardBudget[3];
  if (!seatsTurn || seatsTurn.recommendationBlockedByHardConstraint !== true) failures.push("hard-not-blocked");
  if (seatsTurn && seatsTurn.offer === "AWAITING_CONSENT") failures.push("hard-offer-status");
  const showTurn = hardBudget[4];
  if (!showTurn || showTurn.cardRevealAuthorized) failures.push("hard-show-reveal");
  if (showTurn && showTurn.candidateHeld) failures.push("hard-show-held");

  const offer = safeGoverned[0];
  const accept = safeGoverned[1];
  if (!offer || offer.kind === "RECOMMENDATIONS" || offer.identityLeak || offer.offer !== "AWAITING_CONSENT") {
    failures.push("safe-offer");
  }
  if (!accept || accept.kind !== "RECOMMENDATIONS" || accept.cardBrand !== "Hyundai" || !/IONIQ 9/i.test(accept.cardModel ?? "")) {
    failures.push("safe-reveal");
  }
  if (accept && /görmek ister misin/i.test(accept.assistant)) failures.push("safe-repeated-offer");

  const comparison = clio[2];
  if (!comparison || comparison.act !== "DIRECT_MODEL_COMPARISON_REQUEST") failures.push("clio-comparison-act");
  const named = clio.slice(3);
  if (!named[0] || named[0].directRecommendationCoverage !== "DIRECT_RECOMMENDATION_BLOCKED_BY_COVERAGE") {
    failures.push("clio-coverage-block");
  }
  if (named.some((turn) => dismissive(turn.assistant))) failures.push("clio-dismissive");
  if (repeatsGenericAdvice(named)) failures.push("clio-generic-repetition");
  if (clio.some((turn) => leak(turn.assistant) && turn.kind !== "RECOMMENDATIONS")) failures.push("clio-invented-name");

  console.log(JSON.stringify({ ok: failures.length === 0, failures, hardBudget, safeGoverned, clio }, null, 2));
  if (failures.length) process.exit(1);
}

await main();
})();
