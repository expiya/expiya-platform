import { createHash } from "node:crypto";

import type { ConstraintEvent } from "../domain/constraint";
import type { ConversationEvent, ModelReferenceEvent } from "../domain/conversationEvent";
import type { ConversationMemory } from "../domain/conversationMemory";
import type { CandidateRejectionEvent } from "../domain/rejection";
import { canonicalize } from "./canonicalize";
import { CARS_DECISION_FINGERPRINT_POLICY_V1 } from "./policy";

export type DecisionFingerprint = string;

function activeConstraints(events: readonly ConversationEvent[]) {
  const constraints = events.filter((event): event is ConstraintEvent => event.eventType === "CONSTRAINT");
  const supersededIds = new Set(constraints.flatMap((event) => event.supersedesId ? [event.supersedesId] : []));
  return constraints
    .filter((event) => !supersededIds.has(event.id) && event.status === "ACTIVE" && ["HARD_FILTER", "STRONG_RANK", "SOFT_RANK"].includes(event.decisionEffect))
    .map((event) => ({
      id: event.id, kind: event.kind, field: event.field, normalizedValue: event.normalizedValue,
      confidence: event.confidence, authority: event.authority, decisionEffect: event.decisionEffect,
      hardFilterPolicy: event.hardFilterPolicy,
    }))
    .sort((left, right) => left.field.localeCompare(right.field) || left.id.localeCompare(right.id));
}

function rejectionScopes(events: readonly ConversationEvent[]) {
  return events
    .filter((event): event is CandidateRejectionEvent => event.eventType === "CANDIDATE_REJECTION")
    .map((event) => ({
      id: event.id, candidateId: event.candidateId, familyId: event.familyId, brandId: event.brandId,
      scope: event.scope, reason: event.reason, scopeExplicitlyRequested: event.scopeExplicitlyRequested,
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function decisionModelReferences(events: readonly ConversationEvent[]) {
  return events
    .filter((event): event is ModelReferenceEvent => event.eventType === "MODEL_REFERENCE" && event.decisionEffect !== "LOOKUP_ONLY")
    .map((event) => ({
      id: event.id, referenceId: event.referenceId, normalizedBrand: event.normalizedBrand,
      normalizedModel: event.normalizedModel, resolution: event.resolution, decisionEffect: event.decisionEffect,
      resolvedFamilyIds: [...event.resolvedFamilyIds].sort(), resolvedVariantIds: [...event.resolvedVariantIds].sort(),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function canonicalizeDecisionFingerprintPayload(memory: Omit<ConversationMemory, "decisionFingerprint">): string {
  return canonicalize({
    payloadSchemaVersion: CARS_DECISION_FINGERPRINT_POLICY_V1.payloadSchemaVersion,
    fingerprintPolicy: CARS_DECISION_FINGERPRINT_POLICY_V1,
    conversationId: memory.conversationId,
    catalogFingerprint: memory.catalogAuthority.catalogFingerprint,
    decisionScope: { vehicleScope: "CARS", acquisitionScope: "PINNED_CATALOG_SNAPSHOT" },
    activeConstraints: activeConstraints(memory.events),
    budget: memory.budget,
    persona: memory.persona.activated
      ? { ...memory.persona, requestedTraits: [...memory.persona.requestedTraits].sort() }
      : memory.persona,
    rejectionScopes: rejectionScopes(memory.events),
    decisionModelReferences: decisionModelReferences(memory.events),
  });
}

export function calculateDecisionFingerprint(memory: Omit<ConversationMemory, "decisionFingerprint">): DecisionFingerprint {
  return `sha256:${createHash("sha256").update(canonicalizeDecisionFingerprintPayload(memory), "utf8").digest("hex")}`;
}
