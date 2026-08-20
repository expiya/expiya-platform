import { createHash } from "node:crypto";

import type { ConversationEvent } from "../domain/conversationEvent";
import { canonicalize } from "../fingerprint/canonicalize";
import type { DecisionTurnV2Input, DecisionTurnV2Output, V2ConversationStore, V2TurnStages } from "./types";
import { publicOptions, publicOptionSelection } from "./types";

export class V2TurnConflictError extends Error {
  constructor(readonly code: "MESSAGE_PAYLOAD_CONFLICT" | "REVISION_CONFLICT") { super(code); }
}

const eventId = (messageId: string, sequence: number, type: string) => `v2e_${createHash("sha256").update(`${messageId}:${sequence}:${type}`).digest("hex").slice(0, 24)}`;

type TurnStage = "LOAD" | "CATALOG" | "OFFER_RESPONSE" | "INTERPRET" | "EVENTS" | "MEMORY" | "EVALUATE" | "CARDS" | "REALIZE" | "COMMIT";

async function runTurnStage<T>(stage: TurnStage, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const safeDetail = error instanceof Error && /^[A-Z0-9_:,-]{1,100}$/u.test(error.message) ? `:${error.message}` : "";
    throw new TypeError(`V2_TURN_STAGE_${stage}${safeDetail}`);
  }
}

function runTurnSyncStage<T>(stage: TurnStage, operation: () => T): T {
  try {
    return operation();
  } catch {
    throw new TypeError(`V2_TURN_STAGE_${stage}`);
  }
}

export async function runCarsDecisionTurnV2(input: DecisionTurnV2Input, dependencies: { readonly store: V2ConversationStore; readonly stages: V2TurnStages }): Promise<DecisionTurnV2Output> {
  const prior = await runTurnStage("LOAD", () => dependencies.store.load(input.conversationId));
  const payloadHash = canonicalize({ messageId: input.messageId, userMessage: input.userMessage, typedOptionId: input.typedOptionId, typedOptionIds: input.typedOptionIds, offerToken: input.offerToken, recommendationOfferAuditIntent: input.recommendationOfferAuditIntent ? { kind: input.recommendationOfferAuditIntent.kind, offerId: input.recommendationOfferAuditIntent.offerId, recommendationTermsVersion: input.recommendationOfferAuditIntent.recommendationTermsVersion, acceptanceSequence: 1, revealSequence: 2, idempotencyKey: input.recommendationOfferAuditIntent.idempotencyKey } : undefined });
  const replay = prior?.messageResults[input.messageId];
  if (replay) {
    if (replay.payloadHash !== payloadHash) throw new V2TurnConflictError("MESSAGE_PAYLOAD_CONFLICT");
    return replay.output;
  }
  if ((prior?.revision ?? 0) !== input.expectedConversationRevision) throw new V2TurnConflictError("REVISION_CONFLICT");
  const now = new Date(input.requestTime);
  if (!Number.isFinite(now.getTime())) throw new TypeError("INVALID_REQUEST_TIME");
  const catalog = await runTurnStage("CATALOG", () => dependencies.stages.loadCatalog({ memory: prior?.memory, now }));
  if (catalog.status !== "READY") return { conversationId: input.conversationId, revision: prior?.revision ?? 0, state: "CONFLICT", message: "Katalog şu anda güvenli biçimde kullanılamıyor. Yeni katalogla yeniden başlatma seçeneği sunabilirim.", options: [], cards: [], recoverableStatus: catalog.reason === "CATALOG_SNAPSHOT_UNAVAILABLE" ? "CATALOG_SNAPSHOT_UNAVAILABLE" : "CATALOG_UNAVAILABLE" };

  const deterministicOfferResponse = dependencies.stages.interpretOfferResponse
    ? await runTurnStage("OFFER_RESPONSE", () => dependencies.stages.interpretOfferResponse!(input, prior?.memory))
    : undefined;
  const interpretation = deterministicOfferResponse ?? await runTurnStage("INTERPRET", () => dependencies.stages.interpret(input, prior?.memory));
  const events = runTurnSyncStage("EVENTS", () => dependencies.stages.createEvents({ turn: input, interpretation, previous: prior?.memory, catalog: catalog.snapshot }));
  const memory = runTurnSyncStage("MEMORY", () => dependencies.stages.reduceMemory({ previous: prior?.memory, events, catalog: catalog.snapshot }));
  const evaluated = await runTurnStage("EVALUATE", () => dependencies.stages.evaluate({ turn: input, memory, catalog: catalog.snapshot, interpretation, now }));

  const postEvents: ConversationEvent[] = [];
  const postBase = { schemaVersion: 1 as const, conversationId: input.conversationId, sourceMessageId: input.messageId, sourceTurn: memory.turn, createdAt: input.requestTime };
  if (evaluated.offer) {
    const sequence = events.length + postEvents.length;
    postEvents.push({ ...postBase, id: eventId(input.messageId, sequence, "OFFER_LIFECYCLE"), sequence, eventType: "OFFER_LIFECYCLE", offerId: evaluated.offer.offerId, lifecycleState: "CREATED", offer: { offerId: evaluated.offer.offerId, mode: evaluated.offer.mode === "TRIM_COMPARISON" ? "TRIM_COMPARISON" : "FAMILY_DIVERSE", candidates: evaluated.offer.candidateRefs.map((candidate, index) => ({ exactVariantId: candidate.exactVariantId, modelFamilyId: candidate.modelFamilyId, authorizationId: `${evaluated.offer!.offerId}:${index}`, eligibility: candidate.finalDisposition === "TECHNICALLY_ELIGIBLE_PRICE_UNRESOLVED" ? "TECHNICALLY_ELIGIBLE_PRICE_UNVERIFIED" : "FULLY_ELIGIBLE" })), explicitTrimComparisonRequested: evaluated.offer.mode === "TRIM_COMPARISON", explicitPriceUnverifiedConsent: evaluated.offer.mode === "PRICE_UNRESOLVED_ALTERNATIVES", catalogFingerprint: evaluated.offer.catalogFingerprint, decisionFingerprint: evaluated.offer.decisionFingerprint, expiresAt: evaluated.offer.expiresAt, lifecycleState: "CREATED" } });
  }
  if (evaluated.offerTransition) {
    if (evaluated.offerTransition.to === "REVEALED") {
      const transition = evaluated.offerTransition;
      if (!(Date.parse(transition.acceptedAt) < Date.parse(transition.revealedAt)) || transition.acceptanceSequence >= transition.revealSequence) throw new TypeError("REC_AUDIT_TEMPORAL_INVARIANT_FAILED");
      const acceptanceSequence = events.length + postEvents.length;
      const acceptanceEventId = `rece_${createHash("sha256").update(`${transition.conversationId}:${transition.offerId}:${transition.recommendationTermsVersion}:${transition.idempotencyKey}:RECOMMENDATION_TERMS_ACCEPTED`).digest("hex").slice(0, 24)}`;
      postEvents.push({ ...postBase, createdAt: transition.acceptedAt, id: acceptanceEventId, sequence: acceptanceSequence, eventType: "RECOMMENDATION_TERMS_ACCEPTED", offerId: transition.offerId, recommendationTermsVersion: transition.recommendationTermsVersion, acceptedAt: transition.acceptedAt, auditSequence: 1, actor: "USER", authority: "SERVER_RECORDED_USER_ACCEPTANCE", decisionEffect: "AUTHORIZATION_ONLY", predecessorLifecycleState: "CREATED", idempotencyKey: transition.idempotencyKey, payloadFingerprint: `sha256:${createHash("sha256").update(canonicalize({ conversationId: transition.conversationId, offerId: transition.offerId, recommendationTermsVersion: transition.recommendationTermsVersion, idempotencyKey: transition.idempotencyKey })).digest("hex")}` });
      const consentSequence = events.length + postEvents.length;
      postEvents.push({ ...postBase, createdAt: transition.acceptedAt, id: eventId(input.messageId, consentSequence, "OFFER_CONSENTED"), sequence: consentSequence, eventType: "OFFER_LIFECYCLE", offerId: transition.offerId, lifecycleState: "CONSENTED" });
      const revealSequence = events.length + postEvents.length;
      postEvents.push({ ...postBase, createdAt: transition.revealedAt, id: `rece_${createHash("sha256").update(`${transition.conversationId}:${transition.offerId}:${transition.recommendationTermsVersion}:${transition.idempotencyKey}:OFFER_REVEALED`).digest("hex").slice(0, 24)}`, sequence: revealSequence, eventType: "OFFER_REVEALED", offerId: transition.offerId, revealedAt: transition.revealedAt, auditSequence: 2, acceptanceEventId, acceptanceAuditSequence: 1, recommendationTermsVersion: transition.recommendationTermsVersion, actor: "SYSTEM", authority: "SERVER_OFFER_LIFECYCLE", decisionEffect: "AUTHORIZATION_ONLY", resultingLifecycleState: "REVEALED", catalogReleaseVersion: catalog.snapshot.authority.releaseVersion, catalogFingerprint: catalog.snapshot.authority.catalogFingerprint, offerIdentityFingerprint: transition.offerIdentityFingerprint, idempotencyKey: transition.idempotencyKey });
    }
    const sequence = events.length + postEvents.length;
    postEvents.push({ ...postBase, createdAt: evaluated.offerTransition.to === "REVEALED" ? evaluated.offerTransition.revealedAt : evaluated.offerTransition.at, id: eventId(input.messageId, sequence, "OFFER_LIFECYCLE"), sequence, eventType: "OFFER_LIFECYCLE", offerId: evaluated.offerTransition.offerId, lifecycleState: evaluated.offerTransition.to });
  }
  if (evaluated.action.directAnswerObligation) {
    const sequence = events.length + postEvents.length;
    postEvents.push({ ...postBase, id: eventId(input.messageId, sequence, "DIRECT_ANSWER_FULFILLED"), sequence, eventType: "DIRECT_ANSWER_FULFILLED", obligation: evaluated.action.directAnswerObligation.kind });
  }
  if (evaluated.action.materialQuestion) {
    const priorOpenQuestion = [...memory.materialQuestionHistory].reverse().find((item) => item.answerStatus === "OPEN");
    if (priorOpenQuestion && priorOpenQuestion.stableSemanticKey !== evaluated.action.materialQuestion.stableSemanticKey) {
      const dispositionSequence = events.length + postEvents.length;
      postEvents.push({ ...postBase, id: eventId(input.messageId, dispositionSequence, "MATERIAL_QUESTION_DISPOSITION"), sequence: dispositionSequence, eventType: "MATERIAL_QUESTION_DISPOSITION", questionId: priorOpenQuestion.questionId, stableSemanticKey: priorOpenQuestion.stableSemanticKey, status: "SUPERSEDED" });
    }
    if (priorOpenQuestion?.stableSemanticKey !== evaluated.action.materialQuestion.stableSemanticKey) {
      const sequence = events.length + postEvents.length;
      const question = evaluated.action.materialQuestion;
      postEvents.push({ ...postBase, id: eventId(input.messageId, sequence, "MATERIAL_QUESTION_ASKED"), sequence, eventType: "MATERIAL_QUESTION_ASKED", questionId: question.id, stableSemanticKey: question.stableSemanticKey, field: question.field });
    }
  }
  const finalMemory = postEvents.length ? runTurnSyncStage("MEMORY", () => dependencies.stages.reduceMemory({ previous: memory, events: postEvents, catalog: catalog.snapshot })) : memory;
  const allEvents = Object.freeze([...events, ...postEvents]);
  const requiresPostCommitCards = evaluated.offerTransition?.to === "REVEALED" && evaluated.offerTransition.postCommitAuthorizationRequired;
  const cards = input.offerToken && dependencies.stages.authorizeCards && !requiresPostCommitCards ? await runTurnStage("CARDS", () => dependencies.stages.authorizeCards!({ token: input.offerToken!, conversationId: input.conversationId, catalog: catalog.snapshot, memory: finalMemory, now })) : [];
  const realized = await runTurnStage("REALIZE", () => dependencies.stages.realize({ action: evaluated.action, facts: evaluated.facts }));
  const revision = (prior?.revision ?? 0) + 1;
  const optionSelection = publicOptionSelection(evaluated.action);
  const output: DecisionTurnV2Output = Object.freeze({ conversationId: input.conversationId, revision, state: evaluated.action.nextState, message: realized.message || "Bu adımı güvenli biçimde tamamlayamadım; yeniden deneyebiliriz.", options: publicOptions(evaluated.action), ...(optionSelection ? { optionSelection } : {}), cards: Object.freeze([...cards]), ...(evaluated.offer && evaluated.offerToken ? { offer: { offerId: evaluated.offer.offerId, token: evaluated.offerToken, expiresAt: evaluated.offer.expiresAt } } : {}) });
  const next = { conversationId: input.conversationId, revision, memory: finalMemory, messageResults: { ...(prior?.messageResults ?? {}), [input.messageId]: { payloadHash, output } } };
  const committed = await runTurnStage("COMMIT", () => dependencies.store.commit({ expectedRevision: input.expectedConversationRevision, next, events: allEvents, offer: evaluated.offer, offerTransition: evaluated.offerTransition }));
  if (committed.status !== "OK") throw new V2TurnConflictError("REVISION_CONFLICT");
  return output;
}
