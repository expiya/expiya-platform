import { createHash } from "node:crypto";

import type { EquipmentFeatureCode } from "@/types/equipmentEvidence";
import type { EquipmentIntentEvaluation, EquipmentIntentMatch, EquipmentQuestionCandidate } from "./equipmentIntentQuestionPolicy.server";

export const EQUIPMENT_SHADOW_EVENT_SCHEMA_VERSION = "equipment-shadow-event-v1.0.0" as const;
export type EquipmentShadowEventType = "EQUIPMENT_PREFERENCE_STATED" | "EQUIPMENT_STRONG_PREFERENCE_STATED" | "EQUIPMENT_REQUIREMENT_STATED"
  | "EQUIPMENT_NEGATIVE_PREFERENCE_STATED" | "EQUIPMENT_PREFERENCE_CLEARED" | "EQUIPMENT_PREFERENCE_SUPERSEDED";
export type EquipmentShadowStrength = "NONE" | "SOFT" | "STRONG" | "HARD" | "NEGATIVE";

export type EquipmentShadowEvent = Readonly<{
  eventId: string; schemaVersion: typeof EQUIPMENT_SHADOW_EVENT_SCHEMA_VERSION; eventType: EquipmentShadowEventType;
  conversationScopeId: string; turnId: string; turnOrder: number; transactionId: string; sequence: number; featureCode: EquipmentFeatureCode;
  operation: "SET" | "CLEAR" | "SUPERSEDE" | "CORRECT"; strength: EquipmentShadowStrength; polarity: "POSITIVE" | "NEGATIVE" | "NONE";
  supersedesEventId: string | null; sourceIntentReasonCodes: readonly string[]; sourceMessageFingerprint: `sha256:${string}`; createdAt: string;
  authority: "SHADOW_ONLY"; publicEffectAllowed: false;
}>;

export type EquipmentShadowFeatureState = Readonly<{
  featureCode: EquipmentFeatureCode; activePreference: boolean; strength: EquipmentShadowStrength; polarity: "POSITIVE" | "NEGATIVE" | "NONE";
  activeEventId: string | null; supersededEventIds: readonly string[]; cleared: boolean; lastUpdatedTurn: number;
  authority: "SHADOW_ONLY"; decisionEffect: "NONE";
}>;

export type EquipmentShadowMemory = Readonly<{
  schemaVersion: typeof EQUIPMENT_SHADOW_EVENT_SCHEMA_VERSION; conversationScopeId: string; events: readonly EquipmentShadowEvent[];
  features: Readonly<Partial<Record<EquipmentFeatureCode, EquipmentShadowFeatureState>>>; pendingClarifications: readonly Readonly<{ turnId: string; featureCode: EquipmentFeatureCode | null; intent: string }>[];
  processedTransactionIds: readonly string[];
  lastAppliedTurn: number; lastAppliedSequence: number; authority: "SHADOW_ONLY"; decisionEffect: "NONE";
}>;

export type EquipmentShadowEventBatch = Readonly<{ schemaVersion: typeof EQUIPMENT_SHADOW_EVENT_SCHEMA_VERSION; transactionId: string;
  conversationScopeId: string; turnId: string; turnOrder: number; events: readonly EquipmentShadowEvent[];
  clarificationDiagnostics: readonly Readonly<{ turnId: string; featureCode: EquipmentFeatureCode | null; intent: string }>[];
  reasonCodes: readonly string[]; valid: boolean }>;

export const createEmptyEquipmentShadowMemory = (conversationScopeId: string): EquipmentShadowMemory => Object.freeze({ schemaVersion: EQUIPMENT_SHADOW_EVENT_SCHEMA_VERSION,
  conversationScopeId, events: Object.freeze([]), features: Object.freeze({}), pendingClarifications: Object.freeze([]), processedTransactionIds: Object.freeze([]), lastAppliedTurn: -1, lastAppliedSequence: -1,
  authority: "SHADOW_ONLY", decisionEffect: "NONE" });

const hash = (value: string): `sha256:${string}` => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const eventType = (match: EquipmentIntentMatch, superseding: boolean): EquipmentShadowEventType => {
  if (superseding && match.intent === "CORRECTION") return "EQUIPMENT_PREFERENCE_SUPERSEDED";
  if (match.intent === "STRONG_PREFERENCE") return "EQUIPMENT_STRONG_PREFERENCE_STATED";
  if (match.intent === "EXPLICIT_REQUIREMENT") return "EQUIPMENT_REQUIREMENT_STATED";
  if (match.intent === "NEGATIVE_PREFERENCE") return "EQUIPMENT_NEGATIVE_PREFERENCE_STATED";
  if (match.intent === "CLEAR_PREFERENCE") return "EQUIPMENT_PREFERENCE_CLEARED";
  return "EQUIPMENT_PREFERENCE_STATED";
};
const mutationIntent = (match: EquipmentIntentMatch) => ["SOFT_PREFERENCE", "STRONG_PREFERENCE", "EXPLICIT_REQUIREMENT", "NEGATIVE_PREFERENCE", "CLEAR_PREFERENCE", "CORRECTION"].includes(match.intent) && Boolean(match.featureCode);
const strength = (match: EquipmentIntentMatch): EquipmentShadowStrength => match.intent === "STRONG_PREFERENCE" ? "STRONG" : match.intent === "EXPLICIT_REQUIREMENT" ? "HARD"
  : match.intent === "NEGATIVE_PREFERENCE" ? "NEGATIVE" : match.intent === "CLEAR_PREFERENCE" ? "NONE" : "SOFT";
const polarity = (match: EquipmentIntentMatch): EquipmentShadowEvent["polarity"] => match.intent === "NEGATIVE_PREFERENCE" ? "NEGATIVE" : match.intent === "CLEAR_PREFERENCE" ? "NONE" : "POSITIVE";

export function createEquipmentShadowEventBatch(input: Readonly<{ memory: EquipmentShadowMemory; evaluation: EquipmentIntentEvaluation; conversationScopeId: string;
  turnId: string; turnOrder: number; createdAt: string }>): EquipmentShadowEventBatch {
  const transactionId = `equipment-shadow-tx-${createHash("sha256").update(`${input.conversationScopeId}|${input.turnId}|${input.evaluation.normalizedUtterance}`).digest("hex").slice(0, 24)}`;
  const messageFingerprint = hash(input.evaluation.normalizedUtterance); const reasons: string[] = [];
  if (input.memory.conversationScopeId !== input.conversationScopeId) reasons.push("CROSS_CONVERSATION_FACTORY_REJECTED");
  const correctionTargets = new Set(input.evaluation.matches.filter((item) => item.intent === "CORRECTION" && item.correctionTarget).map((item) => item.correctionTarget!));
  const relevant = input.evaluation.matches.filter(mutationIntent).filter((item) => !(item.intent !== "CORRECTION" && item.featureCode && correctionTargets.has(item.featureCode)));
  const drafts: Omit<EquipmentShadowEvent, "eventId" | "sequence">[] = [];
  const virtualActive = new Map<EquipmentFeatureCode, string | null>(Object.entries(input.memory.features).map(([code, state]) => [code as EquipmentFeatureCode, state?.activeEventId ?? null]));
  for (const match of relevant) {
    const featureCode = match.featureCode!; const current = input.memory.features[featureCode];
    if (current?.strength === "HARD" && match.intent === "SOFT_PREFERENCE") { reasons.push(`HARD_DOWNGRADE_REQUIRES_EXPLICIT_CORRECTION:${featureCode}`); continue; }
    if (match.intent === "CORRECTION" && match.correctionTarget && match.correctionTarget !== featureCode) {
      const targetId = virtualActive.get(match.correctionTarget) ?? null;
      if (targetId) {
        drafts.push({ schemaVersion: EQUIPMENT_SHADOW_EVENT_SCHEMA_VERSION, eventType: "EQUIPMENT_PREFERENCE_SUPERSEDED", conversationScopeId: input.conversationScopeId,
          turnId: input.turnId, turnOrder: input.turnOrder, transactionId, featureCode: match.correctionTarget, operation: "SUPERSEDE", strength: "NONE", polarity: "NONE",
          supersedesEventId: targetId, sourceIntentReasonCodes: Object.freeze([...match.reasonCodes, "CROSS_FEATURE_CORRECTION_TARGET_CLEARED"]), sourceMessageFingerprint: messageFingerprint,
          createdAt: input.createdAt, authority: "SHADOW_ONLY", publicEffectAllowed: false });
        virtualActive.set(match.correctionTarget, null);
      }
    }
    const supersedesEventId = virtualActive.get(featureCode) ?? current?.activeEventId ?? null;
    const isCorrection = match.intent === "CORRECTION";
    drafts.push({ schemaVersion: EQUIPMENT_SHADOW_EVENT_SCHEMA_VERSION, eventType: eventType(match, Boolean(supersedesEventId)), conversationScopeId: input.conversationScopeId,
      turnId: input.turnId, turnOrder: input.turnOrder, transactionId, featureCode, operation: match.intent === "CLEAR_PREFERENCE" ? "CLEAR" : isCorrection ? "CORRECT" : "SET",
      strength: strength(match), polarity: polarity(match), supersedesEventId, sourceIntentReasonCodes: Object.freeze([...match.reasonCodes]), sourceMessageFingerprint: messageFingerprint,
      createdAt: input.createdAt, authority: "SHADOW_ONLY", publicEffectAllowed: false });
    virtualActive.set(featureCode, "PENDING");
  }
  const events = drafts.map((draft, sequence) => {
    const identity = `${input.conversationScopeId}|${input.turnId}|${sequence}|${draft.featureCode}|${draft.operation}|${draft.strength}|${draft.polarity}|${draft.supersedesEventId ?? "NONE"}|${messageFingerprint}`;
    return Object.freeze({ ...draft, sequence, eventId: `equipment-shadow-event-${createHash("sha256").update(identity).digest("hex").slice(0, 32)}` });
  });
  const clarificationDiagnostics = input.evaluation.matches.filter((item) => ["AMBIGUOUS_EQUIPMENT_INTENT", "UNKNOWN_TERM"].includes(item.intent))
    .map((item) => Object.freeze({ turnId: input.turnId, featureCode: item.featureCode, intent: item.intent }));
  const valid = reasons.every((reason) => reason.startsWith("HARD_DOWNGRADE_REQUIRES"));
  return Object.freeze({ schemaVersion: EQUIPMENT_SHADOW_EVENT_SCHEMA_VERSION, transactionId, conversationScopeId: input.conversationScopeId,
    turnId: input.turnId, turnOrder: input.turnOrder, events: Object.freeze(events), clarificationDiagnostics: Object.freeze(clarificationDiagnostics), reasonCodes: Object.freeze(reasons), valid });
}

export type EquipmentShadowReduceResult = Readonly<{ status: "APPLIED" | "IDEMPOTENT" | "REJECTED"; memory: EquipmentShadowMemory; reasonCodes: readonly string[] }>;
export function applyEquipmentShadowEventBatch(memory: EquipmentShadowMemory, batch: EquipmentShadowEventBatch): EquipmentShadowReduceResult {
  const reject: string[] = [];
  const processed = memory.processedTransactionIds.includes(batch.transactionId);
  if (!batch.valid || batch.schemaVersion !== EQUIPMENT_SHADOW_EVENT_SCHEMA_VERSION) reject.push("BATCH_SCHEMA_OR_FACTORY_INVALID");
  if (memory.conversationScopeId !== batch.conversationScopeId) reject.push("CROSS_CONVERSATION_REJECTED");
  if (batch.events.some((event) => event.schemaVersion !== EQUIPMENT_SHADOW_EVENT_SCHEMA_VERSION || event.authority !== "SHADOW_ONLY" || event.publicEffectAllowed
    || event.conversationScopeId !== batch.conversationScopeId || event.transactionId !== batch.transactionId || event.turnId !== batch.turnId || event.turnOrder !== batch.turnOrder)) reject.push("EVENT_SCHEMA_AUTHORITY_OR_SCOPE_INVALID");
  if (batch.events.some((event, index) => event.sequence !== index)) reject.push("NON_DETERMINISTIC_BATCH_SEQUENCE");
  const known = new Map(memory.events.map((event) => [event.eventId, event]));
  const fresh = batch.events.filter((event) => !known.has(event.eventId));
  const semanticEvent = (event: EquipmentShadowEvent) => JSON.stringify(Object.fromEntries(Object.entries(event).filter(([key]) => key !== "createdAt")));
  if (batch.events.some((event) => known.has(event.eventId) && semanticEvent(known.get(event.eventId)!) !== semanticEvent(event))) reject.push("IDEMPOTENCY_PAYLOAD_CONFLICT");
  if (processed) return reject.length
    ? Object.freeze({ status: "REJECTED", memory, reasonCodes: Object.freeze(reject) })
    : Object.freeze({ status: "IDEMPOTENT", memory, reasonCodes: Object.freeze(["DUPLICATE_RETRY_IGNORED"]) });
  if (batch.turnOrder < memory.lastAppliedTurn) reject.push("OUT_OF_ORDER_REPLAY_REJECTED");
  if (fresh.some((event) => event.turnOrder < memory.lastAppliedTurn || event.turnOrder === memory.lastAppliedTurn && event.sequence <= memory.lastAppliedSequence)) reject.push("OUT_OF_ORDER_REPLAY_REJECTED");
  const activeIds = new Set(Object.values(memory.features).flatMap((state) => state?.activeEventId ? [state.activeEventId] : []));
  if (fresh.some((event) => event.supersedesEventId && !activeIds.has(event.supersedesEventId) && !fresh.some((prior) => prior.eventId === event.supersedesEventId))) reject.push("SUPERSESSION_TARGET_NOT_ACTIVE");
  if (reject.length) return Object.freeze({ status: "REJECTED", memory, reasonCodes: Object.freeze([...new Set(reject)]) });
  if (!fresh.length && !batch.clarificationDiagnostics.length) return Object.freeze({ status: "IDEMPOTENT", memory, reasonCodes: Object.freeze(["DUPLICATE_RETRY_IGNORED"]) });
  const features = { ...memory.features }; const allEvents = [...memory.events];
  for (const event of fresh) {
    const prior = features[event.featureCode]; const superseded = new Set(prior?.supersededEventIds ?? []);
    if (event.supersedesEventId) superseded.add(event.supersedesEventId);
    const cleared = event.operation === "CLEAR" || event.operation === "SUPERSEDE" && event.strength === "NONE";
    features[event.featureCode] = Object.freeze({ featureCode: event.featureCode, activePreference: !cleared, strength: cleared ? "NONE" : event.strength,
      polarity: cleared ? "NONE" : event.polarity, activeEventId: cleared ? null : event.eventId, supersededEventIds: Object.freeze([...superseded]), cleared,
      lastUpdatedTurn: event.turnOrder, authority: "SHADOW_ONLY", decisionEffect: "NONE" });
    allEvents.push(event);
  }
  const pending = [...memory.pendingClarifications, ...batch.clarificationDiagnostics]; const last = fresh.at(-1);
  const next = Object.freeze({ ...memory, events: Object.freeze(allEvents), features: Object.freeze(features), pendingClarifications: Object.freeze(pending),
    processedTransactionIds: Object.freeze([...memory.processedTransactionIds, batch.transactionId]),
    lastAppliedTurn: last?.turnOrder ?? Math.max(memory.lastAppliedTurn, batch.turnOrder), lastAppliedSequence: last?.sequence ?? memory.lastAppliedSequence });
  return Object.freeze({ status: "APPLIED", memory: next, reasonCodes: Object.freeze([]) });
}

export function applyEquipmentShadowMemoryDiagnostics(candidate: EquipmentQuestionCandidate, memory: EquipmentShadowMemory): EquipmentQuestionCandidate {
  const reasons = new Set(candidate.blockedReasonCodes); reasons.add("EQUIPMENT_MEMORY_NO_PUBLIC_AUTHORITY");
  for (const code of candidate.featureCodes) {
    const state = memory.features[code];
    if (state?.cleared) reasons.add("EQUIPMENT_FEATURE_CLEARED");
    else if (state?.activePreference) reasons.add("EQUIPMENT_FEATURE_ALREADY_ANSWERED");
    if (state?.strength === "HARD") reasons.add("EQUIPMENT_REQUIREMENT_RECORDED_SHADOW_ONLY");
    if (memory.pendingClarifications.some((item) => item.featureCode === code || item.featureCode === null)) reasons.add("EQUIPMENT_CLARIFICATION_PENDING");
  }
  return Object.freeze({ ...candidate, blockedReasonCodes: Object.freeze([...reasons].sort()), eligibleForFuturePublicUse: false, publicEffectAllowed: false });
}

export function compareEquipmentShadowMemoryOnOff<T>(publicDecision: T, evaluate: () => unknown) {
  const off = JSON.stringify(publicDecision); const diagnosticSnapshot = evaluate(); const on = JSON.stringify(publicDecision);
  return Object.freeze({ equivalent: off === on, off, on, diagnosticSnapshot });
}
