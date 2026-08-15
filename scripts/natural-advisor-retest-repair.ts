/**
 * Live public-route regression for Natural Advisor Retest Repair.
 * Run against a local production server that already loaded server env:
 *   PORT=4013 npm run start
 *   npx tsx --tsconfig tsconfig.json scripts/natural-advisor-retest-repair.ts http://127.0.0.1:4013
 * Does not print secrets.
 */
void (async function runNaturalAdvisorRetestRepair() {
const retestBase = process.argv[2] ?? "http://127.0.0.1:4013";

interface TurnCapture {
  readonly user: string;
  readonly assistant: string;
  readonly act?: string;
  readonly origin?: string;
  readonly selectedModel?: string;
  readonly requestedModel?: string;
  readonly parseOutcome?: string;
  readonly fallback?: string;
  readonly override?: boolean;
  readonly offer?: string;
  readonly kind?: string;
  readonly cardCount: number;
  readonly identityLeak: boolean;
  readonly forwardProgressType?: string;
  readonly newInformationComparedWithRecentTurns?: boolean;
  readonly directQuestionAnswered?: boolean;
  readonly semanticRepetitionDetected?: boolean;
  readonly repairApplied?: boolean;
  readonly directRecommendationCoverage?: string;
  readonly budgetEvaluated?: boolean;
  readonly unevaluatedBudgetPresent?: boolean;
  readonly heldDespiteUnevaluatedBudget?: boolean;
  readonly cardBrand?: string;
  readonly cardModel?: string;
  readonly requirements?: readonly string[];
}

async function post(conversationId: string, messages: unknown[], conversation?: unknown) {
  const response = await fetch(`${retestBase}/api/cars/conversation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `10.61.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`,
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
  const requirements = conversation?.requirements as { key?: string }[] | undefined;
  return {
    user,
    assistant: String(payload.message ?? ""),
    act: provenance?.latestPrimaryAct as string | undefined,
    origin: provenance?.userFacingOrigin as string | undefined,
    selectedModel: provenance?.selectedModel as string | undefined,
    requestedModel: provenance?.requestedModel as string | undefined,
    parseOutcome: provenance?.parseOutcome as string | undefined,
    fallback: provenance?.fallbackReason as string | undefined,
    override: provenance?.deterministicOverride as boolean | undefined,
    offer: conversation?.recommendationOfferStatus as string | undefined,
    kind: payload.kind as string | undefined,
    cardCount: recommendations?.length ?? 0,
    identityLeak: leak(String(payload.message ?? "")),
    forwardProgressType: provenance?.forwardProgressType as string | undefined,
    newInformationComparedWithRecentTurns: provenance?.newInformationComparedWithRecentTurns as boolean | undefined,
    directQuestionAnswered: provenance?.directQuestionAnswered as boolean | undefined,
    semanticRepetitionDetected: provenance?.semanticRepetitionDetected as boolean | undefined,
    repairApplied: provenance?.repairApplied as boolean | undefined,
    directRecommendationCoverage: provenance?.directRecommendationCoverage as string | undefined,
    budgetEvaluated: provenance?.budgetEvaluated as boolean | undefined,
    unevaluatedBudgetPresent: provenance?.unevaluatedBudgetPresent as boolean | undefined,
    heldDespiteUnevaluatedBudget: provenance?.heldDespiteUnevaluatedBudget as boolean | undefined,
    requirements: requirements?.map((entry) => String(entry.key ?? "")),
    cardBrand: Array.isArray(recommendations) && recommendations[0] && typeof recommendations[0] === "object"
      ? String((recommendations[0] as { car?: { brand?: string; model?: string } }).car?.brand ?? "")
      : undefined,
    cardModel: Array.isArray(recommendations) && recommendations[0] && typeof recommendations[0] === "object"
      ? String((recommendations[0] as { car?: { brand?: string; model?: string } }).car?.model ?? "")
      : undefined,
  };
}

async function runTurns(name: string, steps: string[]) {
  const conversationId = `retest-${name}-${Date.now()}`;
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

function repeatsGenericAdvice(turns: TurnCapture[]): boolean {
  const frames = /küçük otomatik hatchback|kolay park|düşük (?:masraf|gider)|ikinci el|temiz örnek|tek seçenek değil|rastgele (?:seç|model)/iu;
  const hits = turns.filter((turn) => frames.test(turn.assistant));
  return hits.length >= 2;
}

async function main() {
  const journeyA = await runTurns("A", [
    "Merhaba",
    "Nasılsın?",
    "Ne yapabildiğini merak ettim.",
    "Aslında araba almayı düşünüyorum ama nereden başlayacağımı bilmiyorum.",
    "Genelde şehirde kullanacağım ama hafta sonu ailemle dışarı çıkıyoruz.",
    "Bütçem yaklaşık 2,5 milyon.",
    "Bu arada bugün biraz kafam karışık, acele karar vermek istemiyorum.",
    "Neyse, arabaya dönelim.",
    "Aslında bütçeyi yanlış söyledim, 2 milyonun üzerine çıkmak istemiyorum.",
    "En az 7 koltuk ve en az 300 litre bagaj istiyorum.",
    "tamam. görelim bakalım neymiş.",
  ]);
  const journeyB = await runTurns("B", [
    "Merhaba",
    "Aslında araba almayı düşünüyorum ama nereden başlayacağımı bilmiyorum.",
    "Genelde şehirde kullanacağım ama hafta sonu da ailemle dışarı çıkıyoruz.",
    "Bütçem 2 milyon TL.",
    "En az 7 koltuk ve en az 300 litre bagaj istiyorum.",
    "hayır, şimdilik görmek istemiyorum",
  ]);
  const journeyC = await runTurns("C", [
    "Merhaba",
    "Aslında araba almayı düşünüyorum ama nereden başlayacağımı bilmiyorum.",
    "İlk arabam olacak, genelde şehirde kullanacağım.",
    "Arkadaşlarım Clio almamı önerdi, sen ne dersin?",
    "Clio harici ne var söyle.",
    "Hadi, isim ver.",
  ]);

  const failures: string[] = [];
  const a2 = journeyA[2];
  if (!a2 || a2.act !== "CAPABILITY_QUESTION" || /merhaba|hoş geldiniz/i.test(a2.assistant)) failures.push("A-capability");
  const a3 = journeyA[3];
  if (!a3 || a3.act === "CORRECTION" || /düzeltmen/i.test(a3.assistant)) failures.push("A-help-start-correction");
  const a7 = journeyA[7];
  if (!a7 || /kaçırmadım|oradan devam ederiz/i.test(a7.assistant)) failures.push("A-vague-continuity");
  const a10 = journeyA[10];
  if (!a10 || a10.kind !== "RECOMMENDATIONS" || a10.cardCount !== 1) failures.push("A-accept-card");
  if (a10 && /görmek ister misin/i.test(a10.assistant)) failures.push("A-repeated-offer");
  if (a10 && /kullanım bağlamınız duruyor|tüm (?:şart|ihtiyac)|bütçenizi karşıl/i.test(a10.assistant)) failures.push("A-budget-claimed");
  if (a10 && a10.budgetEvaluated === true) failures.push("A-budget-evaluated");
  const offerTurns = journeyA.filter((turn) => /önerim var|görmek ister/i.test(turn.assistant));
  if (offerTurns.length > 1) failures.push("A-offer-repeated");

  const b5 = journeyB[5];
  if (!b5 || b5.offer !== "DECLINED" || b5.cardCount > 0) failures.push("B-decline");
  if (b5 && /önerim var|görmek ister/i.test(b5.assistant)) failures.push("B-decline-reoffer");
  if (journeyB.some((turn, index) => index < 5 && turn.identityLeak)) failures.push("B-identity-before-consent");

  const c3 = journeyC[3];
  if (!c3 || c3.act !== "DIRECT_MODEL_COMPARISON_REQUEST") failures.push("C-comparison-act");
  const named = journeyC.slice(4);
  if (!named[0] || named[0].directRecommendationCoverage !== "DIRECT_RECOMMENDATION_BLOCKED_BY_COVERAGE") {
    failures.push("C-coverage-block");
  }
  if (repeatsGenericAdvice(named)) failures.push("C-generic-repetition");
  if (journeyC.some((turn) => /kaçırmadım|oradan devam ederiz/i.test(turn.assistant))) failures.push("C-vague-continuity");

  console.log(JSON.stringify({ ok: failures.length === 0, failures, journeyA, journeyB, journeyC }, null, 2));
  if (failures.length) process.exit(1);
}

await main();
})();
