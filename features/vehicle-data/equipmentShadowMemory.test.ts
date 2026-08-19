import { describe, expect, it } from "vitest";

import { EQUIPMENT_FEATURE_CODES, type EquipmentFeatureCode } from "@/types/equipmentEvidence";
import { evaluateEquipmentUserIntent, type EquipmentQuestionCandidate } from "./equipmentIntentQuestionPolicy.server";
import { EQUIPMENT_TURKISH_ALIASES } from "./equipmentIntentVocabulary";
import { applyEquipmentShadowEventBatch, applyEquipmentShadowMemoryDiagnostics, compareEquipmentShadowMemoryOnOff,
  createEmptyEquipmentShadowMemory, createEquipmentShadowEventBatch, EQUIPMENT_SHADOW_EVENT_SCHEMA_VERSION,
  type EquipmentShadowEventBatch, type EquipmentShadowMemory } from "./equipmentShadowMemory.server";

const at = (turn: number) => `2026-08-20T10:${String(turn).padStart(2, "0")}:00.000Z`;
function runTurn(memory: EquipmentShadowMemory, text: string, turn: number, turnId = `turn-${turn}`) {
  const batch = createEquipmentShadowEventBatch({ memory, evaluation: evaluateEquipmentUserIntent(text, { proposedStrength: "HARD" }),
    conversationScopeId: memory.conversationScopeId, turnId, turnOrder: turn, createdAt: at(turn) });
  return { batch, result: applyEquipmentShadowEventBatch(memory, batch) };
}

describe("equipment shadow event factory and reducer", () => {
  it("creates deterministic, timestamp-independent, text-free events", () => {
    const memory = createEmptyEquipmentShadowMemory("conversation-a");
    const first = createEquipmentShadowEventBatch({ memory, evaluation: evaluateEquipmentUserIntent("CarPlay olsun"), conversationScopeId: "conversation-a", turnId: "t1", turnOrder: 1, createdAt: at(1) });
    const second = createEquipmentShadowEventBatch({ memory, evaluation: evaluateEquipmentUserIntent("CarPlay olsun"), conversationScopeId: "conversation-a", turnId: "t1", turnOrder: 1, createdAt: at(2) });
    expect(first.events[0]?.eventId).toBe(second.events[0]?.eventId);
    expect(first.events[0]).toMatchObject({ schemaVersion: EQUIPMENT_SHADOW_EVENT_SCHEMA_VERSION, eventType: "EQUIPMENT_PREFERENCE_STATED", authority: "SHADOW_ONLY", publicEffectAllowed: false });
    expect(JSON.stringify(first.events[0])).not.toContain("CarPlay olsun");
  });

  it("is idempotent for retry and rejects out-of-order replay", () => {
    const empty = createEmptyEquipmentShadowMemory("c"); const one = runTurn(empty, "CarPlay olsun", 1);
    expect(one.result.status).toBe("APPLIED");
    const retry = applyEquipmentShadowEventBatch(one.result.memory, one.batch);
    expect(retry.status).toBe("IDEMPOTENT"); expect(retry.memory).toBe(one.result.memory);
    const timestampChangedRetry = createEquipmentShadowEventBatch({ memory: empty, evaluation: evaluateEquipmentUserIntent("CarPlay olsun"), conversationScopeId: "c", turnId: "turn-1", turnOrder: 1, createdAt: at(9) });
    expect(applyEquipmentShadowEventBatch(one.result.memory, timestampChangedRetry).status).toBe("IDEMPOTENT");
    const late = runTurn(one.result.memory, "Android Auto olsun", 3).result;
    const oldBatch = createEquipmentShadowEventBatch({ memory: late.memory, evaluation: evaluateEquipmentUserIntent("geri kamera olsun"), conversationScopeId: "c", turnId: "t2", turnOrder: 2, createdAt: at(2) });
    expect(applyEquipmentShadowEventBatch(late.memory, oldBatch)).toMatchObject({ status: "REJECTED", reasonCodes: ["OUT_OF_ORDER_REPLAY_REJECTED"] });
  });

  it("rejects cross-conversation events and invalid batches atomically", () => {
    const a = createEmptyEquipmentShadowMemory("a"); const batch = runTurn(a, "CarPlay olsun ve Android Auto olsun", 1).batch;
    const cross = applyEquipmentShadowEventBatch(createEmptyEquipmentShadowMemory("b"), batch);
    expect(cross.status).toBe("REJECTED"); expect(cross.memory.events).toHaveLength(0);
    const invalid = { ...batch, events: batch.events.map((event, index) => index ? event : { ...event, authority: "PUBLIC" }) } as unknown as EquipmentShadowEventBatch;
    const atomic = applyEquipmentShadowEventBatch(a, invalid);
    expect(atomic.status).toBe("REJECTED"); expect(atomic.memory.events).toHaveLength(0); expect(atomic.memory.features).toEqual({});
  });

  it("enforces strength transitions and terminal invariants", () => {
    let memory = createEmptyEquipmentShadowMemory("transitions");
    memory = runTurn(memory, "CarPlay isterim", 1).result.memory;
    const softId = memory.features.APPLE_CARPLAY?.activeEventId;
    memory = runTurn(memory, "CarPlay kesinlikle olmalı", 2).result.memory;
    expect(memory.features.APPLE_CARPLAY).toMatchObject({ strength: "HARD", polarity: "POSITIVE", activePreference: true });
    expect(memory.features.APPLE_CARPLAY?.supersededEventIds).toContain(softId);
    const hardId = memory.features.APPLE_CARPLAY?.activeEventId;
    const ignored = runTurn(memory, "CarPlay olsa güzel olur", 3);
    expect(ignored.batch.reasonCodes).toContain("HARD_DOWNGRADE_REQUIRES_EXPLICIT_CORRECTION:APPLE_CARPLAY");
    expect(ignored.result.memory.features.APPLE_CARPLAY?.activeEventId).toBe(hardId);
    memory = runTurn(ignored.result.memory, "CarPlay şart değil ama olsa iyi olur", 4).result.memory;
    expect(memory.features.APPLE_CARPLAY).toMatchObject({ strength: "SOFT", polarity: "POSITIVE" });
    expect(memory.features.APPLE_CARPLAY?.supersededEventIds).toContain(hardId);
    memory = runTurn(memory, "CarPlay istemiyorum", 5).result.memory;
    expect(memory.features.APPLE_CARPLAY).toMatchObject({ strength: "NEGATIVE", polarity: "NEGATIVE" });
    memory = runTurn(memory, "CarPlay olsun", 6).result.memory;
    expect(memory.features.APPLE_CARPLAY).toMatchObject({ strength: "SOFT", polarity: "POSITIVE" });
    memory = runTurn(memory, "CarPlay artık önemli değil", 7).result.memory;
    expect(memory.features.APPLE_CARPLAY).toMatchObject({ activePreference: false, activeEventId: null, cleared: true, polarity: "NONE" });
  });

  it("applies cross-feature correction only to its target", () => {
    let memory = createEmptyEquipmentShadowMemory("correction");
    memory = runTurn(memory, "ısıtmalı koltuk olsun ve CarPlay olsun", 1).result.memory;
    const carplayId = memory.features.APPLE_CARPLAY?.activeEventId;
    memory = runTurn(memory, "ısıtmalı koltuk değil, soğutmalı koltuk istiyorum", 2).result.memory;
    expect(memory.features.HEATED_FRONT_SEATS).toMatchObject({ cleared: true, activePreference: false });
    expect(memory.features.VENTILATED_FRONT_SEATS).toMatchObject({ activePreference: true, strength: "SOFT" });
    expect(memory.features.APPLE_CARPLAY?.activeEventId).toBe(carplayId);
  });

  it("handles bounded correction examples without feature leakage", () => {
    let memory = createEmptyEquipmentShadowMemory("bounded-corrections");
    memory = runTurn(memory, "360 kamera şart", 1).result.memory;
    memory = runTurn(memory, "360 kameradan vazgeçtim, geri görüş kamerası yeter", 2).result.memory;
    expect(memory.features.SURROUND_VIEW_CAMERA_360).toMatchObject({ cleared: true });
    expect(memory.features.REAR_VIEW_CAMERA).toMatchObject({ activePreference: true });
    memory = runTurn(memory, "CarPlay istemiyorum", 3).result.memory;
    memory = runTurn(memory, "CarPlay istemiyorum demiştim ama fikrimi değiştirdim", 4).result.memory;
    expect(memory.features.APPLE_CARPLAY).toMatchObject({ polarity: "POSITIVE", strength: "SOFT" });
    memory = runTurn(memory, "adaptif cruise şart", 5).result.memory;
    const corrected = runTurn(memory, "adaptif cruise şart değil, normal hız sabitleyici olsun", 6);
    expect(corrected.result.memory.features.ADAPTIVE_CRUISE_CONTROL).toMatchObject({ cleared: true });
    expect(corrected.result.memory.pendingClarifications.at(-1)).toMatchObject({ featureCode: null, intent: "UNKNOWN_TERM" });
  });

  it("keeps multi-feature state independent", () => {
    let memory = createEmptyEquipmentShadowMemory("multi");
    memory = runTurn(memory, "CarPlay şart, Android Auto önemli değil", 1).result.memory;
    expect(memory.features.APPLE_CARPLAY?.strength).toBe("HARD");
    expect(memory.features.ANDROID_AUTO).toMatchObject({ cleared: true, activePreference: false });
    memory = runTurn(memory, "park sensörü olsun, otomatik park gerekmiyor", 2).result.memory;
    expect(memory.features.AUTOMATIC_PARK_ASSIST).toMatchObject({ cleared: true });
    expect(memory.features.FRONT_PARKING_SENSORS).toBeUndefined(); expect(memory.features.REAR_PARKING_SENSORS).toBeUndefined();
  });

  it("does not create preference events from questions, ambiguity or unknown terms", () => {
    let memory = createEmptyEquipmentShadowMemory("non-mutation");
    for (const [index, text] of ["ACC ne demek?", "kör nokta uyarısı ne işe yarar?", "güvenli araba", "hayalet ekran olsun"].entries()) {
      const outcome = runTurn(memory, text, index + 1); expect(outcome.batch.events).toHaveLength(0); memory = outcome.result.memory;
    }
    expect(memory.events).toHaveLength(0); expect(memory.pendingClarifications).toHaveLength(2);
  });
});

const fixtureCodes = EQUIPMENT_FEATURE_CODES.slice(0, 10);
type Fixture = { id: string; code: EquipmentFeatureCode; turns: readonly string[]; expected: "HARD" | "SOFT" | "NEGATIVE" | "CLEARED" | "NONE" };
const fixtures: Fixture[] = fixtureCodes.flatMap((code) => {
  const phrase = EQUIPMENT_TURKISH_ALIASES[code][0];
  return [
    { id: `${code}-soft-hard`, code, turns: [`${phrase} isterim`, `${phrase} benim için önemli`, `${phrase} kesinlikle olmalı`], expected: "HARD" },
    { id: `${code}-negative-positive`, code, turns: [`${phrase} istemiyorum`, "günlük kullanım önemli", `${phrase} olsun`], expected: "SOFT" },
    { id: `${code}-clear-restate`, code, turns: [`${phrase} olsun`, `${phrase} önemli değil`, `${phrase} yine olsun`], expected: "SOFT" },
    { id: `${code}-repeat`, code, turns: [`${phrase} olsun`, `${phrase} isterim`, `${phrase} tercih ederim`], expected: "SOFT" },
    { id: `${code}-strong-clear`, code, turns: [`${phrase} benim için önemli`, "bir düşüneyim", `${phrase} fark etmez`], expected: "CLEARED" },
    { id: `${code}-hard-soft-blocked`, code, turns: [`${phrase} şart`, `${phrase} olsun`, `${phrase} isterim`], expected: "HARD" },
    { id: `${code}-hard-soft-correction`, code, turns: [`${phrase} şart`, "fikrimi değerlendiriyorum", `${phrase} şart değil ama olsa iyi olur`], expected: "SOFT" },
    { id: `${code}-concept-then-preference`, code, turns: [`${phrase} nedir?`, "anladım", `${phrase} olsun`], expected: "SOFT" },
    { id: `${code}-benefit-no-state`, code, turns: [`${phrase} ne işe yarar?`, "emin değilim", "hayalet ekran olsun"], expected: "NONE" },
    { id: `${code}-clear-only`, code, turns: ["teknolojisi iyi olsun", `${phrase} önemli değil`, "güvenli araba"], expected: "CLEARED" },
  ];
});

describe("100 unique multi-turn equipment shadow conversations", () => {
  it("contains exactly 100 unique 3-turn fixtures", () => {
    expect(fixtures).toHaveLength(100); expect(new Set(fixtures.map((fixture) => fixture.id)).size).toBe(100);
    expect(fixtures.every((fixture) => fixture.turns.length >= 2 && fixture.turns.length <= 5)).toBe(true);
  });

  it.each(fixtures)("replays $id deterministically", (fixture) => {
    let memory = createEmptyEquipmentShadowMemory(fixture.id);
    for (const [index, text] of fixture.turns.entries()) {
      const outcome = runTurn(memory, text, index + 1); expect(outcome.result.status).not.toBe("REJECTED"); memory = outcome.result.memory;
      for (const state of Object.values(memory.features)) {
        if (!state) continue;
        expect(state.authority).toBe("SHADOW_ONLY"); expect(state.decisionEffect).toBe("NONE");
        if (state.cleared) expect(state.activeEventId).toBeNull();
        if (state.activePreference) expect(state.polarity).not.toBe("NONE");
      }
    }
    const state = memory.features[fixture.code];
    if (fixture.expected === "NONE") expect(state).toBeUndefined();
    else if (fixture.expected === "CLEARED") expect(state).toMatchObject({ cleared: true, activePreference: false });
    else expect(state?.strength).toBe(fixture.expected);
    expect(new Set(memory.events.map((event) => event.eventId)).size).toBe(memory.events.length);
  });

  it("produces the expected supersession distribution across the fixture corpus", () => {
    let supersessions = 0;
    for (const fixture of fixtures) {
      let memory = createEmptyEquipmentShadowMemory(fixture.id);
      for (const [index, text] of fixture.turns.entries()) memory = runTurn(memory, text, index + 1).result.memory;
      supersessions += memory.events.filter((event) => event.supersedesEventId).length;
    }
    expect(supersessions).toBe(80);
  });
});

describe("equipment memory/question and decision-neutrality diagnostics", () => {
  const question = Object.freeze({ questionId: "q", featureCodes: Object.freeze(["APPLE_CARPLAY"]), stage: "SOFT_DIFFERENTIATION", selectionMode: "SINGLE",
    options: Object.freeze([]), materiality: "MATERIAL", coverageDiagnostic: Object.freeze({}), eligibleForFuturePublicUse: false,
    blockedReasonCodes: Object.freeze([]), decisionAuthority: "SHADOW_ONLY", publicEffectAllowed: false }) as EquipmentQuestionCandidate;

  it("adds memory reason codes without granting question authority", () => {
    let memory = createEmptyEquipmentShadowMemory("q-memory"); memory = runTurn(memory, "CarPlay şart", 1).result.memory;
    const diagnostic = applyEquipmentShadowMemoryDiagnostics(question, memory);
    expect(diagnostic.blockedReasonCodes).toEqual(expect.arrayContaining(["EQUIPMENT_FEATURE_ALREADY_ANSWERED", "EQUIPMENT_REQUIREMENT_RECORDED_SHADOW_ONLY", "EQUIPMENT_MEMORY_NO_PUBLIC_AUTHORITY"]));
    expect(diagnostic.eligibleForFuturePublicUse).toBe(false);
  });

  it("keeps the complete production decision snapshot byte-equivalent", () => {
    const production = Object.freeze({ memoryEvents: ["production-event"], constraints: ["body"], usageProjection: "FAMILY", technicalCandidates: ["a", "b"],
      affordability: { a: true }, ranking: ["a", "b"], readiness: "READY", publicQuestion: "usage", action: "ASK", offer: null, consent: "NONE",
      cards: [], publicMessage: "Değişmedi", authorizedFacts: ["fact"] });
    const comparison = compareEquipmentShadowMemoryOnOff(production, () => {
      let memory = createEmptyEquipmentShadowMemory("neutral"); memory = runTurn(memory, "CarPlay şart", 1).result.memory; return memory;
    });
    expect(comparison.equivalent).toBe(true); expect(comparison.on).toBe(comparison.off);
  });
});
