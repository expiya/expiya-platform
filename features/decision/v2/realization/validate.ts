import type { NaturalRealizationResult, RealizationInput, RealizationValidation, RealizationValidationCode } from "./types";

const lower = (value: string) => value.toLocaleLowerCase("tr-TR");
const numbers = (value: string) => value.match(/\d[\d.,]*/gu) ?? [];
export function validateNaturalRealization(input: RealizationInput, result: NaturalRealizationResult): RealizationValidation {
  const codes: RealizationValidationCode[] = []; const message = result.message.trim(); if (!message) codes.push("EMPTY_MESSAGE");
  if (/(?:değerlendirmeyi tamamladım|isteğini (?:güvenli biçimde )?değerlendirebilirim)/iu.test(message) && !input.directAnswer && !input.materialQuestion && !["EXPLAIN_CONFLICT", "SOCIAL_REPLY", "END_POLITELY"].includes(input.actionDecision.nextAction.type)) codes.push("GENERIC_COMPLETION_WITHOUT_EFFECT");
  if (input.actionDecision.nextAction.type === "REQUEST_REVEAL_CONSENT" && !/(?:görmek ister misin|göstereyim mi|paylaşayım mı|seçenekleri açayım mı)\??/iu.test(message)) codes.push("ACTION_MISMATCH");
  const authorizedFacts = new Map(input.explanationFacts.map((fact) => [fact.id, fact])); const actionFactIds = new Set([...input.actionDecision.explanationFactIds, ...(input.directAnswer?.factIds ?? [])]);
  for (const id of result.usedExplanationFactIds) if (!authorizedFacts.has(id) || !actionFactIds.has(id)) codes.push("FACT_NOT_AUTHORIZED");
  const mentionable = new Set(input.mentionableCandidates.map((candidate) => candidate.candidateId)); for (const id of result.mentionedCandidateIds) if (!mentionable.has(id)) codes.push("CANDIDATE_NOT_AUTHORIZED");
  if (input.revealableCandidates.length || (input.actionDecision.nextAction.type === "REQUEST_REVEAL_CONSENT" && result.mentionedCandidateIds.length)) codes.push("REVEAL_NOT_ALLOWED");
  if (input.materialQuestion) { if (result.renderedQuestionId === undefined) codes.push("ACTION_MISMATCH"); if (result.renderedQuestionId !== undefined && result.renderedQuestionId !== input.materialQuestion.id) codes.push("QUESTION_NOT_AUTHORIZED"); if (result.renderedQuestionId === input.materialQuestion.id && input.materialQuestion.options.some((option) => lower(message).includes(lower(option.userFacingLabel)))) codes.push("QUESTION_OPTIONS_REPEATED"); }
  else if (result.renderedQuestionId !== undefined) codes.push("QUESTION_NOT_AUTHORIZED");
  if (!input.materialQuestion && input.actionDecision.nextAction.type !== "REQUEST_REVEAL_CONSENT" && /\?/u.test(message)) codes.push("QUESTION_NOT_AUTHORIZED");
  if (input.actionDecision.nextAction.type === "ASK_MATERIAL_QUESTION" && result.renderedQuestionId !== input.materialQuestion?.id) codes.push("ACTION_MISMATCH");
  if (input.directAnswer) { const answerIndex = message.indexOf(input.directAnswer.safeText); if (answerIndex !== 0) codes.push("DIRECT_ANSWER_NOT_FIRST"); }
  const usedFacts = result.usedExplanationFactIds.map((id) => authorizedFacts.get(id)).filter((fact) => fact !== undefined); const allowedNumbers = new Set([...usedFacts.flatMap((fact) => fact.authorizedNumericTokens ?? []), ...numbers(input.directAnswer?.safeText ?? ""), ...(input.materialQuestion?.options.flatMap((option) => numbers(option.userFacingLabel)) ?? [])]); for (const token of numbers(message)) if (!allowedNumbers.has(token)) codes.push("UNAUTHORIZED_NUMBER");
  const approximate = usedFacts.some((fact) => fact.kind === "APPROXIMATE_BUDGET"); if (approximate && !input.safetyPolicy.approximateQualifiers.some((term) => lower(message).includes(lower(term)))) codes.push("APPROXIMATE_QUALIFIER_MISSING"); if (approximate && !input.safetyPolicy.nonVerifiedPriceQualifiers.some((term) => lower(message).includes(lower(term)))) codes.push("NON_VERIFIED_PRICE_QUALIFIER_MISSING");
  const personaFacts = usedFacts.filter((fact) => fact.kind === "PERSONA"); if (/\b(persona|sportif karakter|tasarım odaklı karakter|prestijli karakter)\b/iu.test(message) && !personaFacts.some((fact) => fact.personaActive)) codes.push("PERSONA_NOT_AUTHORIZED");
  if (input.safetyPolicy.forbiddenTerms.some((term) => lower(message).includes(lower(term)))) codes.push("FORBIDDEN_JARGON"); if (input.safetyPolicy.stereotypeTerms.some((term) => lower(message).includes(lower(term)))) codes.push("FORBIDDEN_STEREOTYPE");
  for (const term of input.safetyPolicy.unsupportedClaimTerms) if (lower(message).includes(lower(term)) && !usedFacts.some((fact) => lower(fact.safeText).includes(lower(term)))) codes.push("UNSUPPORTED_CLAIM");
  if (input.actionDecision.nextState === "ABUSE_WARNING" && /\b(salak|aptal|gerizekalı)\b/iu.test(message)) codes.push("ABUSE_MIRRORING"); if (input.actionDecision.nextState === "OFF_TOPIC_RECOVERY" && input.actionDecision.nextAction.type === "END_POLITELY") codes.push("STATE_ACTION_MISMATCH");
  return Object.freeze({ ok: codes.length === 0, codes: Object.freeze([...new Set(codes)]) });
}
