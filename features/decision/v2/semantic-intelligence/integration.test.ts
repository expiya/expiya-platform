import { describe, expect, it } from "vitest";
import type { CatalogSnapshot } from "../catalog/types";
import { V2_DECISION_FIELD_REGISTRY_V1 } from "../filter/registry";
import { interpretDeterministicAutomotiveSemanticAnswer, interpretUserMessageWithAutomotiveSemantics } from "../interpretation/service";
import type { AutomotiveSemanticResult } from "./types";

const catalog = { authority: { releaseVersion: "0.55.4", catalogFingerprint: "sha256:catalog" }, variants: Array.from({ length: 4 }, (_, index) => ({ id: `v${index}`, decisionFacts: { bodyStyle: { value: index % 2 ? "SUV" : "Sedan" }, powertrain: { fuelType: { value: "HEV" }, transmission: { value: "Automatic" }, powerKw: { value: 120 } }, dimensions: { seats: { value: 5 } }, efficiency: {} } })) } as unknown as CatalogSnapshot;
const emptyInterpretation = (messageId: string) => ({ schemaVersion: 1 as const, messageId, acts: ["VEHICLE_INTENT" as const], directAnswerRequests: [], constraintMutations: [], budgetMutations: [], modelReferences: [], personaMutations: [], corrections: [], ambiguities: [] });
const semantics = (confirmationStatus: "CONFIRMED_BY_USER" | "UNCONFIRMED_HYPOTHESIS"): AutomotiveSemanticResult => ({ schemaVersion: "ASIL-0.1", messageId: "m", concepts: [{ id: "performance", concept: "PERFORMANCE_ORIENTED_VEHICLE", polarity: "POSITIVE", sourceSpan: "performans arabası", explicitness: confirmationStatus === "CONFIRMED_BY_USER" ? "USER_EXPLICIT" : "INFERRED_SUBDIMENSION", confidence: 0.95, confirmationStatus, projectionHint: { fieldId: "powerKw", normalizedValue: { operator: "MINIMUM", value: 150 } } }], archetypes: [], analogies: [], qualitativeNeeds: [], ambiguities: [], candidateInterpretations: [], requestedFacts: [], conversationalAct: "VEHICLE_DISCOVERY", providerStatus: "AVAILABLE" });

describe("ASIL conversation interpretation bridge", () => {
  it.each([["Düzenli yolcu taşıma ve çok koltuklu kullanım", "PASSENGER_TRANSPORT"], ["Yük ve eşya taşıma odaklı ticari kullanım", "GENERAL_CARGO"]] as const)("compiles an authorized semantic option without another provider ambiguity: %s", (text, scenario) => {
    const plan = interpretDeterministicAutomotiveSemanticAnswer({ messageId: "answer", userText: text, fieldRegistry: V2_DECISION_FIELD_REGISTRY_V1 });
    expect(plan?.acceptedConstraintMutations).toEqual([expect.objectContaining({ fieldId: "usageScenario", normalizedValue: scenario })]);
  });
  it("does not let an unconfirmed hypothesis become a decision mutation", async () => {
    const plan = await interpretUserMessageWithAutomotiveSemantics({ model: { interpret: async () => emptyInterpretation("m") }, semanticModel: { interpretAutomotiveSemantics: async () => semantics("UNCONFIRMED_HYPOTHESIS") }, messageId: "m", userText: "performans arabası", fieldRegistry: V2_DECISION_FIELD_REGISTRY_V1, catalog });
    expect(plan.acceptedConstraintMutations).toEqual([]);
    expect(plan.automotiveSemantics?.concepts[0]?.concept).toBe("PERFORMANCE_ORIENTED_VEHICLE");
    expect(plan.semanticCompilation?.decisionImpact).toBe("NONE");
  });

  it("fails closed to an ambiguity when both semantic and interpretation providers are unavailable", async () => {
    const plan = await interpretUserMessageWithAutomotiveSemantics({ model: { interpret: async () => { throw new Error("offline"); } }, semanticModel: { interpretAutomotiveSemantics: async () => { throw new Error("offline"); } }, messageId: "m", userText: "Vito tarzı", fieldRegistry: V2_DECISION_FIELD_REGISTRY_V1, catalog });
    expect(plan.result.ambiguities).toEqual([expect.objectContaining({ code: "OPEN_AUTOMOTIVE_MEANING_REQUIRES_PROVIDER_OR_CONFIRMATION" })]);
    expect(plan.acceptedConstraintMutations).toEqual([]);
  });
});
