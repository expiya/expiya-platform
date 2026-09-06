import { describe, expect, it } from "vitest";
import { usedCarsApiEndpointRegistry, validateApiEndpointRegistry } from "./api/endpointRegistry";
describe("used-cars API endpoint registry", () => {
  it("defines ten valid disabled endpoint contracts", () => { expect(usedCarsApiEndpointRegistry).toHaveLength(10); expect(validateApiEndpointRegistry(usedCarsApiEndpointRegistry)).toEqual([]); expect(usedCarsApiEndpointRegistry.every((item) => !item.productionEnabled)).toBe(true); });
  it("requires tenant context on partner and ops endpoints", () => expect(usedCarsApiEndpointRegistry.filter((item) => ["PARTNER", "OPS"].includes(item.surface)).every((item) => item.tenantContextRequired)).toBe(true));
  it("requires idempotency on every mutation", () => expect(usedCarsApiEndpointRegistry.filter((item) => item.method !== "GET").every((item) => item.idempotencyRequired)).toBe(true));
});
