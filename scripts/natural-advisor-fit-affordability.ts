/**
 * Live public-route verification for vehicle-fit vs affordability separation.
 *   PORT=4016 npm run start
 *   npx tsx --tsconfig tsconfig.json scripts/natural-advisor-fit-affordability.ts http://127.0.0.1:4016
 * Does not print secrets.
 */
void (async function runNaturalAdvisorFitAffordability() {
const base = process.argv[2] ?? "http://127.0.0.1:4016";

interface TurnCapture {
  readonly user: string;
  readonly assistant: string;
  readonly act?: string;
  readonly origin?: string;
  readonly selectedModel?: string;
  readonly requestedModel?: string;
  readonly parseOutcome?: string;
  readonly offer?: string;
  readonly kind?: string;
  readonly cardCount: number;
  readonly identityLeak: boolean;
  readonly acquisitionMarket?: string;
  readonly recommendationLevel?: string;
  readonly affordabilityState?: string;
  readonly offerPurpose?: string;
  readonly affordabilityClaimAuthorized?: boolean;
  readonly purchasableUnitAuthorized?: boolean;
  readonly listingClaimDetected?: boolean;
  readonly budgetEvaluated?: boolean;
  readonly cardBrand?: string;
  readonly cardModel?: string;
}

async function post(conversationId: string, messages: unknown[], conversation?: unknown) {
  const response = await fetch(`${base}/api/cars/conversation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `10.63.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`,
    },
    body: JSON.stringify({ conversationId, messages, conversation }),
  });
  const payload = await response.json() as Record<string, unknown>;
  return { status: response.status, payload };
}

function leak(message: string): boolean {
  return /Hyundai|IONIQ|RVC-PILOT/i.test(message);
}

function affordabilityClaim(message: string): boolean {
  return /bütçene uyuyor|satın alabilirsin|bu fiyat aralığında|bütçenin içinde|ikinci elde bulunur|galeride vardır/iu.test(message);
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
    offer: conversation?.recommendationOfferStatus as string | undefined,
    kind: payload.kind as string | undefined,
    cardCount: recommendations?.length ?? 0,
    identityLeak: leak(String(payload.message ?? "")),
    acquisitionMarket: (conversation?.acquisitionMarket ?? provenance?.acquisitionMarket) as string | undefined,
    recommendationLevel: (conversation?.recommendationLevel ?? provenance?.recommendationLevel) as string | undefined,
    affordabilityState: (conversation?.affordabilityState ?? provenance?.affordabilityState) as string | undefined,
    offerPurpose: (conversation?.offerPurpose ?? provenance?.offerPurpose) as string | undefined,
    affordabilityClaimAuthorized: provenance?.affordabilityClaimAuthorized as boolean | undefined,
    purchasableUnitAuthorized: provenance?.purchasableUnitAuthorized as boolean | undefined,
    listingClaimDetected: provenance?.listingClaimDetected as boolean | undefined,
    budgetEvaluated: provenance?.budgetEvaluated as boolean | undefined,
    cardBrand: Array.isArray(recommendations) && recommendations[0] && typeof recommendations[0] === "object"
      ? String((recommendations[0] as { car?: { brand?: string; model?: string } }).car?.brand ?? "")
      : undefined,
    cardModel: Array.isArray(recommendations) && recommendations[0] && typeof recommendations[0] === "object"
      ? String((recommendations[0] as { car?: { brand?: string; model?: string } }).car?.model ?? "")
      : undefined,
  };
}

async function runTurns(name: string, steps: string[]) {
  const conversationId = `fit-aff-${name}-${Date.now()}`;
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

async function main() {
  const journeyA = await runTurns("A", [
    "En az 7 koltuk ve en az 300 litre bagaj istiyorum.",
    "Göster.",
  ]);
  const journeyB = await runTurns("B", [
    "Bütçem en fazla 2 milyon.",
    "En az 7 koltuk ve en az 300 litre bagaj istiyorum.",
    "Göster.",
  ]);
  const journeyC = await runTurns("C", [
    "Sıfır araç istiyorum.",
    "Bütçem en fazla 2 milyon.",
    "En az 7 koltuk ve en az 300 litre bagaj istiyorum.",
  ]);
  const journeyD = await runTurns("D", [
    "Temiz ikinci el de olabilir.",
    "Bütçem en fazla 2 milyon.",
    "En az 7 koltuk ve en az 300 litre bagaj istiyorum.",
  ]);
  const journeyE = await runTurns("E", [
    "Bir galeride 1,9 milyona IONIQ 9 gördüm.",
  ]);

  const failures: string[] = [];
  const a0 = journeyA[0];
  const a1 = journeyA[1];
  if (!a0 || a0.kind === "RECOMMENDATIONS" || a0.identityLeak || /bütçe/iu.test(a0.assistant) || a0.offer !== "AWAITING_CONSENT") {
    failures.push("A-offer");
  }
  if (!a1 || a1.kind !== "RECOMMENDATIONS" || a1.cardBrand !== "Hyundai" || !/IONIQ 9/i.test(a1.cardModel ?? "") || affordabilityClaim(a1.assistant)) {
    failures.push("A-reveal");
  }

  for (const turn of journeyB) {
    if (affordabilityClaim(turn.assistant) || /ikinci elde bulunur|galeride vardır/iu.test(turn.assistant)) failures.push("B-affordability");
  }
  const b1 = journeyB[1];
  const b2 = journeyB[2];
  if (!b1 || b1.offer !== "AWAITING_CONSENT" || b1.identityLeak) failures.push("B-model-fit-offer");
  if (!b2 || b2.kind !== "RECOMMENDATIONS" || b2.affordabilityClaimAuthorized || b2.purchasableUnitAuthorized) failures.push("B-reveal-scope");
  if (b1 && /sıfır mı düşünüyorsun/iu.test(b1.assistant)) failures.push("B-premature-market");

  for (const turn of journeyC) {
    if (affordabilityClaim(turn.assistant)) failures.push("C-affordability");
    if (turn.purchasableUnitAuthorized) failures.push("C-purchasable");
    if (turn.kind === "RECOMMENDATIONS" && /2 milyon/iu.test(turn.assistant) && /alınabilir|satın/iu.test(turn.assistant)) {
      failures.push("C-buyable-card");
    }
  }
  const c0 = journeyC[0];
  if (c0 && c0.acquisitionMarket !== "NEW_ONLY") failures.push("C-market");

  for (const turn of journeyD) {
    if (/5[,.]81/iu.test(turn.assistant)) failures.push("D-new-price");
    if (/ikinci elde bulunur|2 milyona .*var/iu.test(turn.assistant)) failures.push("D-used-stock");
    if (turn.kind === "RECOMMENDATIONS" && turn.cardCount > 0 && /ilan/iu.test(turn.assistant)) failures.push("D-listing-card");
  }
  const d0 = journeyD[0];
  if (d0 && d0.acquisitionMarket !== "NEW_OR_USED") failures.push("D-market");

  const e0 = journeyE[0];
  if (!e0 || e0.listingClaimDetected !== true || e0.kind === "RECOMMENDATIONS" || /5[,.]81/iu.test(e0.assistant) || affordabilityClaim(e0.assistant)) {
    failures.push("E-listing");
  }
  if (e0 && !/bağlantı|ilan/iu.test(e0.assistant)) failures.push("E-url-invite");

  console.log(JSON.stringify({ ok: failures.length === 0, failures, journeyA, journeyB, journeyC, journeyD, journeyE }, null, 2));
  if (failures.length) process.exit(1);
}

await main();
})();
