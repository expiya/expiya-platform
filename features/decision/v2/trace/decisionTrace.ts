import { createHash } from "node:crypto";

export type TraceConstraint = Readonly<{
  fieldId: string;
  decisionEffect: string;
  normalizedValue: unknown;
}>;

export type TraceCandidate = Readonly<{
  exactVariantId: string;
  modelFamilyId: string;
  brand: string;
  model: string;
  bodyStyle: string;
  fuelType: string;
  transmissionClass: "AUTOMATIC" | "MANUAL";
  finalOrdinal: number;
  functionalFitScore: number;
  rankingReasonCodes: readonly string[];
}>;

export type DecisionTurnTrace = Readonly<{
  schemaVersion: 1;
  messageId: string;
  interpretedActs: readonly string[];
  activeConstraints: readonly TraceConstraint[];
  rankingCandidates: readonly TraceCandidate[];
  shortlistCandidateIds: readonly string[];
  shortlistMode: string;
  exactModelPreferenceScope: boolean;
  action: string;
  recommendationReadiness: string;
  selectedQuestionKey?: string | null;
  offerCreated?: boolean;
  technicalBuckets?: Readonly<{ eligible: number; notEvaluable: number; eliminated: number }>;
  affordabilityBuckets?: Readonly<{ selectable: number; verifiedWithin: number; estimateWithin: number; estimateOverConditional: number; budgetNotApplied: number; verifiedOver: number; unresolved: number; technicalUnknown: number; eliminated: number }>;
  activeOffer?: string | null;
}>;

export type TraceInvariantFailure = Readonly<{
  code: "SHORTLIST_PREFERENCE_DOMINANCE_VIOLATION" | "SINGLE_SHORTLIST_WITHOUT_EXACT_MODEL_SCOPE" | "OFFER_WITH_ZERO_MATERIAL_PREFERENCE_COVERAGE" | "HARD_FILTER_SHORTLIST_VIOLATION" | "OFFER_WITHOUT_READY_SHORTLIST" | "AFFORDABILITY_BUCKET_ACCOUNTING_INVALID";
  messageId: string;
  details: Readonly<Record<string, unknown>>;
}>;

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;
}

function expectedValue(constraint: TraceConstraint): unknown {
  if (!constraint.normalizedValue || typeof constraint.normalizedValue !== "object") return constraint.normalizedValue;
  return (constraint.normalizedValue as { value?: unknown }).value;
}

function candidateValue(candidate: TraceCandidate, fieldId: string): unknown {
  if (fieldId === "bodyStyle") return candidate.bodyStyle;
  if (fieldId === "fuelType") return candidate.fuelType;
  if (fieldId === "transmission") return candidate.transmissionClass;
  return undefined;
}

function preferenceMatchCount(candidate: TraceCandidate, constraints: readonly TraceConstraint[]): number {
  return constraints.filter((constraint) => {
    const expected = expectedValue(constraint);
    const actual = candidateValue(candidate, constraint.fieldId);
    return Array.isArray(expected) ? expected.includes(actual) : actual === expected;
  }).length;
}

export function evaluateDecisionTurnTrace(trace: DecisionTurnTrace): readonly TraceInvariantFailure[] {
  const failures: TraceInvariantFailure[] = [];
  const materialPreferences = trace.activeConstraints.filter((constraint) =>
    constraint.decisionEffect === "STRONG_RANK" && ["bodyStyle", "fuelType", "transmission"].includes(constraint.fieldId));
  if (materialPreferences.length && trace.rankingCandidates.length && trace.shortlistCandidateIds.length) {
    const uncoveredFields = materialPreferences.filter((constraint) => !trace.rankingCandidates.some((candidate) => preferenceMatchCount(candidate, [constraint]) === 1)).map((constraint) => constraint.fieldId);
    if (uncoveredFields.length && trace.action === "REQUEST_REVEAL_CONSENT") failures.push(Object.freeze({
      code: "OFFER_WITH_ZERO_MATERIAL_PREFERENCE_COVERAGE",
      messageId: trace.messageId,
      details: Object.freeze({ uncoveredFields, shortlistCandidateIds: trace.shortlistCandidateIds }),
    }));
    const best = Math.max(...trace.rankingCandidates.map((candidate) => preferenceMatchCount(candidate, materialPreferences)));
    const weaker = trace.rankingCandidates.filter((candidate) => trace.shortlistCandidateIds.includes(candidate.exactVariantId) && preferenceMatchCount(candidate, materialPreferences) < best);
    if (weaker.length) failures.push(Object.freeze({
      code: "SHORTLIST_PREFERENCE_DOMINANCE_VIOLATION",
      messageId: trace.messageId,
      details: Object.freeze({ bestMatchCount: best, weakerShortlistCandidateIds: weaker.map((candidate) => candidate.exactVariantId), preferenceFields: materialPreferences.map((constraint) => constraint.fieldId) }),
    }));
  }
  if (trace.shortlistMode === "SINGLE_REQUESTED" && !trace.exactModelPreferenceScope) failures.push(Object.freeze({
    code: "SINGLE_SHORTLIST_WITHOUT_EXACT_MODEL_SCOPE",
    messageId: trace.messageId,
    details: Object.freeze({ shortlistCandidateIds: trace.shortlistCandidateIds }),
  }));
  const hardConstraints = trace.activeConstraints.filter((constraint) => constraint.decisionEffect === "HARD_FILTER" && ["bodyStyle", "fuelType", "transmission"].includes(constraint.fieldId));
  const hardViolations = trace.rankingCandidates.filter((candidate) => trace.shortlistCandidateIds.includes(candidate.exactVariantId)
    && hardConstraints.some((constraint) => preferenceMatchCount(candidate, [constraint]) === 0));
  if (hardViolations.length) failures.push(Object.freeze({ code: "HARD_FILTER_SHORTLIST_VIOLATION", messageId: trace.messageId,
    details: Object.freeze({ candidateIds: hardViolations.map((candidate) => candidate.exactVariantId), fields: hardConstraints.map((constraint) => constraint.fieldId) }) }));
  if (trace.offerCreated && (trace.recommendationReadiness !== "READY_FOR_OFFER" || trace.shortlistCandidateIds.length === 0
    || trace.affordabilityBuckets && trace.affordabilityBuckets.selectable < trace.shortlistCandidateIds.length)) failures.push(Object.freeze({
      code: "OFFER_WITHOUT_READY_SHORTLIST", messageId: trace.messageId,
      details: Object.freeze({ readiness: trace.recommendationReadiness, shortlistCount: trace.shortlistCandidateIds.length, selectableCount: trace.affordabilityBuckets?.selectable }) }));
  if (trace.affordabilityBuckets) {
    const buckets = trace.affordabilityBuckets;
    const selectableParts = buckets.verifiedWithin + buckets.estimateWithin + buckets.estimateOverConditional + buckets.budgetNotApplied;
    if (buckets.selectable !== selectableParts) failures.push(Object.freeze({ code: "AFFORDABILITY_BUCKET_ACCOUNTING_INVALID", messageId: trace.messageId,
      details: Object.freeze({ selectable: buckets.selectable, selectableParts }) }));
  }
  return Object.freeze(failures);
}

export function traceChecksum(trace: DecisionTurnTrace): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(canonicalize(trace), "utf8").digest("hex")}`;
}

export class DecisionTraceCollector {
  readonly #traces: DecisionTurnTrace[] = [];
  record(value: DecisionTurnTrace): void { this.#traces.push(Object.freeze(value)); }
  snapshot(): readonly DecisionTurnTrace[] { return Object.freeze([...this.#traces]); }
  evaluate(): readonly TraceInvariantFailure[] { return Object.freeze(this.#traces.flatMap(evaluateDecisionTurnTrace)); }
}

export function decisionTraceFromObserver(value: Readonly<Record<string, unknown>>): DecisionTurnTrace | null {
  if (value.phase !== "DECISION" || value.traceSchemaVersion !== 1) return null;
  const requiredArrays = [value.interpretedActs, value.activeConstraints, value.rankingCandidates, value.shortlistCandidateIds];
  if (typeof value.messageId !== "string" || typeof value.action !== "string" || typeof value.recommendationReadiness !== "string" || typeof value.shortlistMode !== "string" || typeof value.exactModelPreferenceScope !== "boolean" || requiredArrays.some((item) => !Array.isArray(item))) return null;
  return Object.freeze({
    schemaVersion: 1,
    messageId: value.messageId,
    interpretedActs: value.interpretedActs as readonly string[],
    activeConstraints: value.activeConstraints as readonly TraceConstraint[],
    rankingCandidates: value.rankingCandidates as readonly TraceCandidate[],
    shortlistCandidateIds: value.shortlistCandidateIds as readonly string[],
    shortlistMode: value.shortlistMode,
    exactModelPreferenceScope: value.exactModelPreferenceScope,
    action: value.action,
    recommendationReadiness: value.recommendationReadiness,
    selectedQuestionKey: typeof value.selectedQuestionKey === "string" ? value.selectedQuestionKey : null,
    offerCreated: value.offerCreated === true,
    technicalBuckets: value.technicalBuckets as DecisionTurnTrace["technicalBuckets"],
    affordabilityBuckets: value.affordabilityBuckets as DecisionTurnTrace["affordabilityBuckets"],
    activeOffer: typeof value.activeOffer === "string" ? value.activeOffer : null,
  });
}
