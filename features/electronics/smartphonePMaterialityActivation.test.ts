import { describe, expect, it } from "vitest";
import { SMARTPHONE_P_MATERIALITY_ACTIVATION_AUTHORITY, SMARTPHONE_P_MATERIALITY_SOURCE_ACTIVATED } from "./smartphonePMaterialityActivation";

describe("Smartphone P materiality source activation", () => {
  it("activates only the approved flag while keeping Y false and production unchanged before deployment", () => {
    expect(SMARTPHONE_P_MATERIALITY_SOURCE_ACTIVATED).toBe(true);
    expect(SMARTPHONE_P_MATERIALITY_ACTIVATION_AUTHORITY).toMatchObject({
      preflightDigest: "sha256:5f471c4aeb7fc9ef03fefedb86888c5fce8d8aed79d73da96b2fcd10bab11fc0",
      closureSourceCommit: "154aed971d717d01b9cbe885ae08bf45a4d4bdd6",
      flag: "SMARTPHONE_P_MATERIALITY_V1",
      from: false,
      to: true,
      yReady: false,
      productionEffectBeforeDeployment: "NONE",
    });
  });
});
