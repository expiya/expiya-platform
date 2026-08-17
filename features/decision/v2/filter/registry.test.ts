import { describe, expect, it } from "vitest";
import { V2_DECISION_FIELD_REGISTRY_V1 } from "./registry";

describe("V2 decision field registry", () => {
  it("keeps technical hard fields closed and subjective/affordability fields out", () => {
    const fields = new Map(V2_DECISION_FIELD_REGISTRY_V1.fields.map((field) => [field.fieldId, field]));
    expect(fields.get("cargoVolumeLitres")?.decisionUse).toBe("HARD_FILTER_ALLOWED");
    expect(fields.get("price")?.decisionUse).toBe("DEFERRED_TO_AFFORDABILITY");
    expect(fields.get("persona")?.decisionUse).toBe("NOT_FOR_FILTERING");
    expect(fields.get("cargoCapacityClass")?.decisionUse).toBe("NOT_FOR_FILTERING");
    expect(fields.get("fuelType")?.enumValues).toEqual(["GASOLINE", "DIESEL", "LPG", "MHEV", "HEV", "PHEV", "BEV", "HYDROGEN"]);
  });
});
