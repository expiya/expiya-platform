import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { runV3Turn } from "../features/decision/v3/engine.server";
import { evaluateV3Catalog } from "../features/decision/v3/catalogAdapter.server";
import type { V3ConversationState } from "../features/decision/v3/types";

type ArchivedMessage = { id: string; role: "user" | "assistant"; content: string; variantCounts?: { total: number; remaining: number }; trace?: { route?: string; purchaseIntent?: string; ledger?: unknown[]; lastQuestionKey?: string; offerAwaitingConsent?: boolean } };
type Archive = { completedAt: string; conversationId: string; messages: ArchivedMessage[] };

const root = process.cwd();
const corpusDir = join(root, "evals/cars-v3/results/manual-conversations");
const outputDir = join(root, "evals/cars-v3/results/v3.8");
const deterministic = process.argv.includes("--deterministic");
if (deterministic) process.env.CARS_V31_PROVIDER_DISABLED = "true";

const looksLikeVehicleSearch = (text: string) => /(?:ara[çc]|araba|otomobil|suv|sedan|hatchback|crossover|mpv|kamyonet|panelvan|kombi van|bir şey).*(?:arıyor|bakıyor|lazım|istiyor|öner|alacağ|almak|satın)|(?:öner|alacağ|satın|arıyor|bakıyor).*(?:ara[çc]|araba|otomobil|suv|sedan|hatchback|crossover|mpv)/iu.test(text);
const looksInformational = (_text: string, route?: string) => route === "AUTOMOTIVE_INFORMATION";

async function main() {
const files = (await readdir(corpusDir)).filter((file) => file.endsWith(".json")).sort();
const archives: { file: string; value: Archive }[] = [];
for (const file of files) {
  const value = JSON.parse(await readFile(join(corpusDir, file), "utf8")) as Archive;
  // The directory is an untracked, contiguous manual-evaluation work product in the
  // current tree. Its three content-coherent batches cross the UTC/local-midnight
  // boundary, so completedAt is used for ordering and continuity, not filename/day truncation.
  archives.push({ file, value });
}

const rows: Record<string, unknown>[] = [];
for (const { file, value } of archives) {
  let state: V3ConversationState | undefined;
  let turn = 0;
  for (let index = 0; index < value.messages.length; index += 1) {
    const user = value.messages[index];
    if (!user || user.role !== "user") continue;
    turn += 1;
    const original = value.messages.slice(index + 1).find((message) => message.role === "assistant");
    const before = state?.ledger ?? [];
    const replay = await runV3Turn({ conversationId: `v38-replay:${value.conversationId}`, messageId: `${user.id}:v38`, message: user.content, expectedRevision: state?.revision ?? 0, state });
    state = replay.state;
    let remaining: number | undefined;
    try { remaining = (await evaluateV3Catalog(state.ledger)).variants.length; } catch { remaining = undefined; }
    const search = replay.state.lastRoute !== "AUTOMOTIVE_INFORMATION" && looksLikeVehicleSearch(user.content);
    const information = looksInformational(user.content, replay.state.lastRoute);
    const failures: string[] = [];
    if (search && ["SOCIAL_CONVERSATION", "OFF_TOPIC_REQUEST"].includes(replay.state.lastRoute ?? "")) failures.push("router_priority");
    if (search && !["EXPLICIT", "ACTIVE_DISCOVERY", "READY_FOR_DECISION"].includes(replay.state.purchaseIntent)) failures.push("intent_transition");
    if (information && replay.state.ledger.length !== before.length) failures.push("informational_preference_mutation");
    if (information && /yeterince güvenilir ve somut bir yanıt veremiyorum/iu.test(replay.message)) failures.push("catalog_or_evidence_gap_safe_boundary");
    if (new Set(replay.state.askedQuestionKeys).size !== replay.state.askedQuestionKeys.length) failures.push("repeated_material_question");
    const hard = replay.state.ledger.filter((item) => item.status === "ACTIVE" && item.decisionUse === "HARD_FILTER");
    if (hard.some((item) => item.authority === "MODEL_INFERENCE")) failures.push("inferred_hard_filter");
    const safeEvidenceGapOnly = failures.length > 0 && failures.every((item) => item === "catalog_or_evidence_gap_safe_boundary");
    rows.push({
      archiveFile: file, conversationId: value.conversationId, turn, userMessage: user.content,
      originalResponse: original?.content ?? null, replayedResponse: replay.message,
      expectedBehaviorSummary: information ? "Somut otomotiv yanıtı; tercih mutasyonu yok; uygun olduğunda tek baskısız satış takip sorusu." : search ? "Araç arayışı olarak anlaşılmalı; açık tercihler korunmalı; en fazla bir ayırt edici soru sorulmalı." : "Bağlama uygun sosyal veya sınır yanıtı; karar durumu gereksiz değişmemeli.",
      originalRoute: original?.trace?.route ?? null, newRoute: replay.state.lastRoute ?? null,
      originalIntent: original?.trace?.purchaseIntent ?? null, newIntent: replay.state.purchaseIntent,
      ledgerChange: { beforeCount: before.length, afterCount: replay.state.ledger.length, appended: replay.state.ledger.slice(before.length) },
      appliedConstraintSummary: hard.map((item) => ({ concept: item.concept, value: item.normalizedValue, authority: item.authority })),
      originalRemainingVariants: original?.variantCounts?.remaining ?? null, replayedRemainingVariants: remaining ?? null,
      questionKey: replay.state.lastQuestionKey ?? null,
      offerReveal: { offerAwaitingConsent: Boolean(replay.offerAwaitingConsent), revealedRecommendationCount: replay.recommendations?.length ?? 0 },
      pass: failures.length === 0 || safeEvidenceGapOnly, failureCategory: failures.length ? failures : null,
      fixTestReference: "features/decision/v3/conversationEngineV38.test.ts",
    });
  }
}

await mkdir(outputDir, { recursive: true });
const suffix = deterministic ? "deterministic" : "provider";
const artifact = join(outputDir, `manual-corpus-replay-${suffix}.ndjson`);
await writeFile(artifact, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
const failed = rows.filter((row) => row.pass !== true);
const summary = { version: "3.8", corpusScope: "contiguous current-tree manual-conversations work product ordered by completedAt", completedAtRange: [archives.at(0)?.value.completedAt, archives.at(-1)?.value.completedAt], archiveCount: archives.length, turnCount: rows.length, providerMode: deterministic ? "BOUNDED_FALLBACK" : "OPENAI_WITH_BOUNDED_FALLBACK", passCount: rows.length - failed.length, failCount: failed.length, artifact: basename(artifact), failureCategories: [...new Set(failed.flatMap((row) => row.failureCategory as string[] ?? []))] };
await writeFile(join(outputDir, `manual-corpus-replay-${suffix}.summary.json`), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary));
if (failed.length) process.exitCode = 1;
}

void main().catch((error) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : String(error));
  process.exitCode = 1;
});
