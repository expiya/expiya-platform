import { describe, expect, it } from "vitest";

import type { ConversationEvent } from "../domain/conversationEvent";
import type { CatalogAuthoritySnapshot } from "../domain/conversationMemory";
import { canonicalize } from "./canonicalize";
import { calculateMemoryFingerprint } from "./memoryFingerprint";
import { CARS_MEMORY_FINGERPRINT_POLICY_V1 } from "./policy";

const catalogAuthority: CatalogAuthoritySnapshot = {
  market: "TR",
  releaseVersion: "release-1",
  catalogFingerprint: "catalog-1",
  manifestFingerprint: "manifest-1",
  activatedAt: "2026-08-16T09:00:00.000Z",
};

function event(id: string, sequence: number): ConversationEvent {
  return {
    schemaVersion: 1,
    conversationId: "conversation-1",
    id,
    sourceMessageId: "message-1",
    sourceTurn: 1,
    sequence,
    createdAt: "2026-08-16T10:00:00.000Z",
    eventType: "SOCIAL_INTERACTION",
    interaction: "SHORT_SOCIAL",
  };
}

function fingerprint(events: readonly ConversationEvent[], authority = catalogAuthority) {
  return calculateMemoryFingerprint({
    conversationId: "conversation-1",
    catalogAuthority: authority,
    events,
    fingerprintPolicy: CARS_MEMORY_FINGERPRINT_POLICY_V1,
  });
}

describe("V2 canonical memory fingerprints", () => {
  it("is insensitive to object key insertion order", () => {
    expect(canonicalize({ b: 2, a: 1 })).toBe(canonicalize({ a: 1, b: 2 }));
  });

  it("is insensitive to persona trait order", () => {
    const common = {
      schemaVersion: 1 as const,
      conversationId: "conversation-1",
      id: "persona",
      sourceMessageId: "message-1",
      sourceTurn: 1,
      sequence: 0,
      createdAt: "2026-08-16T10:00:00.000Z",
      eventType: "PERSONA_ACTIVATED" as const,
      activationSource: "USER_EXPLICIT" as const,
    };
    expect(fingerprint([{ ...common, requestedTraits: ["DESIGN", "VALUE"] }])).toBe(
      fingerprint([{ ...common, requestedTraits: ["VALUE", "DESIGN"] }]),
    );
  });

  it("changes when semantic event order changes", () => {
    expect(fingerprint([event("one", 0), event("two", 1)])).not.toBe(
      fingerprint([event("two", 1), event("one", 0)]),
    );
  });

  it("changes with catalog authority fingerprint", () => {
    expect(fingerprint([])).not.toBe(fingerprint([], { ...catalogAuthority, catalogFingerprint: "catalog-2" }));
  });

  it("does not include an existing memory fingerprint in its payload", () => {
    const input = {
      conversationId: "conversation-1",
      catalogAuthority,
      events: [event("one", 0)],
      fingerprintPolicy: CARS_MEMORY_FINGERPRINT_POLICY_V1,
    };
    expect(calculateMemoryFingerprint(input)).toBe(calculateMemoryFingerprint({ ...input, revealedCandidateIds: [] }));
  });

  it("rejects non-finite numbers and normalizes Unicode strings", () => {
    expect(() => canonicalize({ value: Number.NaN })).toThrow();
    expect(canonicalize({ value: "e\u0301" })).toBe(canonicalize({ value: "é" }));
  });
});
