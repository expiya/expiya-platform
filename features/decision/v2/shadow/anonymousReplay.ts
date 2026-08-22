import { createHmac } from "node:crypto";

export interface AnonymousShadowTurnInput {
  readonly conversationId: string;
  readonly messageId: string;
  readonly userText: string;
  readonly providerCalled: boolean;
  readonly deterministicallyResolved: boolean;
  readonly wrongMutation: boolean;
  readonly repeatedQuestion: boolean;
  readonly hardFilterViolation: boolean;
  readonly overBudgetOffer: boolean;
  readonly revokeRequired: boolean;
  readonly revokeSucceeded: boolean;
  readonly unauthorizedCard: boolean;
  readonly correctionLost: boolean;
}

export interface AnonymousShadowReplayRecord extends Omit<AnonymousShadowTurnInput, "conversationId" | "messageId" | "userText"> {
  readonly anonymousConversationId: string;
  readonly anonymousMessageId: string;
  readonly redactedText: string;
  readonly redactionCount: number;
  readonly sourceTextStored: false;
}

const piiPatterns = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,
  /(?<!\d)(?:\+?90\s*)?(?:0?5\d{2})[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}(?!\d)/gu,
  /\bTR\d{2}(?:\s?\d{4}){5}\s?\d{2}\b/giu,
  /\b\d{11}\b/gu,
  /\b(?:\d[ -]*?){13,19}\b/gu,
  /\bhttps?:\/\/[^\s]+/giu,
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/gu,
] as const;

const redact = (text: string): Readonly<{ text: string; count: number }> => {
  let count = 0;
  const redacted = piiPatterns.reduce((value, pattern) => value.replace(pattern, () => { count += 1; return "[REDACTED]"; }), text).trim();
  return Object.freeze({ text: redacted, count });
};
const anonymousId = (secret: string, namespace: string, value: string) => `anon:${createHmac("sha256", secret).update(`${namespace}:${value}`).digest("hex")}`;

export function createAnonymousShadowReplayRecord(input: AnonymousShadowTurnInput, secret: string): AnonymousShadowReplayRecord {
  if (secret.length < 32) throw new Error("SHADOW_REPLAY_HMAC_SECRET_TOO_SHORT");
  if (!input.conversationId.trim() || !input.messageId.trim() || input.userText.length > 10_000) throw new Error("SHADOW_REPLAY_INPUT_INVALID");
  const redacted = redact(input.userText);
  return Object.freeze({
    anonymousConversationId: anonymousId(secret, "conversation", input.conversationId),
    anonymousMessageId: anonymousId(secret, "message", input.messageId), redactedText: redacted.text, redactionCount: redacted.count, sourceTextStored: false,
    providerCalled: input.providerCalled, deterministicallyResolved: input.deterministicallyResolved,
    wrongMutation: input.wrongMutation, repeatedQuestion: input.repeatedQuestion,
    hardFilterViolation: input.hardFilterViolation, overBudgetOffer: input.overBudgetOffer,
    revokeRequired: input.revokeRequired, revokeSucceeded: input.revokeSucceeded,
    unauthorizedCard: input.unauthorizedCard, correctionLost: input.correctionLost,
  });
}

export function evaluateAnonymousShadowReplay(records: readonly AnonymousShadowReplayRecord[], policy: Readonly<{ minimumTurnCount?: number; maximumWrongMutationRate?: number; maximumRepeatedQuestionRate?: number }> = {}) {
  const count = records.length;
  const rate = (predicate: (record: AnonymousShadowReplayRecord) => boolean) => count === 0 ? 0 : records.filter(predicate).length / count;
  const revokeRequired = records.filter((record) => record.revokeRequired);
  const minimumTurnCount = policy.minimumTurnCount ?? 1;
  const maximumWrongMutationRate = policy.maximumWrongMutationRate ?? 0;
  const maximumRepeatedQuestionRate = policy.maximumRepeatedQuestionRate ?? 0.02;
  const wrongMutationRate = rate((record) => record.wrongMutation);
  const repeatedQuestionRate = rate((record) => record.repeatedQuestion);
  const issueCodes = Object.freeze([
    ...(count < minimumTurnCount ? ["INSUFFICIENT_SHADOW_SAMPLE"] : []),
    ...(wrongMutationRate > maximumWrongMutationRate ? ["WRONG_MUTATION_RATE_EXCEEDED"] : []),
    ...(repeatedQuestionRate > maximumRepeatedQuestionRate ? ["REPEATED_QUESTION_RATE_EXCEEDED"] : []),
    ...(records.some((record) => record.hardFilterViolation) ? ["HARD_FILTER_VIOLATION"] : []),
    ...(records.some((record) => record.overBudgetOffer) ? ["OVER_BUDGET_OFFER"] : []),
    ...(records.some((record) => record.unauthorizedCard) ? ["UNAUTHORIZED_CARD"] : []),
    ...(records.some((record) => record.correctionLost) ? ["CORRECTION_LOST"] : []),
    ...(records.some((record) => record.revokeRequired && !record.revokeSucceeded) ? ["OFFER_REVOKE_FAILED"] : []),
  ]);
  return Object.freeze({ schemaVersion: "1.1.0", turnCount: count,
    providerCallRate: rate((record) => record.providerCalled), deterministicResolutionRate: rate((record) => record.deterministicallyResolved),
    wrongMutationRate, repeatedQuestionRate,
    hardFilterViolationCount: records.filter((record) => record.hardFilterViolation).length,
    overBudgetOfferCount: records.filter((record) => record.overBudgetOffer).length,
    offerRevokeSuccessRate: revokeRequired.length === 0 ? 1 : revokeRequired.filter((record) => record.revokeSucceeded).length / revokeRequired.length,
    unauthorizedCardCount: records.filter((record) => record.unauthorizedCard).length,
    correctionLostCount: records.filter((record) => record.correctionLost).length,
    issueCodes,
    deploymentDisposition: issueCodes.length > 0 ? "BLOCKED" as const : "READY" as const,
  });
}
