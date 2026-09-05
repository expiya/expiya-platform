import type { XpyChoiceSet, XpyChoiceSubmission, XpyMaterialQuestionCandidate } from "./contracts";

export interface XpyQuestionPack {
  readonly packId: string;
  readonly questions: Readonly<Record<string, XpyChoiceSet>>;
}

const internalLanguage = /(?:evidence|capability|constraint|candidate|registry|authority|semantic key|parametre|şema|ontoloji|aday|exact|kanıt|zorunlu işlev|kategoriye ait ölçü)/iu;

export function consumerQuestionIsSafe(message: string): boolean {
  const questionMarks = message.match(/\?/gu)?.length ?? 0;
  return message.trim().length > 0 && !internalLanguage.test(message) && questionMarks <= 1;
}

export function consumerQuestionText(message: string, choices?: XpyChoiceSet): string {
  if (consumerQuestionIsSafe(message)) return message;
  if (choices?.prompt && consumerQuestionIsSafe(choices.prompt)) return choices.prompt;
  return "Bu adımı güvenli biçimde soramıyorum. Tercihini kendi cümlelerinle yazabilirsin.";
}

/**
 * Universal P invariant: choose no more than one currently-answerable axis, by
 * declared material decision value and then stable key. Domain Packs own both
 * the candidate values and the public language.
 */
export function selectHighestMaterialQuestion<Question>(candidates: readonly XpyMaterialQuestionCandidate<Question>[]): Question | undefined {
  return candidates
    .filter(candidate => candidate.answerable && Number.isFinite(candidate.materialDecisionValue))
    .sort((left, right) => right.materialDecisionValue - left.materialDecisionValue || left.stableKey.localeCompare(right.stableKey))[0]?.question;
}

export type XpyCandidateFact = { readonly candidateId: string; readonly facts: Readonly<Record<string, unknown>> };
export type XpyQuestionMateriality = {
  readonly material: boolean;
  readonly knownCount: number;
  readonly unknownCount: number;
  readonly distinctKnownValues: number;
  readonly impact: number;
  readonly reason: "CANDIDATE_SPLIT" | "UNIVERSAL_VALUE" | "PREDOMINANTLY_UNKNOWN" | "NO_GOVERNED_EVIDENCE";
};

/**
 * Shared P gate. A Domain Pack may name the governed evidence keys for an axis,
 * but cannot bypass the requirement that the current candidate pool is split.
 */
export function assessCandidateFactMateriality(candidates: readonly XpyCandidateFact[], governedFactKeys: readonly string[]): XpyQuestionMateriality {
  const signatures = candidates.map(candidate => {
    const values = governedFactKeys.map(key => candidate.facts[key]);
    return values.some(value => value !== undefined && value !== null) ? JSON.stringify(values) : undefined;
  });
  const known = signatures.filter((value): value is string => value !== undefined);
  const knownCount = known.length, unknownCount = candidates.length - knownCount;
  const distinctKnownValues = new Set(known).size;
  if (!knownCount) return { material: false, knownCount, unknownCount, distinctKnownValues, impact: 0, reason: "NO_GOVERNED_EVIDENCE" };
  if (unknownCount > knownCount) return { material: false, knownCount, unknownCount, distinctKnownValues, impact: 0, reason: "PREDOMINANTLY_UNKNOWN" };
  if (distinctKnownValues < 2) return { material: false, knownCount, unknownCount, distinctKnownValues, impact: 0, reason: "UNIVERSAL_VALUE" };
  const groups = new Map<string, number>();
  for (const signature of known) groups.set(signature, (groups.get(signature) ?? 0) + 1);
  const largestGroup = Math.max(...groups.values(), unknownCount);
  return { material: true, knownCount, unknownCount, distinctKnownValues, impact: candidates.length - largestGroup, reason: "CANDIDATE_SPLIT" };
}

export function defineXpyQuestionPack(pack: XpyQuestionPack): XpyQuestionPack {
  for (const [questionKey, choices] of Object.entries(pack.questions)) {
    if (choices.questionKey !== questionKey || choices.source !== "DOMAIN_PACK" || choices.options.length === 0) throw new TypeError("XPY_QUESTION_PACK_INVALID");
    if (choices.prompt && !consumerQuestionIsSafe(choices.prompt)) throw new TypeError("XPY_QUESTION_PROMPT_NOT_CONSUMER_SAFE");
    if (new Set(choices.options.map(option => option.value)).size !== choices.options.length) throw new TypeError("XPY_QUESTION_OPTION_VALUE_DUPLICATE");
    if (choices.selectionMode === "SINGLE" && choices.options.filter(option => option.exclusive).length > 1) throw new TypeError("XPY_SINGLE_CHOICE_EXCLUSIVITY_INVALID");
  }
  return Object.freeze(pack);
}

export function choiceSetFor(pack: XpyQuestionPack, questionKey?: string): XpyChoiceSet | undefined {
  return questionKey ? pack.questions[questionKey] : undefined;
}

export function validateChoiceSubmission(pack: XpyQuestionPack, pendingQuestionKey: string | undefined, submission: XpyChoiceSubmission): boolean {
  if (!pendingQuestionKey || submission.questionKey !== pendingQuestionKey) return false;
  const choices = pack.questions[pendingQuestionKey];
  if (!choices || submission.values.length === 0 || (choices.selectionMode === "SINGLE" && submission.values.length !== 1)) return false;
  const allowed = new Set(choices.options.map(option => option.value));
  if (new Set(submission.values).size !== submission.values.length || submission.values.some(value => !allowed.has(value))) return false;
  return !submission.values.some(value => choices.options.find(option => option.value === value)?.exclusive) || submission.values.length === 1;
}

/** Server-owned canonical text keeps structured choices on the normal X path. */
export function choiceSubmissionText(submission: XpyChoiceSubmission): string {
  return submission.values.join(" ve ");
}
