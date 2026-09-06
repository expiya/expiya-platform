import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("active Cars native XPY route", () => {
  it("enters the native transaction runtime and never calls the whole-turn compatibility export", () => {
    const route = readFileSync(new URL("../../../app/api/cars/conversation/v3/route.ts", import.meta.url), "utf8");
    const store = readFileSync(new URL("./store.server.ts", import.meta.url), "utf8");
    expect(route).toContain("prepareCarsTurn");
    expect(route).toContain("executePreparedCarsDecision");
    expect(route).not.toContain("executeCarsDomainDecision");
    expect(route).not.toMatch(/\brunV3Turn\b/u);
    expect(store).toContain("executeNativeXpyTurn");
  });
});
