/**
 * Live production-service smoke for the Natural Advisor Core.
 * Run against a local production server that already loaded server env:
 *   PORT=4010 npm run start
 *   npx tsx --tsconfig tsconfig.json scripts/natural-advisor-live-smoke.ts http://127.0.0.1:4010
 * Does not print secrets.
 */
const base = process.argv[2] ?? "http://127.0.0.1:4010";

interface TurnCapture {
  readonly user: string;
  readonly assistant: string;
  readonly act?: string;
  readonly move?: string;
  readonly stage?: string;
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
  readonly options?: readonly string[];
  readonly textInputAllowed?: boolean;
  readonly requirements?: readonly string[];
  readonly cardBrand?: string;
  readonly cardModel?: string;
}

async function post(conversationId: string, messages: unknown[], conversation?: unknown, extra: Record<string, unknown> = {}) {
  const response = await fetch(`${base}/api/cars/conversation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": `10.50.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 200) + 1}`,
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
  const provenance = conversation?.turnProvenance as Record<string, unknown> | undefined;
  const recommendations = payload.recommendations as unknown[] | undefined;
  const requirements = conversation?.requirements as { key?: string }[] | undefined;
  return {
    user,
    assistant: String(payload.message ?? ""),
    act: provenance?.latestPrimaryAct as string | undefined,
    move: provenance?.conversationMove as string | undefined,
    stage: (conversation?.advisorStage ?? conversation?.phase) as string | undefined,
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
    options: payload.options as readonly string[] | undefined,
    textInputAllowed: conversation?.textInputAllowed as boolean | undefined,
    requirements: requirements?.map((entry) => String(entry.key ?? "")),
    cardBrand: Array.isArray(recommendations) && recommendations[0] && typeof recommendations[0] === "object"
      ? String((recommendations[0] as { car?: { brand?: string; model?: string } }).car?.brand ?? "")
      : undefined,
    cardModel: Array.isArray(recommendations) && recommendations[0] && typeof recommendations[0] === "object"
      ? String((recommendations[0] as { car?: { brand?: string; model?: string } }).car?.model ?? "")
      : undefined,
  };
}

async function runTurns(name: string, steps: { user: string; choiceId?: string }[]) {
  const conversationId = `live-${name}-${Date.now()}`;
  const messages: { id: string; role: "user" | "assistant"; content: string }[] = [];
  let conversation: unknown;
  const captures: TurnCapture[] = [];
  for (const [index, step] of steps.entries()) {
    messages.push({ id: `u-${index}`, role: "user", content: step.user });
    const { payload } = await post(conversationId, messages, conversation, step.choiceId ? { choiceId: step.choiceId } : {});
    captures.push(capture(step.user, payload));
    conversation = payload.conversation;
    messages.push({ id: `a-${index}`, role: "assistant", content: String(payload.message ?? "") });
  }
  return captures;
}

function discoveryAfterGreeting(text: string): boolean {
  return /hangi senaryo|daraltalım|kaç koltuk|kaç litre|gövde tipi|üst bütçe/i.test(text);
}

async function main() {
  const greeting = await runTurns("greeting", [{ user: "Merhaba" }]);
  const intent = await runTurns("intent", [{ user: "Merhaba, aile için araç bakıyorum." }]);
  const detour = await runTurns("detour", [
    { user: "Aile için araç bakıyorum." },
    { user: "Nasılsın?" },
    { user: "Günlük şehir kullanımı öne çıkıyor." },
  ]);
  const deferred = await runTurns("deferred", [
    { user: "arazi aracı lazım" },
    { user: "3 milyon" },
  ]);
  const frustration = await runTurns("frustration", [
    { user: "arazi aracı bakıyorum" },
    { user: "pick up araç tercihim" },
    { user: "pick up dedim ya. anlamdın mı?" },
  ]);
  const offer = await runTurns("offer", [{ user: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." }]);
  const accept = await runTurns("accept", [
    { user: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
    { user: "evet" },
  ]);
  const decline = await runTurns("decline", [
    { user: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
    { user: "hayır" },
  ]);
  const correction = await runTurns("correction", [
    { user: "En az 7 koltuk ve en az 300 litre bagaj istiyorum." },
    { user: "hayır 5 koltuk yeter" },
  ]);
  const discriminator = await runTurns("discriminator", [
    { user: "En az 7 koltuk istiyorum." },
  ]);

  const failures: string[] = [];
  const g = greeting[0];
  if (!g) failures.push("greeting-missing");
  else {
    if (g.identityLeak || discoveryAfterGreeting(g.assistant)) failures.push("greeting-discovery");
    if (g.requestedModel && g.requestedModel !== "gpt-5.5") failures.push("greeting-requested-model");
    if (g.selectedModel && g.selectedModel !== "gpt-5.5") failures.push("greeting-selected-model");
    if ((g.requirements?.length ?? 0) > 0) failures.push("greeting-requirements");
    if (g.offer && g.offer !== "NONE") failures.push("greeting-offer");
    if (g.options?.length) failures.push("greeting-quick-replies");
  }
  if (intent[0] && (discoveryAfterGreeting(intent[0].assistant) === false && !/aile|günlük|iş/i.test(intent[0].assistant))) {
    failures.push("intent-no-discovery-move");
  }
  if (detour[1] && /hangi senaryo|kaç koltuk|daraltalım/i.test(detour[1].assistant)) failures.push("detour-forced-redirect");
  if (deferred[1] && /3\.000\.000|3 milyon|bütçe/i.test(deferred[1].assistant) === false) failures.push("deferred-no-ack");
  if (frustration.at(-1) && /vazgeçilmez|kaç koltuk/i.test(frustration.at(-1)?.assistant ?? "")) failures.push("frustration-repeat");
  if (offer[0]?.identityLeak || (offer[0]?.cardCount ?? 0) > 0) failures.push("offer-identity");
  if (offer[0]?.kind === "RECOMMENDATIONS") failures.push("offer-card");
  if (accept[1]?.cardCount !== 1) failures.push("accept-card");
  if (accept[1] && !/IONIQ|Hyundai/i.test(`${accept[1].assistant} ${accept[1].cardBrand ?? ""} ${accept[1].cardModel ?? ""}`)) {
    failures.push("accept-identity-missing");
  }
  if (decline[1]?.cardCount) failures.push("decline-card");
  if (decline[1] && /görmek ister misiniz|önerim var/i.test(decline[1].assistant)) failures.push("decline-pressure");
  if (correction[1]?.kind === "RECOMMENDATIONS") failures.push("correction-card");
  if (correction[1]?.offer === "AWAITING_CONSENT" && correction[1].identityLeak) failures.push("correction-identity");
  if (discriminator[0]?.textInputAllowed === false && !discriminator[0]?.assistant) failures.push("discriminator-empty");

  const report = {
    greeting, intent, detour, deferred, frustration, offer, accept, decline, correction, discriminator,
  };
  console.log(JSON.stringify({ ok: failures.length === 0, failures, report }, null, 2));
  if (failures.length) process.exit(1);
}

void main();
