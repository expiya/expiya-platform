import { describe, expect, it } from "vitest";

import { generatedVehicleEvidenceReadPort } from "@/features/vehicle-evidence/generatedVehicleEvidenceReadPort";
import { runCarsEvidenceBackedDecision } from "@/features/decision/runtime/runCarsEvidenceBackedDecision";
import type { CarsConversationTrace, CarsRequirementLedgerEntry } from "@/types/carsConversation";

import { applyExpandedCoverageBridge } from "./carsExpandedCoverageBridge";
import { applyHardBudgetGate } from "./applyCarsHardBudgetGate";
import { emptyConversationTrace, extractDeterministicFacts, upsertRequirement } from "./carsRequirementLedger";

function memory(facts: readonly { key: CarsRequirementLedgerEntry["key"]; value: string | number; sourceText: string }[]): CarsConversationTrace {
  const entries = new Map<CarsRequirementLedgerEntry["key"], CarsRequirementLedgerEntry>();
  facts.forEach((fact, index) => upsertRequirement(entries, { ...fact, sourceTurn: index + 1 }));
  return { ...emptyConversationTrace(), requirements: [...entries.values()] };
}

function base() {
  return runCarsEvidenceBackedDecision({ query: "En az 1 koltuk.", vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort });
}

describe("expanded advisor coverage bridge", () => {
  it("normalizes Turkish word party size as usable capacity and supersedes correction", () => {
    expect(extractDeterministicFacts("Dört kişilik aileyiz.")).toContainEqual({ key: "PARTY_SIZE", value: 4 });
    const trace = memory([
      { key: "PARTY_SIZE", value: 4, sourceText: "Dört kişiyiz" },
      { key: "PARTY_SIZE", value: 5, sourceText: "Düzeltme: beş kişiyiz" },
    ]);
    expect(trace.requirements.find((entry) => entry.key === "PARTY_SIZE")).toMatchObject({ value: 5, previousValue: 4, evaluability: "EVALUABLE_NOW" });
  });

  it("filters automatic hatchbacks, excludes Clio, and selects the shortest then narrowest governed candidate", () => {
    const trace = memory([
      { key: "TRANSMISSION", value: "AUTOMATIC", sourceText: "Otomatik olsun" },
      { key: "BODY_TYPE", value: "HATCHBACK", sourceText: "Hatchback" },
      { key: "SIZE_PREFERENCE", value: "COMPACT_EXTERIOR", sourceText: "Küçük dış ölçüler" },
    ]);
    const decision = applyExpandedCoverageBridge({ result: base(), memory: trace, query: "Clio dışında net bir alternatif söyle" });
    expect(decision.result.selectedRuntimeVehicleCandidateId).toBe("RVC-PILOT-0007");
    expect(decision.result.recommendationAuthorization.authorized).toBe(true);
    expect(decision.trace.filters.find((item) => item.kind === "EXCLUDE_CLIO_ANCHOR")?.after).not.toContain("RVC-PILOT-0006");
    expect(decision.trace.discriminator).toBe("COMPACT_FOOTPRINT_LENGTH_THEN_WIDTH");
  });

  it("applies SUV body and soft cargo to select Captur without inventing comfort rank", () => {
    const trace = memory([
      { key: "PARTY_SIZE", value: 4, sourceText: "Dört kişilik aile" },
      { key: "BODY_TYPE", value: "SUV_CROSSOVER", sourceText: "SUV/crossover" },
      { key: "BUDGET_MAX_TRY", value: 3_000_000, sourceText: "Bütçem en fazla 3 milyon" },
      { key: "EQUIPMENT_LEVEL", value: "COMFORT", sourceText: "Konfor öncelikli" },
    ]);
    const decision = applyExpandedCoverageBridge({ result: applyHardBudgetGate(base(), trace).result, memory: trace, query: "Bagajı küçük olmasın; konfor öncelikli" });
    expect(decision.result.selectedRuntimeVehicleCandidateId).toBe("RVC-PILOT-0002");
    expect(decision.trace.discriminator).toBe("MAX_CARGO");
    expect(decision.result.userFacingExplanation).not.toMatch(/en konforlu|sessiz|yumuşak/iu);
  });
});
