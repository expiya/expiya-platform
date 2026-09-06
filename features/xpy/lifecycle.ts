/** X interruption rule: a non-mutating response cannot consume P's pending question. */
export function preservePendingQuestion<T extends object>(prior: { readonly lastQuestionKey?: string }, next: T): T & { readonly lastQuestionKey?: string } {
  return prior.lastQuestionKey ? { ...next, lastQuestionKey: prior.lastQuestionKey } : next;
}

export type XpyQuestionDeferralKind = "UNKNOWN" | "SKIP" | "DEFER";

/** P owns the platform meaning; packs decide whether a particular question is deferrable. */
export function classifyQuestionDeferral(message: string): XpyQuestionDeferralKind | undefined {
  const value = message.trim();
  if (/^(?:bilmiyorum|emin değilim|kararsızım)[.! ]*$/iu.test(value)) return "UNKNOWN";
  if (/^(?:geçelim|bunu geç|bu soruyu geçelim)[.! ]*$/iu.test(value)) return "SKIP";
  if (/^(?:sonra sor|sonra dönelim|şimdilik ertele|erteleyelim)[.! ]*$/iu.test(value)) return "DEFER";
  return undefined;
}

export function nextUnaskedQuestion<T extends { readonly key: string }>(questions: readonly T[], asked: readonly string[], deferred: readonly string[] = []): T | undefined {
  const excluded = new Set([...asked, ...deferred]);
  return questions.find((question) => !excluded.has(question.key));
}
