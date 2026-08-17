import type { ConversationMemory } from "../domain/conversationMemory";
import { canonicalize } from "../fingerprint/canonicalize";
import { calculateDecisionFingerprint } from "../fingerprint/decisionFingerprint";
import { calculateFingerprintForMemory } from "../fingerprint/memoryFingerprint";
import type { FingerprintPolicy } from "../fingerprint/policy";
import { replayConversationMemoryV2 } from "./reducer";

export type MemoryInvariantErrorCode =
  | "CATALOG_AUTHORITY_FINGERPRINT_EMPTY"
  | "MEMORY_TURN_MISMATCH"
  | "MEMORY_DERIVATION_MISMATCH"
  | "MEMORY_FINGERPRINT_MISMATCH"
  | "DECISION_FINGERPRINT_MISMATCH";

export type MemoryInvariantResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly errors: readonly { readonly code: MemoryInvariantErrorCode }[] };

export function validateConversationMemoryV2(memory: ConversationMemory, fingerprintPolicy: FingerprintPolicy): MemoryInvariantResult {
  const errors: { code: MemoryInvariantErrorCode }[] = [];
  if (!memory.catalogAuthority.catalogFingerprint.trim() || !memory.catalogAuthority.manifestFingerprint.trim()) {
    errors.push({ code: "CATALOG_AUTHORITY_FINGERPRINT_EMPTY" });
  }
  if (memory.turn !== (memory.events.at(-1)?.sourceTurn ?? 0)) errors.push({ code: "MEMORY_TURN_MISMATCH" });
  const expectedFingerprint = calculateFingerprintForMemory(memory, fingerprintPolicy);
  if (memory.memoryFingerprint !== expectedFingerprint) errors.push({ code: "MEMORY_FINGERPRINT_MISMATCH" });
  if (memory.decisionFingerprint !== calculateDecisionFingerprint(memory)) errors.push({ code: "DECISION_FINGERPRINT_MISMATCH" });
  try {
    const replayed = replayConversationMemoryV2({
      conversationId: memory.conversationId,
      events: memory.events,
      catalogAuthority: memory.catalogAuthority,
      fingerprintPolicy,
    });
    if (canonicalize(replayed) !== canonicalize(memory)) errors.push({ code: "MEMORY_DERIVATION_MISMATCH" });
  } catch {
    errors.push({ code: "MEMORY_DERIVATION_MISMATCH" });
  }
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}
