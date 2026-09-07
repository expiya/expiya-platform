import { describe, expect, it } from "vitest";
import { buildSmartphonePMaterialityOwnerApproval } from "./smartphonePMaterialityOwnerApproval";

describe("Smartphone P materiality owner approval receipt", () => {
  const result = buildSmartphonePMaterialityOwnerApproval();
  it("binds the exact immutable v2 package", () => {
    const approval = result.artifacts["approval-event.json"];
    expect(approval.bindings.packageDigest).toBe("sha256:3163b47d52ebabc7a451c11ed48caf8e8363cc5bdc7887e72f5ca7ba5110dd72");
    expect(approval.includedAxes).toHaveLength(3);
  });
  it("does not grant Y or operational authority", () => {
    const approval = result.artifacts["approval-event.json"];
    expect(approval.readiness.Y_READY).toBe(false);
    expect(Object.values(approval.exclusions).filter((value) => typeof value === "boolean").every((value) => value === false)).toBe(true);
    expect(approval.featureFlag.defaultEnabled).toBe(false);
  });
  it("is byte deterministic and package-neutral", () => {
    expect(buildSmartphonePMaterialityOwnerApproval().serialized).toEqual(result.serialized);
    expect(result.artifacts["no-effect-proof.json"].packageDigestBefore).toBe(result.artifacts["no-effect-proof.json"].packageDigestAfter);
  });
});
