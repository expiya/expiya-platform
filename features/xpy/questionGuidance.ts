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
