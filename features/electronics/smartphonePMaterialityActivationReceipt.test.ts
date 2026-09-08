import { describe, expect, it } from "vitest";
import { buildSmartphonePMaterialityActivationReceipt } from "./smartphonePMaterialityActivationReceipt";

describe("Smartphone P materiality activation receipt", () => {
  const result = buildSmartphonePMaterialityActivationReceipt();
  it("records one successful source activation with no production-side mutation", () => {
    expect(result.receipt).toMatchObject({ status: "SUCCESS_LOCAL_SOURCE_ACTIVATION", operation: { onlyFeatureFlag: "SMARTPHONE_P_MATERIALITY_V1", from: false, to: true, atomic: true }, readiness: { P_READY: true, Y_READY: false }, productionEffect: "NONE_UNTIL_SEPARATELY_AUTHORIZED_DEPLOYMENT" });
    expect(Object.values(result.receipt.mutationBoundary).every((value) => value === false)).toBe(true);
  });
  it("is deterministic and binds rollback to the receipt", () => {
    expect(buildSmartphonePMaterialityActivationReceipt().serialized).toEqual(result.serialized);
    expect(result.rollback).toMatchObject({ status: "READY_NOT_EXECUTED", activationReceiptDigest: result.receipt.receiptDigest, operation: "SMARTPHONE_P_MATERIALITY_V1=false" });
  });
});
