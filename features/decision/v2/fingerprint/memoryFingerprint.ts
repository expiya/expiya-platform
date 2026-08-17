import { createHash } from "node:crypto";

import type { ConversationEvent } from "../domain/conversationEvent";
import type { CatalogAuthoritySnapshot, ConversationMemory } from "../domain/conversationMemory";
import { canonicalize } from "./canonicalize";
import type { FingerprintPolicy } from "./policy";

export interface MemoryFingerprintPayload {
  readonly payloadSchemaVersion: 1;
  readonly fingerprintPolicy: FingerprintPolicy;
  readonly conversationId: string;
  readonly catalogAuthority: CatalogAuthoritySnapshot;
  readonly events: readonly ConversationEvent[];
  readonly canonicalSetValues: {
    readonly personaTraits: readonly string[];
    readonly revealedCandidateIds: readonly string[];
  };
}

export function canonicalizeMemoryFingerprintPayload(input: {
  readonly conversationId: string;
  readonly catalogAuthority: CatalogAuthoritySnapshot;
  readonly events: readonly ConversationEvent[];
  readonly personaTraits?: readonly string[];
  readonly revealedCandidateIds?: readonly string[];
  readonly fingerprintPolicy: FingerprintPolicy;
}): string {
  const canonicalEvents: readonly ConversationEvent[] = input.events.map((event) => event.eventType === "PERSONA_ACTIVATED"
    ? { ...event, requestedTraits: [...new Set(event.requestedTraits)].sort() as [typeof event.requestedTraits[number], ...typeof event.requestedTraits[number][]] }
    : event);
  const payload: MemoryFingerprintPayload = {
    payloadSchemaVersion: 1,
    fingerprintPolicy: input.fingerprintPolicy,
    conversationId: input.conversationId,
    catalogAuthority: input.catalogAuthority,
    events: canonicalEvents,
    canonicalSetValues: {
      personaTraits: [...new Set(input.personaTraits ?? [])].sort(),
      revealedCandidateIds: [...new Set(input.revealedCandidateIds ?? [])].sort(),
    },
  };
  return canonicalize(payload);
}

export function hashCanonicalPayload(canonicalPayload: string): string {
  return `sha256:${createHash("sha256").update(canonicalPayload, "utf8").digest("hex")}`;
}

export function calculateMemoryFingerprint(input: Parameters<typeof canonicalizeMemoryFingerprintPayload>[0]): string {
  return hashCanonicalPayload(canonicalizeMemoryFingerprintPayload(input));
}

export function calculateFingerprintForMemory(memory: ConversationMemory, fingerprintPolicy: FingerprintPolicy): string {
  return calculateMemoryFingerprint({
    conversationId: memory.conversationId,
    catalogAuthority: memory.catalogAuthority,
    events: memory.events,
    personaTraits: memory.persona.requestedTraits,
    revealedCandidateIds: memory.revealedCandidateIds,
    fingerprintPolicy,
  });
}
