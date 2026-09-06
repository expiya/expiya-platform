import { describe, expect, it } from "vitest";

import { productEvents } from "./productEvents";

describe("privacy-bounded product analytics events", () => {
  it("exposes only controlled low-cardinality properties", () => {
    expect(productEvents.chatStarted("v3")).toEqual({ name: "chat_started", properties: { version: "v3" } });
    expect(productEvents.recommendationsRevealed("v3_recommendations", 3)).toEqual({ name: "recommendations_revealed", properties: { surface: "v3_recommendations", count: 3 } });
    expect(productEvents.carCardViewed("v2_recommendations", 2)).toEqual({ name: "car_card_viewed", properties: { surface: "v2_recommendations", position: 2 } });
    expect(productEvents.phase3CtaClicked("test_drive")).toEqual({ name: "phase3_cta_clicked", properties: { surface: "sales_advisor", intent: "test_drive" } });
  });

  it("bounds numeric dimensions to prevent unbounded cardinality", () => {
    expect(productEvents.recommendationsRevealed("legacy_recommendations", 999).properties.count).toBe(20);
    expect(productEvents.carCardOpened("v3_recommendations", -4).properties.position).toBe(1);
  });
});
