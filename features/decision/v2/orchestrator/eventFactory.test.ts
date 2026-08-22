import { describe, expect, it } from "vitest";
import { createConversationEventsFromInterpretation } from "./eventFactory";
import { loadActiveProductionSnapshotForTest } from "../catalog/productionSnapshotFixture.testSupport";

const turn = { conversationId: "conversation", messageId: "message", idempotencyKey: "key", expectedConversationRevision: 0, userMessage: "Sedan dedim", requestTime: "2026-08-19T00:00:00.000Z" } as const;

describe("deterministic interpretation event factory", () => {
  it("records a decision-neutral turn without establishing vehicle intent", () => {
    const interpretation = { authorityBoundary: "AUTHORITATIVE_SEMANTIC_PLAN", result: { acts: [], modelReferences: [] }, acceptedConstraintMutations: [], acceptedBudgetMutations: [], acceptedPersonaMutations: [] } as never;
    const events = createConversationEventsFromInterpretation({ turn: { ...turn, userMessage: "Belirsiz bir devam cümlesi." }, interpretation, catalog: {} as never });
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe("TURN_RECORDED");
    expect(events.some((event) => event.eventType === "VEHICLE_INTENT_ESTABLISHED")).toBe(false);
  });
  it("creates stable IDs/order and preserves abuse plus correction", () => {
    const interpretation = { authorityBoundary: "AUTHORITATIVE_SEMANTIC_PLAN", result: { acts: ["ABUSE", "CORRECTION"], modelReferences: [], abuseSignal: { detected: true } }, acceptedConstraintMutations: [{ operation: "CORRECT", fieldId: "bodyStyle", normalizedValue: { operator: "EQUALS", value: "Sedan" }, explicitness: "EXPLICIT_REQUIREMENT", confidence: 1, sourceSpan: "Sedan dedim", deterministicDecisionUse: "HARD_CANDIDATE" }], acceptedBudgetMutations: [], acceptedPersonaMutations: [] } as never;
    const first = createConversationEventsFromInterpretation({ turn, interpretation, catalog: {} as never }); const second = createConversationEventsFromInterpretation({ turn, interpretation, catalog: {} as never });
    expect(second).toEqual(first); expect(first.map((event) => event.eventType)).toEqual(["CONSTRAINT", "ABUSE"]); expect(first.map((event) => event.sequence)).toEqual([0, 1]);
  });
  it("recovers an exact catalog family preference when the provider omits the model reference", async () => {
    const loaded = await loadActiveProductionSnapshotForTest(); expect(loaded.status).toBe("READY"); if (loaded.status !== "READY") return;
    const interpretation = { authorityBoundary: "AUTHORITATIVE_SEMANTIC_PLAN", result: { acts: ["VEHICLE_INTENT", "RECOMMENDATION_REQUEST"], modelReferences: [] }, acceptedConstraintMutations: [], acceptedBudgetMutations: [], acceptedPersonaMutations: [] } as never;
    const events = createConversationEventsFromInterpretation({ turn: { ...turn, userMessage: "BYD Dolphin Comfort 2025 almak istiyorum." }, interpretation, catalog: loaded.snapshot });
    expect(events.find((event) => event.eventType === "MODEL_REFERENCE")).toMatchObject({ resolution: "EXACT_MODEL_FAMILY", decisionEffect: "PREFERENCE", normalizedBrand: "BYD", normalizedModel: "DOLPHIN" });
  });
  it("supersedes a provider lookup polluted with trim and model year when canonical family text is present", async () => {
    const loaded = await loadActiveProductionSnapshotForTest(); expect(loaded.status).toBe("READY"); if (loaded.status !== "READY") return;
    const interpretation = { authorityBoundary: "AUTHORITATIVE_SEMANTIC_PLAN", result: { acts: ["MODEL_LOOKUP_REQUEST", "RECOMMENDATION_REQUEST"], modelReferences: [{ rawText: "BYD Dolphin Comfort 2025", parsedBrandText: "BYD", parsedModelText: "Dolphin Comfort 2025", purpose: "LOOKUP_ONLY" }] }, acceptedConstraintMutations: [], acceptedBudgetMutations: [], acceptedPersonaMutations: [] } as never;
    const events = createConversationEventsFromInterpretation({ turn: { ...turn, userMessage: "BYD Dolphin Comfort 2025 almak istiyorum ve başlangıç noktası olarak öner" }, interpretation, catalog: loaded.snapshot });
    const references = events.filter((event) => event.eventType === "MODEL_REFERENCE");
    expect(references).toHaveLength(1);
    expect(references[0]).toMatchObject({ resolution: "EXACT_MODEL_FAMILY", decisionEffect: "PREFERENCE", normalizedBrand: "BYD", normalizedModel: "DOLPHIN" });
  });
  it("recovers a catalog brand preference without inventing a model", async () => {
    const loaded = await loadActiveProductionSnapshotForTest(); expect(loaded.status).toBe("READY"); if (loaded.status !== "READY") return;
    const interpretation = { authorityBoundary: "AUTHORITATIVE_SEMANTIC_PLAN", result: { acts: ["RECOMMENDATION_REQUEST"], modelReferences: [] }, acceptedConstraintMutations: [], acceptedBudgetMutations: [], acceptedPersonaMutations: [] } as never;
    const events = createConversationEventsFromInterpretation({ turn: { ...turn, userMessage: "BYD istiyorum" }, interpretation, catalog: loaded.snapshot });
    expect(events.find((event) => event.eventType === "MODEL_REFERENCE")).toMatchObject({ resolution: "BRAND_ONLY", decisionEffect: "PREFERENCE", normalizedBrand: "BYD" });
  });
  it("records a possible catalog typo as confirmation-only without candidate authority", async () => {
    const loaded = await loadActiveProductionSnapshotForTest(); expect(loaded.status).toBe("READY"); if (loaded.status !== "READY") return;
    const interpretation = { authorityBoundary: "AUTHORITATIVE_SEMANTIC_PLAN", result: { acts: ["MODEL_LOOKUP_REQUEST"], modelReferences: [{ rawText: "BYD Dolpin", parsedBrandText: "BYD", parsedModelText: "Dolpin", purpose: "LOOKUP_ONLY" }] }, acceptedConstraintMutations: [], acceptedBudgetMutations: [], acceptedPersonaMutations: [] } as never;
    const events = createConversationEventsFromInterpretation({ turn: { ...turn, userMessage: "BYD Dolpin var mı?" }, interpretation, catalog: loaded.snapshot });
    expect(events.find((event) => event.eventType === "MODEL_REFERENCE")).toMatchObject({
      resolution: "POSSIBLE_TYPO", decisionEffect: "LOOKUP_ONLY", resolvedFamilyIds: [], resolvedVariantIds: [], suggestedCanonicalNames: ["BYD DOLPHIN"],
    });
  });
});
