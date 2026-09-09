import { createHash } from "node:crypto";
import type { ActiveCategoryPMateriality } from "./runtimeAdmission.server";
import {
  executePMaterialityShadow,
  projectActiveQuestionAnswers,
  type PMaterialityContext,
  type QuestionAnswerEvent,
} from "./materialityExecutor";

export const P_RUNTIME_CONSUMER_VERSION = "p-materiality-runtime-consumer/v1" as const;
export type PMaterialityRuntimeConsumption = "EXECUTABLE_MATERIAL_QUESTION" | "NO_MATERIAL_QUESTION";

export interface PMaterialityRuntimeSlice {
  readonly version: typeof P_RUNTIME_CONSUMER_VERSION;
  readonly releaseId: string;
  readonly releaseDigest: `sha256:${string}`;
  readonly departmentId: string;
  readonly categoryId: string;
  readonly artifactReadiness: "P_READY" | "INFORMATION_ONLY";
  readonly candidatePool: readonly string[];
  readonly candidatePoolFingerprint: `sha256:${string}`;
  readonly establishedJourneyContextIds: readonly string[];
  readonly answerLedger: readonly QuestionAnswerEvent[];
  readonly pendingQuestionId?: string;
}

export interface RuntimeCandidateSummary {
  readonly exactProductId: string;
  readonly manufacturer: string;
  readonly modelCode: string;
  readonly label: string;
  readonly softPreferred: boolean;
}

const fingerprint = (ids: readonly string[]) => `sha256:${createHash("sha256").update(JSON.stringify(ids)).digest("hex")}` as const;
const canonicalPool = (ids: readonly string[]) => Object.freeze([...new Set(ids)].sort((a, b) => a.localeCompare(b)));

function assertUnknownNeutral(authority: ActiveCategoryPMateriality): void {
  for (const projection of authority.projections) {
    const answer = projection.materialQuestion.answerDomain.find(item => item.answerId === "UNKNOWN");
    if (!answer || answer.establishesExplicitRequirement) throw new TypeError(`P_RUNTIME_UNKNOWN_INVALID:${projection.identity.projectionId}`);
    const effects = projection.materialQuestion.candidateEffectByAnswer.UNKNOWN ?? [];
    if (effects.some(effect => !["none", "unknownRetain"].includes(effect.effect))) throw new TypeError(`P_RUNTIME_UNKNOWN_NOT_NEUTRAL:${projection.identity.projectionId}`);
  }
}

export function createPMaterialityRuntimeSlice(input: {
  readonly departmentId: string;
  readonly authority: ActiveCategoryPMateriality;
  readonly candidatePool?: readonly string[];
}): PMaterialityRuntimeSlice {
  assertUnknownNeutral(input.authority);
  const candidatePool = canonicalPool(input.candidatePool ?? input.authority.exactOfferingIds);
  if (!candidatePool.length || candidatePool.some(id => !input.authority.exactOfferingIds.includes(id))) throw new TypeError("P_RUNTIME_CANDIDATE_POOL_NOT_ADMITTED");
  const establishedJourneyContextIds = Object.freeze([...new Set(input.authority.projections.flatMap(projection =>
    projection.materialQuestion.prerequisites.map(item => item.prerequisiteId),
  ))].sort());
  return Object.freeze({
    version: P_RUNTIME_CONSUMER_VERSION,
    releaseId: input.authority.releaseId,
    releaseDigest: input.authority.releaseDigest,
    departmentId: input.departmentId,
    categoryId: input.authority.categoryId,
    artifactReadiness: input.authority.readiness,
    candidatePool,
    candidatePoolFingerprint: fingerprint(candidatePool),
    establishedJourneyContextIds,
    answerLedger: Object.freeze([]),
  });
}

function context(slice: PMaterialityRuntimeSlice, authority: ActiveCategoryPMateriality): PMaterialityContext {
  const configurations = authority.projections.flatMap(projection => projection.offerings)
    .filter(offering => slice.candidatePool.includes(offering.exactOfferingId))
    .map(offering => offering.configurationId);
  return {
    market: "TR",
    configurationIds: [...new Set(configurations)],
    evaluatedAt: new Date().toISOString(),
    satisfiedPrerequisiteIds: slice.establishedJourneyContextIds,
    relevantNeedIds: authority.projections.map(projection => projection.userNeed.needId),
    questionsAskedThisSession: projectActiveQuestionAnswers(slice.answerLedger).active.length,
    userFatigue: 0,
  };
}

export function nextPMaterialityRuntimeQuestion(slice: PMaterialityRuntimeSlice, authority: ActiveCategoryPMateriality) {
  assertPMaterialityRuntimeBinding(slice, authority);
  if (slice.artifactReadiness === "INFORMATION_ONLY") return Object.freeze({
    runtimeConsumption: "NO_MATERIAL_QUESTION" as const,
    selectedQuestion: null,
    selectedProjectionId: null,
    candidatePoolUnchanged: true as const,
  });
  const result = executePMaterialityShadow({
    candidatePool: slice.candidatePool,
    currentContext: context(slice, authority),
    projections: authority.projections,
    answerLedger: slice.answerLedger,
  });
  return Object.freeze({
    runtimeConsumption: result.outcome === "ASK_ONE_QUESTION" ? "EXECUTABLE_MATERIAL_QUESTION" as const : "NO_MATERIAL_QUESTION" as const,
    selectedQuestion: result.selectedQuestion,
    selectedProjectionId: result.selectedProjectionId,
    candidatePoolUnchanged: true as const,
    traceFingerprint: result.traceFingerprint,
  });
}

export function assertPMaterialityRuntimeBinding(slice: PMaterialityRuntimeSlice, authority: ActiveCategoryPMateriality): void {
  if (slice.version !== P_RUNTIME_CONSUMER_VERSION || slice.releaseId !== authority.releaseId || slice.releaseDigest !== authority.releaseDigest || slice.categoryId !== authority.categoryId) throw new TypeError("P_RUNTIME_AUTHORITY_BINDING_MISMATCH");
  const pool = canonicalPool(slice.candidatePool);
  if (fingerprint(pool) !== slice.candidatePoolFingerprint || pool.some(id => !authority.exactOfferingIds.includes(id))) throw new TypeError("P_RUNTIME_CANDIDATE_POOL_BINDING_MISMATCH");
  assertUnknownNeutral(authority);
}

export function recordPMaterialityRuntimeAnswer(input: {
  readonly slice: PMaterialityRuntimeSlice;
  readonly authority: ActiveCategoryPMateriality;
  readonly eventId: string;
  readonly answerId?: string;
  readonly operation: "ANSWER" | "CORRECT" | "CLEAR" | "SUPERSEDE";
}): PMaterialityRuntimeSlice {
  const { slice, authority } = input;
  assertPMaterialityRuntimeBinding(slice, authority);
  const projected = projectActiveQuestionAnswers(slice.answerLedger);
  const lastActive = [...projected.active].sort((a, b) => b.sequence - a.sequence)[0];
  const questionId = slice.pendingQuestionId ?? (["CORRECT", "SUPERSEDE", "CLEAR"].includes(input.operation) ? lastActive?.questionId : undefined);
  if (!questionId) throw new TypeError("P_RUNTIME_PENDING_QUESTION_MISSING");
  const projection = authority.projections.find(item => item.materialQuestion.questionId === questionId);
  if (!projection) throw new TypeError("P_RUNTIME_PENDING_QUESTION_NOT_ADMITTED");
  if (input.operation !== "CLEAR" && !projection.materialQuestion.answerDomain.some(answer => answer.answerId === input.answerId)) throw new TypeError("P_RUNTIME_ANSWER_NOT_ADMITTED");
  const active = projected.active.find(item => item.questionId === questionId);
  if (["CORRECT", "SUPERSEDE", "CLEAR"].includes(input.operation) && !active) throw new TypeError("P_RUNTIME_ACTIVE_ANSWER_MISSING");
  if (input.answerId === "UNKNOWN") assertUnknownNeutral(authority);
  const event: QuestionAnswerEvent = Object.freeze({
    eventId: input.eventId,
    questionId,
    operation: input.operation,
    sequence: slice.answerLedger.length + 1,
    ...(input.operation !== "CLEAR" ? { answerId: input.answerId } : {}),
    ...(active ? { supersedesEventId: active.eventId } : {}),
  });
  return Object.freeze({ ...slice, answerLedger: Object.freeze([...slice.answerLedger, event]), pendingQuestionId: undefined });
}

export function bindPendingPMaterialityQuestion(slice: PMaterialityRuntimeSlice, questionId: string | null): PMaterialityRuntimeSlice {
  return Object.freeze({ ...slice, ...(questionId ? { pendingQuestionId: questionId } : { pendingQuestionId: undefined }) });
}

const brandNames: Readonly<Record<string, string>> = Object.freeze({ lg: "LG", hp: "HP", asus: "ASUS", jbl: "JBL", tp: "TP-Link", "tp-link": "TP-Link", apple: "Apple", samsung: "Samsung", next: "Next", sony: "Sony", huawei: "Huawei", xiaomi: "Xiaomi", lenovo: "Lenovo", canon: "Canon", epson: "Epson", philips: "Philips", beko: "Beko", bosch: "Bosch", siemens: "Siemens" });
const publicToken = (value: string) => value.split("-").map(part => part ? `${part[0]!.toLocaleUpperCase("tr-TR")}${part.slice(1)}` : part).join(" ");

export function publicExactCandidateIdentity(exactProductId: string, configurationId?: string): Omit<RuntimeCandidateSummary, "softPreferred"> {
  const parts = exactProductId.split(":");
  const pipe = configurationId?.split("|").map(item => item.trim()).filter(Boolean) ?? [];
  const slashIdentity = configurationId?.includes(" / ") ? configurationId.split(" / ")[0]?.trim() : undefined;
  if (slashIdentity?.includes(" ")) {
    const [manufacturer, ...model] = slashIdentity.split(/\s+/u);
    return Object.freeze({ exactProductId, manufacturer: brandNames[manufacturer!.toLocaleLowerCase("tr-TR")] ?? manufacturer!, modelCode: model.join(" "), label: slashIdentity });
  }
  if (pipe.length >= 2 && parts.length < 4) return Object.freeze({ exactProductId, manufacturer: pipe[0]!, modelCode: pipe[1]!, label: `${pipe[0]} ${pipe[1]}` });
  let manufacturerToken: string | undefined, modelToken: string | undefined;
  if (parts[0] === "electronics" && parts.length >= 4) { manufacturerToken = parts[2]; modelToken = parts[3]; }
  else if (parts[0] === "durable" && parts.length === 3) { const [brand, ...model] = parts[2]!.split("-"); manufacturerToken=brand;modelToken=model.join("-"); }
  else if (parts.length >= 4) { manufacturerToken=parts.at(-2);modelToken=parts.at(-1); }
  else if (exactProductId.includes("_")) { const tokens=exactProductId.split("_");manufacturerToken=tokens[0];modelToken=tokens.slice(1,-1).join("-"); }
  else if (pipe.length >= 2) { manufacturerToken=pipe[0];modelToken=pipe[1]; }
  if (!manufacturerToken || !modelToken) throw new TypeError("P_RUNTIME_EXACT_IDENTITY_INVALID");
  const manufacturer = brandNames[manufacturerToken] ?? publicToken(manufacturerToken);
  const modelCode = /^[a-z0-9-]+$/u.test(modelToken) ? modelToken.toLocaleUpperCase("tr-TR") : publicToken(modelToken);
  return Object.freeze({ exactProductId, manufacturer, modelCode, label: `${manufacturer} ${modelCode}` });
}

export function projectPMaterialityCandidates(slice: PMaterialityRuntimeSlice, authority: ActiveCategoryPMateriality): readonly RuntimeCandidateSummary[] {
  assertPMaterialityRuntimeBinding(slice, authority);
  const activeAnswers = projectActiveQuestionAnswers(slice.answerLedger).active;
  const soft = new Set<string>();
  for (const active of activeAnswers) {
    const projection = authority.projections.find(item => item.materialQuestion.questionId === active.questionId);
    for (const effect of projection?.materialQuestion.candidateEffectByAnswer[active.answerId] ?? []) {
      if (effect.effect === "softOnly" && effect.uncertainty === "KNOWN" && slice.candidatePool.includes(effect.exactOfferingId)) soft.add(effect.exactOfferingId);
    }
  }
  const offerings = new Map(authority.projections.flatMap(projection => projection.offerings).map(offering => [offering.exactOfferingId, offering.configurationId]));
  return Object.freeze(slice.candidatePool.map(id => ({ ...publicExactCandidateIdentity(id, offerings.get(id)), softPreferred: soft.has(id) }))
    .sort((left, right) => Number(right.softPreferred) - Number(left.softPreferred) || left.exactProductId.localeCompare(right.exactProductId)));
}
