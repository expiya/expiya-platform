import { describe, expect, it } from "vitest";
import { buildSmartphonePMaterialityActivationPreflightClosure } from "./smartphonePMaterialityActivationPreflightClosure";

describe("Smartphone P materiality activation preflight closure", () => {
  const result = buildSmartphonePMaterialityActivationPreflightClosure();
  it("binds exact production, candidate and closure source authority", () => {
    expect(result.artifacts["preflight.json"]).toMatchObject({ status: "ELIGIBLE_FOR_SEPARATE_ATOMIC_ACTIVATION_AUTHORIZATION", readiness: { INFORMATION_READY: true, P_READY: true, Y_READY: false } });
  });
  it("plans only one default-off flag activation and preserves all other authority", () => {
    expect(result.artifacts["activation-plan.json"]).toMatchObject({ status: "PLANNED_NOT_AUTHORIZED_NOT_EXECUTED", operation: { onlyFeatureFlag: "SMARTPHONE_P_MATERIALITY_V1", from: false, to: true, atomic: true }, mutationBoundary: { executed: false, pointer: false, runtime: false, database: false, push: false, preview: false, deployment: false } });
  });
  it("keeps conditional deployment blocked until an activation receipt exists", () => {
    expect(result.artifacts["deployment-approval-receipt.json"]).toMatchObject({ status: "RECEIVED_CONDITIONAL_NOT_EXECUTABLE", activationReceiptPresent: false, deploymentPerformed: false });
  });
  it("is deterministic and carries a separate exact activation sentence", () => {
    expect(buildSmartphonePMaterialityActivationPreflightClosure().serialized).toEqual(result.serialized);
    expect(result.activationAuthorizationSentence).toContain((result.artifacts["preflight.json"] as { preflightDigest: string }).preflightDigest);
  });
});
