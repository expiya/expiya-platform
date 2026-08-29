import { describe, expect, it } from "vitest";
import { V3_TECHNICAL_QUICK_CHOICE_LABELS } from "./CarsConversationV3";

describe("V3 technical quick choices", () => {
  it("has a visible button definition for every technical discriminator", () => {
    expect(Object.keys(V3_TECHNICAL_QUICK_CHOICE_LABELS).sort()).toEqual([
      "BATTERY", "CHARGING", "COMPACT", "CONSUMPTION", "HEIGHT", "LUGGAGE", "PAYLOAD", "POWER", "PRICE", "RANGE", "TORQUE", "TOWING", "WHEELBASE", "WIDTH",
    ]);
    for (const [label, description] of Object.values(V3_TECHNICAL_QUICK_CHOICE_LABELS)) {
      expect(label.length).toBeGreaterThan(3);
      expect(description.length).toBeGreaterThan(12);
    }
  });
});
