import { describe, expect, it } from "vitest";
import { buildDemoVehicleFacts } from "./trust";
import { DEMO_USED_CARS } from "./catalog";
import { DEMO_LEADS } from "./leads";

describe("used-car detail trust and lead demos", () => {
  it("never collapses all facts into a single verified state", () => {
    const facts = buildDemoVehicleFacts(DEMO_USED_CARS[0]);
    expect(new Set(facts.map(fact => fact.trustClass)).size).toBeGreaterThan(2);
    expect(facts.some(fact => fact.trustClass === "MISSING")).toBe(true);
  });
  it("projects facts from the selected stock without cross-record identity leakage", () => {
    for (const car of DEMO_USED_CARS) {
      const facts = buildDemoVehicleFacts(car);
      expect(facts.find(fact => fact.label === "Araç kimliği")?.value).toContain(car.title);
      expect(facts.find(fact => fact.label === "Kilometre")?.value).toContain(car.mileageKm.toLocaleString("tr-TR"));
      expect(JSON.stringify(facts)).not.toMatch(/VIN|plaka/i);
    }
  });
  it("keeps demo lead identities masked", () => {
    expect(DEMO_LEADS.every(lead => lead.id.startsWith("demo-") && lead.phoneMasked.includes("•"))).toBe(true);
  });
});
