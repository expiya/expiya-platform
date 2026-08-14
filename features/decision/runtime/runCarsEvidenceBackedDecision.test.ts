import { describe, expect, it } from "vitest";

import { populateDecisionContext } from "@/features/decision/context/population/populateDecisionContext";
import { generatedVehicleEvidenceReadPort } from "@/features/vehicle-evidence/generatedVehicleEvidenceReadPort";
import type { VehicleEvidenceReadPort } from "@/types/runtimeVehicleEvidence";
import { deriveCarsEvidenceBackedRequirements, runCarsEvidenceBackedDecision } from "./runCarsEvidenceBackedDecision";

describe("runCarsEvidenceBackedDecision", () => {
  it("bridges realistic populated user context into atomic seats and cargo constraints", () => {
    const population = populateDecisionContext({ current: null, candidates: [
      { id: "need", target: "decisionNeed", value: "Ailem için bir araç seç", provenance: "EXPLICIT_USER", source: { kind: "USER_INPUT", referenceId: "turn-1" } },
      { id: "constraint", target: "userContext.constraints", value: "En az 7 koltuk ve minimum 300 litre bagaj gerekli", provenance: "EXPLICIT_USER", source: { kind: "USER_INPUT", referenceId: "turn-1" } },
    ] });
    expect(population.ok).toBe(true);
    if (!population.ok) return;
    expect(deriveCarsEvidenceBackedRequirements(population.context).requirements).toEqual([
      expect.objectContaining({ factKey: "seats", predicate: "AT_LEAST", value: 7, materiality: "HARD_CONSTRAINT" }),
      expect.objectContaining({ factKey: "cargo_volume_l", predicate: "AT_LEAST", value: 300, materiality: "HARD_CONSTRAINT" }),
    ]);
  });

  it("selects IONIQ 9 as the unique authorized evidence-backed decision", () => {
    const result = runCarsEvidenceBackedDecision({ query: "Ailem için en az 7 koltuk ve minimum 300 litre bagaj gerekli. En iyi seçeneği seç.", vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort });
    expect(result.status).toBe("DECISION_READY");
    expect(result.selectedRuntimeVehicleCandidateId).toBe("RVC-PILOT-0001");
    expect(result.selectedVehicle).toMatchObject({ brand: "Hyundai", model: "IONIQ 9" });
    expect(result.recommendationAuthorization).toEqual({ authorized: true, authorizedCandidateIds: ["RVC-PILOT-0001"] });
    expect(result.candidateEvaluations.map((item) => [item.runtimeVehicleCandidateId, item.disposition])).toEqual([
      ["RVC-PILOT-0001", "ELIGIBLE"], ["RVC-PILOT-0002", "ELIMINATED_BY_MATERIAL_CONSTRAINT"],
      ["RVC-PILOT-0003", "ELIMINATED_BY_MATERIAL_CONSTRAINT"], ["RVC-PILOT-0004", "NOT_EVALUABLE"],
      ["RVC-PILOT-0005", "NOT_EVALUABLE"],
    ]);
    expect(result.explanationInput).toEqual(["seats=7", "cargo_volume_l=338"]);
    expect(result.userFacingExplanation).toContain("7 koltuk");
    expect(result.userFacingExplanation).toContain("338 L bagaj");
    expect(result.userFacingExplanation).not.toMatch(/yakıt|güvenlik|konfor|performans/i);
  });

  it("does not fabricate a winner when Captur and Yaris Cross are both authorized", () => {
    const result = runCarsEvidenceBackedDecision({ query: "En az 5 koltuk ve minimum 350 litre bagaj istiyorum.", vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort });
    expect(result.status).toBe("NEEDS_MORE_USER_CONTEXT");
    expect(result.selectedRuntimeVehicleCandidateId).toBeUndefined();
    expect(result.recommendationAuthorization.authorizedCandidateIds).toEqual(["RVC-PILOT-0002", "RVC-PILOT-0003"]);
    expect(result.followUpQuestion).toContain("ayırt edici");
  });

  it("preserves range uncertainty and missing seats as NOT_EVALUABLE", () => {
    const range = runCarsEvidenceBackedDecision({ query: "Minimum 550 litre bagaj istiyorum.", vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort });
    const captur = range.candidateEvaluations.find((item) => item.runtimeVehicleCandidateId === "RVC-PILOT-0002");
    expect(captur?.requirements[0].result).toBe("NOT_EVALUABLE");
    expect(captur?.disposition).toBe("NOT_EVALUABLE");

    const seats = runCarsEvidenceBackedDecision({ query: "En az 7 koltuk ve minimum 300 litre bagaj gerekli.", vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort });
    expect(seats.candidateEvaluations.find((item) => item.runtimeVehicleCandidateId === "RVC-PILOT-0004")?.requirements[0].result).toBe("NOT_EVALUABLE");
    expect(seats.candidateEvaluations.find((item) => item.runtimeVehicleCandidateId === "RVC-PILOT-0005")?.requirements[0].result).toBe("NOT_EVALUABLE");
  });

  it("does not select unknown candidates for an impossible requirement", () => {
    const result = runCarsEvidenceBackedDecision({ query: "En az 8 koltuk istiyorum.", vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort });
    expect(result.status).toBe("INSUFFICIENT_VEHICLE_EVIDENCE");
    expect(result.selectedRuntimeVehicleCandidateId).toBeUndefined();
    expect(result.recommendationAuthorization.authorizedCandidateIds).toEqual([]);
  });

  it("fails closed for an unavailable or authority-mismatched artifact", () => {
    expect(runCarsEvidenceBackedDecision({ query: "En az 7 koltuk istiyorum." }).status).toBe("INSUFFICIENT_VEHICLE_EVIDENCE");
    const mismatched: VehicleEvidenceReadPort = {
      ...generatedVehicleEvidenceReadPort,
      getArtifactIdentity: () => ({ ...generatedVehicleEvidenceReadPort.getArtifactIdentity(), artifactHash: "0".repeat(64) }),
    };
    expect(runCarsEvidenceBackedDecision({ query: "En az 7 koltuk istiyorum.", vehicleEvidenceReadPort: mismatched }).status).toBe("INSUFFICIENT_VEHICLE_EVIDENCE");
  });

  it("asks for user thresholds without inventing one or converting party size into seats", () => {
    const cargo = runCarsEvidenceBackedDecision({ query: "Bagaj benim için önemli.", vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort });
    expect(cargo.materialRequirements).toEqual([]);
    expect(cargo.followUpQuestion).toContain("Minimum bir bagaj hacmi");
    const family = runCarsEvidenceBackedDecision({ query: "Biz 5 kişiyiz, aile için araç seç.", vehicleEvidenceReadPort: generatedVehicleEvidenceReadPort });
    expect(family.materialRequirements).toEqual([]);
    expect(family.followUpQuestion).toContain("kaç kişilik koltuk");
  });
});
