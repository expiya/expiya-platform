/**
 * Live production-route proof for Phase 1 new-car budget decisions.
 * Run against a fresh local production server that loaded server env:
 *   PORT=4018 npm run start
 *   npx tsx --tsconfig tsconfig.json scripts/phase1-new-car-budget-live.ts http://127.0.0.1:4018
 * Does not print secrets.
 */
void (async function runPhase1NewCarBudgetLive() {
const base = process.argv[2] ?? "http://127.0.0.1:4018";

interface TurnCapture {
  readonly user: string;
  readonly assistant: string;
  readonly kind?: string;
  readonly cardCount: number;
  readonly discriminatorChoices?: readonly { id: string; label: string }[];
  readonly cardBrand?: string;
  readonly cardModel?: string;
  readonly isTopPick?: boolean;
  readonly configurationKind?: string;
  readonly priceType?: string;
  readonly priceAmount?: number;
  readonly identityLeak: boolean;
  readonly options?: readonly string[];
  readonly textInputAllowed?: boolean;
  readonly acquisitionMarket?: string;
  readonly offer?: string;
  readonly offerPurpose?: string;
  readonly affordabilityState?: string;
  readonly noAffordableMatchStatus?: string;
  readonly shownCandidate?: string;
  readonly provenance: Record<string, unknown>;
  readonly priceEvaluations?: readonly Record<string, unknown>[];
}

async function post(
  conversationId: string,
  messages: unknown[],
  conversation?: unknown,
  extra: Record<string, unknown> = {},
) {
  const response = await fetch(`${base}/api/cars/conversation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `10.72.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`,
    },
    body: JSON.stringify({ conversationId, messages, conversation, ...extra }),
  });
  const payload = await response.json() as Record<string, unknown>;
  return { status: response.status, payload };
}

function leak(message: string): boolean {
  return /Hyundai|IONIQ|RVC-PILOT|Toyota Corolla/i.test(message);
}

function capture(user: string, payload: Record<string, unknown>): TurnCapture {
  const conversation = payload.conversation as Record<string, unknown> | undefined;
  const provenance = (conversation?.turnProvenance as Record<string, unknown> | undefined) ?? {};
  const recommendations = payload.recommendations as unknown[] | undefined;
  const first = Array.isArray(recommendations) && recommendations[0] && typeof recommendations[0] === "object"
    ? recommendations[0] as {
      car?: { brand?: string; model?: string };
      isTopPick?: boolean;
      configurationKind?: string;
      pricePresentation?: { priceType?: string; amountTry?: number };
    }
    : undefined;
  const shown = conversation?.shownCandidate as { runtimeVehicleCandidateId?: string } | undefined;
  return {
    user,
    assistant: String(payload.message ?? ""),
    kind: payload.kind as string | undefined,
    cardCount: recommendations?.length ?? 0,
    discriminatorChoices: payload.discriminatorChoices as readonly { id: string; label: string }[] | undefined,
    cardBrand: first?.car?.brand,
    cardModel: first?.car?.model,
    isTopPick: first?.isTopPick,
    configurationKind: first?.configurationKind,
    priceType: first?.pricePresentation?.priceType,
    priceAmount: first?.pricePresentation?.amountTry,
    identityLeak: leak(String(payload.message ?? "")),
    options: payload.options as readonly string[] | undefined,
    textInputAllowed: conversation?.textInputAllowed as boolean | undefined,
    acquisitionMarket: conversation?.acquisitionMarket as string | undefined,
    offer: conversation?.recommendationOfferStatus as string | undefined,
    offerPurpose: conversation?.offerPurpose as string | undefined,
    affordabilityState: conversation?.affordabilityState as string | undefined,
    noAffordableMatchStatus: conversation?.noAffordableMatchStatus as string | undefined,
    shownCandidate: shown?.runtimeVehicleCandidateId,
    provenance,
    priceEvaluations: conversation?.priceEvaluations as readonly Record<string, unknown>[] | undefined,
  };
}

async function runTurns(name: string, steps: { user: string; choiceId?: string }[]) {
  const conversationId = `phase1-budget-${name}-${Date.now()}`;
  const messages: { id: string; role: "user" | "assistant"; content: string }[] = [];
  let conversation: unknown;
  const captures: TurnCapture[] = [];
  for (const [index, step] of steps.entries()) {
    messages.push({ id: `u-${index}`, role: "user", content: step.user });
    const extra = step.choiceId ? { choiceId: step.choiceId } : {};
    const { payload } = await post(conversationId, messages, conversation, extra);
    const turn = capture(step.user, payload);
    captures.push(turn);
    conversation = payload.conversation;
    messages.push({
      id: `a-${index}`,
      role: "assistant",
      content: String(payload.message ?? ""),
      ...(Array.isArray(payload.discriminatorChoices) && payload.discriminatorChoices.length
        ? { discriminatorChoices: payload.discriminatorChoices }
        : {}),
    } as { id: string; role: "assistant"; content: string; discriminatorChoices?: unknown });
  }
  return captures;
}

function inventedPercent(text: string): boolean {
  return /%20|yüzde 20|20\s*%/.test(text);
}

async function main() {
  const failures: string[] = [];

  const routeA = await runTurns("A", [
    { user: "Sadece sıfır araç düşünüyorum. Bütçem en fazla 2 milyon." },
    { user: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
    { user: "Evet, göster." },
    { user: "Bütçemi biraz artırırsam olur mu?" },
  ]);
  for (const turn of routeA) {
    if (turn.acquisitionMarket !== "NEW_ONLY") failures.push("A-market");
    if (turn.kind === "RECOMMENDATIONS") failures.push("A-card");
    if (inventedPercent(turn.assistant)) failures.push("A-percent");
    if (/En güçlü aday/iu.test(turn.assistant)) failures.push("A-winner-copy");
  }
  if (routeA[1]?.offer === "AWAITING_CONSENT") failures.push("A-offer");
  if (routeA[1]?.identityLeak) failures.push("A-identity");
  if (!routeA[1]?.noAffordableMatchStatus) failures.push("A-no-match");
  if (routeA[2]?.kind === "RECOMMENDATIONS") failures.push("A-invalid-consent-card");
  if (routeA[3] && !/koltuk|bagaj|bütçe/iu.test(routeA[3].assistant)) failures.push("A-next-move");

  const routeB = await runTurns("B", [
    { user: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
    { user: "Tamam, göster." },
    { user: "Peki bu araç 2 milyon bütçeme uygun mu?" },
    { user: "Alternatif var mı?" },
  ]);
  if (routeB[0]?.kind === "RECOMMENDATIONS") failures.push("B-premature-card");
  if (routeB[0]?.offer !== "AWAITING_CONSENT") failures.push("B-offer");
  if (/bütçe/iu.test(routeB[0]?.assistant ?? "")) failures.push("B-budget-question");
  if (routeB[1]?.kind !== "RECOMMENDATIONS" || !/IONIQ 9/i.test(routeB[1]?.cardModel ?? "")) failures.push("B-reveal");
  if (routeB[2]?.kind === "RECOMMENDATIONS") failures.push("B-repeated-card");
  if (routeB[2] && !/5[,.]81|üzerinde|uymuyor/iu.test(routeB[2].assistant)) failures.push("B-direct-answer");
  if (routeB[2]?.provenance.directAffordabilityQuestionDetected !== true) failures.push("B-direct-flag");
  if (routeB[2]?.offer === "AWAITING_CONSENT") failures.push("B-second-offer");
  if (routeB[3]?.kind === "RECOMMENDATIONS") failures.push("B-alt-card");
  if (routeB[3]?.offer === "AWAITING_CONSENT") failures.push("B-alt-second-offer");
  if (routeB[3] && /Civic|Corolla|Captur|Golf|görmek ister misin/i.test(routeB[3].assistant)) {
    failures.push("B-invented-or-reoffer");
  }

  const routeC = await runTurns("C", [
    { user: "En az 5 koltuk ve en az 300 litre bagaj istiyorum. Bütçem en fazla 3 milyon." },
    { user: "Daha fazla bagaj alanı", choiceId: "MAX_CARGO" },
    { user: "Evet, göster." },
  ]);
  const routeCCoverage = {
    uniqueSevenSeatPassPossible: false,
    discriminatorPassAttempted: true,
    cardAfterConsent: routeC[2]?.kind === "RECOMMENDATIONS",
    cardModel: routeC[2]?.cardModel,
    isTopPick: routeC[2]?.isTopPick,
    priceType: routeC[2]?.priceType,
    priceAmount: routeC[2]?.priceAmount,
    offerPurpose: routeC[2]?.offerPurpose ?? routeC[1]?.offerPurpose ?? routeC[0]?.offerPurpose,
    afterFilter: routeC[0]?.provenance.candidateSetAfterPriceFilter,
    noMatch: routeC[0]?.noAffordableMatchStatus,
  };
  if (routeC[0]?.textInputAllowed !== false) failures.push("C-input-lock");
  if (/geçerli değil/iu.test(routeC[1]?.assistant ?? "")) failures.push("C-choice-rejected");
  if (routeC[1]?.offer !== "AWAITING_CONSENT") failures.push("C-offer");
  if (routeC[2]?.kind !== "RECOMMENDATIONS") failures.push("C-card");
  if (routeC[2] && routeC[2].isTopPick !== true) failures.push("C-top-pick");

  const routeD = await runTurns("D", [
    { user: "İkinci el bir araç arıyorum." },
    { user: "Bir galeride 1,9 milyona IONIQ 9 gördüm, alınır mı?" },
  ]);
  for (const turn of routeD) {
    if (turn.acquisitionMarket !== "NEW_ONLY") failures.push("D-market");
    if (turn.kind === "RECOMMENDATIONS") failures.push("D-card");
    if (/5[,.]81/iu.test(turn.assistant)) failures.push("D-new-price-as-used");
    if (/alınır|tavsiye ederim|alabilirsiniz/iu.test(turn.assistant)) failures.push("D-used-recommend");
  }
  if (routeD[0] && !/sıfır/iu.test(routeD[0].assistant)) failures.push("D-boundary");
  if (routeD[1]?.provenance.listingClaimDetected !== true && routeD[1]?.provenance.usedPurchaseRequestDetected !== true) {
    failures.push("D-claim-flag");
  }

  console.log(JSON.stringify({
    ok: failures.length === 0,
    failures,
    routeA,
    routeB,
    routeC,
    routeCCoverage,
    routeD,
  }, null, 2));
  if (failures.length) process.exit(1);
}

await main();
})();
