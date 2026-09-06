import { describe, expect, it } from "vitest";
import { DEMO_USED_CARS } from "./catalog";

describe("used-cars UI demo catalog", () => {
  it("keeps every record visibly synthetic and non-identifying", () => {
    expect(DEMO_USED_CARS.length).toBeGreaterThan(0);
    expect(DEMO_USED_CARS.every(car => car.id.startsWith("demo-") && car.seller.startsWith("Demo "))).toBe(true);
  });

  it("surfaces at least one uncertainty for every result", () => {
    expect(DEMO_USED_CARS.every(car => car.uncertainties.length > 0)).toBe(true);
  });
});
