import { describe, expect, it } from "vitest";

import catalog from "@/data/production/catalog/releases/v0.55.0/catalog.json";
import { matchVehiclePersona, resolveVehiclePersona, vehiclePersonaReason } from "./vehiclePersona";

describe("vehicle persona layer", () => {
  it("maps every active production variant to an owner editorial brand and series persona", () => {
    const missing = catalog.records.filter(({ variant }) => !resolveVehiclePersona(variant.brand.value, variant.model.value))
      .map(({ variant }) => `${variant.brand.value} ${variant.model.value}`);
    expect(missing).toEqual([]);
  });

  it("maps catalog aliases to their intended series groups", () => {
    expect(resolveVehiclePersona("BMW", "320i Sedan")?.seriesGroup).toBe("3 Serisi");
    expect(resolveVehiclePersona("Audi", "A3 Sportback")?.seriesGroup).toBe("A3");
    expect(resolveVehiclePersona("Hyundai", "TUCSON Hibrit")?.seriesGroup).toBe("KONA / TUCSON");
  });

  it("uses neutral user preferences as soft matching signals", () => {
    const match = matchVehiclePersona("Alfa Romeo", "Giulia", "Tasarımı güçlü ve sürüş keyfi yüksek bir araç istiyorum");
    expect(match.score).toBeGreaterThan(0);
    expect(match.matchedTraits).toContain("DESIGN");
    expect(vehiclePersonaReason("Alfa Romeo", "Giulia", "tasarım ve sürüş keyfi önemli")).toMatch(/editoryal personası/iu);
  });

  it("does not turn demographic stereotypes or unsafe driving language into decision traits", () => {
    const match = matchVehiclePersona("BMW", "3 Serisi", "genç kadınım ve trafikte makas atmayı seviyorum");
    expect(match.score).toBe(0);
    expect(match.matchedTraits).toEqual([]);
  });
});
