export type ContextualAnswerKind = "AFFIRM" | "DECLINE";

export function classifyContextualAnswer(message: string): ContextualAnswerKind | undefined {
  const value = message.trim();
  if (/^(?:evet|doğru|aynen|tamam|olur|olsun|istiyorum|önemli)[.! ]*$/iu.test(value)) return "AFFIRM";
  if (/^(?:hayır|değil|gerek yok|istemiyorum|istemem|olmasın|önemli değil|olmasa da olur)[.! ]*$/iu.test(value)) return "DECLINE";
  return undefined;
}

export function recordAskedQuestion<T extends { readonly askedQuestionKeys: readonly string[]; readonly lastQuestionKey?: string }>(state: T, questionKey: string): T {
  return { ...state, askedQuestionKeys: [...new Set([...state.askedQuestionKeys, questionKey])], lastQuestionKey: questionKey };
}

export type TurnPreflightResult = { readonly kind: "NEW" } | { readonly kind: "REPLAY" } | { readonly kind: "PAYLOAD_CONFLICT" } | { readonly kind: "REVISION_CONFLICT" };

export function preflightTurn(input: { readonly expectedRevision: number; readonly currentRevision: number; readonly priorPayloadFingerprint?: string; readonly payloadFingerprint: string }): TurnPreflightResult {
  if (input.priorPayloadFingerprint !== undefined) return { kind: input.priorPayloadFingerprint === input.payloadFingerprint ? "REPLAY" : "PAYLOAD_CONFLICT" };
  return { kind: input.currentRevision === input.expectedRevision ? "NEW" : "REVISION_CONFLICT" };
}

export function validateBeforeMutation<P>(proposals: readonly P[], validate: (proposals: readonly P[]) => boolean): { readonly kind: "VALID"; readonly proposals: readonly P[] } | { readonly kind: "INVALID" } {
  return validate(proposals) ? { kind: "VALID", proposals } : { kind: "INVALID" };
}
