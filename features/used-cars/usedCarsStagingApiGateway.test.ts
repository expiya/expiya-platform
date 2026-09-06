import { describe, expect, it } from "vitest";
import { usedCarsStagingGatewayRoutes, validateStagingGatewayManifest } from "./staging/apiGatewayManifest";
describe("used-cars staging API gateway", () => {
  it("maps all ten disabled endpoints", () => { expect(usedCarsStagingGatewayRoutes).toHaveLength(10); expect(validateStagingGatewayManifest(usedCarsStagingGatewayRoutes)).toMatchObject({ valid: true, routeEnablementAuthorized: false }); });
  it("strips untrusted tenant headers", () => expect(usedCarsStagingGatewayRoutes.every((item) => item.stripUntrustedTenantHeaders)).toBe(true));
  it("keeps all routes internal and disabled", () => expect(usedCarsStagingGatewayRoutes.every((item) => !item.internetAccessible && !item.routeEnabled)).toBe(true));
});
