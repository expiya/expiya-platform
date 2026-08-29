import { createHash } from "node:crypto";
import type { CatalogVariantSnapshot } from "../../v2/catalog/types";
import { activeDecisionPreferences } from "../ledger";
import { evaluateV3Catalog, rankV3Candidates } from "../catalogAdapter.server";
import { runV3Turn } from "../engine.server";
import type { V3PublicResponse } from "../types";
import { analyzeSemanticNeeds, type SemanticAnalystInput } from "./provider.server";
import { governSemanticNeedsAnalysis, type RejectedSignal } from "./governance";
import { planDeterministicQuestion, type CatalogCapabilitySnapshot, type MaterialQuestion, type QuestionEvaluation, type QuestionPlanningResult } from "./planner";
import { recordAnalystTrace } from "./traceStore.server";

export type AnalystMode = "OFF" | "SHADOW" | "QUESTION_INPUT" | "EXPLICIT_FACTS_AND_QUESTIONS";
export interface AnalystEvaluationTrace {
  readonly mode: AnalystMode; readonly origin: "MODEL" | "BOUNDED_FALLBACK"; readonly acceptedExplicitFacts: readonly string[];
  readonly rejectedExplicitFacts: readonly RejectedSignal[]; readonly acceptedHypotheses: readonly string[]; readonly rejectedHypotheses: readonly RejectedSignal[];
  readonly questionEvaluations: readonly QuestionEvaluation[]; readonly selectedQuestionKey?: string; readonly noQuestionReason?: string; readonly decisionNeutralityFingerprint: string;
}
export interface AnalystTraceEnvelope { readonly conversationId: string; readonly sourceMessageId: string; readonly revision: number; readonly trace: AnalystEvaluationTrace }

export function resolveAnalystMode(value = process.env.CARS_SEMANTIC_ANALYST_MODE): AnalystMode {
  if (value === "SHADOW") return "SHADOW";
  if (value === "QUESTION_INPUT") return process.env.CARS_SEMANTIC_ANALYST_QUESTION_INPUT_READY === "true" ? "QUESTION_INPUT" : "SHADOW";
  if (value === "EXPLICIT_FACTS_AND_QUESTIONS") {
    // Explicit-fact projection intentionally has no runtime activation path yet.
    // The separate acceptance gate rejects this mode until append-only ledger
    // projection and its release evidence are implemented and reviewed.
    return process.env.CARS_SEMANTIC_ANALYST_QUESTION_INPUT_READY === "true" ? "QUESTION_INPUT" : "SHADOW";
  }
  return "OFF";
}
export function shouldSampleShadow(conversationId: string, configuredRate = process.env.CARS_SEMANTIC_ANALYST_SHADOW_SAMPLE_RATE): boolean {
  const parsed = configuredRate === undefined ? 1 : Number(configuredRate);
  const rate = Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0;
  if (rate === 0) return false;
  if (rate === 1) return true;
  const bucket = createHash("sha256").update(conversationId).digest().readUInt32BE(0) / 0x1_0000_0000;
  return bucket < rate;
}
const V3_QUESTION_BY_PLANNER_CONCEPT: Readonly<Record<string, { readonly key: string; readonly text: string }>> = {
  bodyStyleReference: { key: "bodyStyle", text: "Park kolaylığı mı, daha ferah ve yüksek bir yapı mı senin için daha önemli?" },
  fuelPreference: { key: "fuelType", text: "Yakıt türünde net bir tercihin var mı, yoksa kullanımına göre birlikte mi değerlendirelim?" },
  passengerCapacity: { key: "passengerCapacity", text: "Sürücü dahil, aynı anda toplam kaç kişilik bir araç gerekiyor?" },
};
const RECONCILABLE_V3_QUESTIONS = new Set(Object.values(V3_QUESTION_BY_PLANNER_CONCEPT).map((item) => item.key));
export function reconcileQuestionInput(output: V3PublicResponse, planning: QuestionPlanningResult): V3PublicResponse {
  if (output.state.pendingOffer || output.offerAwaitingConsent || output.recommendations || !output.state.lastQuestionKey || !RECONCILABLE_V3_QUESTIONS.has(output.state.lastQuestionKey)) return output;
  const selected = planning.selectedQuestion ? V3_QUESTION_BY_PLANNER_CONCEPT[planning.selectedQuestion.concept] : undefined;
  if (!selected || selected.key === output.state.lastQuestionKey) return output;
  return {
    ...output,
    message: `Kararı gerçekten etkileyen tek bir noktayı netleştirelim. ${selected.text}`,
    state: {
      ...output.state,
      askedQuestionKeys: [...new Set([...output.state.askedQuestionKeys.filter((key) => key !== output.state.lastQuestionKey), selected.key])],
      lastQuestionKey: selected.key,
    },
  };
}
const groupQuestion = (key: string, concept: string, text: string, groups: ReadonlyMap<string, readonly string[]>): MaterialQuestion => ({ key, concept, kind: "MATERIAL_DECISION_QUESTION", text, reliability: 1, partitions: [...groups].map(([value, candidateIds]) => ({ value, candidateIds })) });
const grouped = (variants: readonly CatalogVariantSnapshot[], value: (variant: CatalogVariantSnapshot) => string | number | undefined) => {
  const map = new Map<string, string[]>(); for (const variant of variants) { const item = value(variant); if (item === undefined) continue; const key = String(item); map.set(key, [...(map.get(key) ?? []), variant.id]); } return map;
};
export function buildCatalogCapabilitySnapshot(variants: readonly CatalogVariantSnapshot[]): CatalogCapabilitySnapshot {
  const questions: MaterialQuestion[] = [
    groupQuestion("planner:bodyStyle", "bodyStyleReference", "Hangi gövde yapısı günlük kullanımına daha uygun?", grouped(variants, (item) => item.decisionFacts.bodyStyle.value)),
    groupQuestion("planner:fuelType", "fuelPreference", "Yakıt türünde net bir tercihin var mı?", grouped(variants, (item) => item.decisionFacts.powertrain.fuelType.value)),
    groupQuestion("planner:transmission", "transmissionPreference", "Şanzıman tercihin var mı?", grouped(variants, (item) => item.decisionFacts.powertrain.transmission.value)),
    groupQuestion("planner:passengerCapacity", "passengerCapacity", "Sürücü dahil kaç kişilik araç gerekiyor?", grouped(variants, (item) => item.decisionFacts.dimensions.seats?.value)),
  ];
  const equipmentCodes = [...new Set(variants.flatMap((variant) => variant.decisionFacts.safetyFeatureCodes.filter((fact) => fact.confidence === "HIGH").map((fact) => fact.value)))].sort();
  for (const code of equipmentCodes.slice(0, 12)) {
    const yes = variants.filter((variant) => variant.decisionFacts.safetyFeatureCodes.some((fact) => fact.confidence === "HIGH" && fact.value === code)).map((variant) => variant.id);
    questions.push({ key: `planner:equipment:${code}`, concept: "equipmentRequirement", kind: "MATERIAL_DECISION_QUESTION", text: "Bu doğrulanmış donanım senin için vazgeçilmez mi?", reliability: 1, partitions: [{ value: "REQUIRED", candidateIds: yes }, { value: "NOT_REQUIRED", candidateIds: variants.map((item) => item.id) }] });
  }
  return { reliableConcepts: ["bodyStyleReference", "fuelPreference", "transmissionPreference", "passengerCapacity", "equipmentRequirement"], questions };
}
const fingerprintResponse = (output: V3PublicResponse, candidateIds: readonly string[], rankedIds: readonly string[]) => createHash("sha256").update(JSON.stringify({ ledger: output.state.ledger, selectedQuestion: output.state.lastQuestionKey, purchaseIntent: output.state.purchaseIntent, pendingOffer: output.state.pendingOffer?.candidateIds, recommendations: output.recommendations?.map((item) => item.id), candidateIds, rankedIds })).digest("hex");
export async function createDecisionNeutralityFingerprint(output: V3PublicResponse): Promise<string> {
  const budgetMode = output.state.budgetMode ?? "NEEDS_ONLY"; let variants: readonly CatalogVariantSnapshot[] = [];
  try { variants = (await evaluateV3Catalog(output.state.ledger, undefined, budgetMode)).variants; } catch { variants = []; }
  return fingerprintResponse(output, variants.map((item) => item.id), rankV3Candidates(variants, output.state.ledger, budgetMode).map((item) => item.id));
}

export async function runV3TurnWithAnalyst(input: Parameters<typeof runV3Turn>[0] & { readonly analystMode?: AnalystMode; readonly analystProvider?: (input: SemanticAnalystInput) => ReturnType<typeof analyzeSemanticNeeds>; readonly onAnalystTrace?: (envelope: AnalystTraceEnvelope) => void }): Promise<V3PublicResponse> {
  const mode = resolveAnalystMode(input.analystMode);
  if (mode === "OFF") return runV3Turn(input);
  if (mode === "SHADOW" && !shouldSampleShadow(input.conversationId)) return runV3Turn(input);
  const prior = input.state; const provider = input.analystProvider ?? analyzeSemanticNeeds;
  const analysisPromise = provider({ message: input.message, sourceMessageId: input.messageId, conversationRevision: input.expectedRevision, activeExplicitStatements: (prior?.ledger ?? []).filter((item) => item.status === "ACTIVE" && item.authority === "USER_EXPLICIT").map((item) => ({ concept: item.concept, value: item.normalizedValue })), rejectedOrSuperseded: (prior?.ledger ?? []).filter((item) => ["REJECTED", "SUPERSEDED", "CLEARED"].includes(item.status)).map((item) => ({ concept: item.concept, status: item.status as "REJECTED" | "SUPERSEDED" | "CLEARED" })), pendingQuestionPurpose: prior?.lastQuestionKey, signal: input.signal });
  const output = await runV3Turn(input); const analysis = await analysisPromise; const governed = governSemanticNeedsAnalysis(input.message, analysis);
  const budgetMode = output.state.budgetMode ?? "NEEDS_ONLY";
  let variants: readonly CatalogVariantSnapshot[] = []; try { variants = (await evaluateV3Catalog(output.state.ledger, undefined, budgetMode)).variants; } catch { variants = []; }
  const planning = planDeterministicQuestion({ activePreferences: activeDecisionPreferences(output.state.ledger), analystFacts: governed.acceptedExplicitFacts, analystHypotheses: governed.acceptedHypotheses, candidateSnapshot: { candidateIds: variants.map((item) => item.id) }, catalogCapabilities: buildCatalogCapabilitySnapshot(variants), askedQuestionKeys: mode === "QUESTION_INPUT" ? output.state.askedQuestionKeys.filter((key) => key !== output.state.lastQuestionKey) : output.state.askedQuestionKeys, answeredConcepts: activeDecisionPreferences(output.state.ledger).map((item) => item.concept), rejectedConcepts: output.state.ledger.filter((item) => item.status === "REJECTED").map((item) => item.concept), conversationTurn: output.state.revision, questionFatigue: output.state.askedQuestionKeys.length });
  const finalOutput = mode === "QUESTION_INPUT" ? reconcileQuestionInput(output, planning) : output;
  const trace: AnalystEvaluationTrace = { mode, origin: analysis.origin, acceptedExplicitFacts: governed.acceptedExplicitFacts.map((item) => item.concept), rejectedExplicitFacts: governed.rejectedExplicitFacts, acceptedHypotheses: governed.acceptedHypotheses.map((item) => item.concept), rejectedHypotheses: governed.rejectedHypotheses, questionEvaluations: planning.evaluatedCandidates, ...(planning.selectedQuestion ? { selectedQuestionKey: planning.selectedQuestion.key } : {}), ...(planning.noQuestionReason ? { noQuestionReason: planning.noQuestionReason } : {}), decisionNeutralityFingerprint: fingerprintResponse(finalOutput, variants.map((item) => item.id), rankV3Candidates(variants, finalOutput.state.ledger, budgetMode).map((item) => item.id)) };
  const envelope = { conversationId: input.conversationId, sourceMessageId: input.messageId, revision: finalOutput.state.revision, trace };
  recordAnalystTrace(envelope); input.onAnalystTrace?.(envelope);
  return finalOutput;
}
