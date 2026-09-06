import { describe, expect, it } from "vitest";
import { forbiddenPublicProjectionColumns, requiredPublicProjectionColumns, validatePublicProjectionIntrospection } from "./staging/publicProjectionContract";
describe("used-cars DB public projection", () => {
  it("accepts safe introspection without granting publication", () => expect(validatePublicProjectionIntrospection({ viewName: "used_cars.public_listing_projection", columns: requiredPublicProjectionColumns, ownerRole: "MIGRATION_OWNER", securityBarrier: true, publicReaderHasBaseTableGrants: false, suspendedTenantRowCount: 0, expiredListingRowCount: 0 })).toMatchObject({ valid: true, publicGrantAuthorized: false }));
  it("rejects identifier and tenant columns", () => expect(validatePublicProjectionIntrospection({ viewName: "used_cars.public_listing_projection", columns: [...requiredPublicProjectionColumns, "vin_ciphertext", "tenant_id"], ownerRole: "MIGRATION_OWNER", securityBarrier: true, publicReaderHasBaseTableGrants: false, suspendedTenantRowCount: 0, expiredListingRowCount: 0 }).codes).toContain("FORBIDDEN_COLUMN_EXPOSED"));
  it("maintains an explicit forbidden list", () => expect(forbiddenPublicProjectionColumns).toContain("contact_ciphertext"));
});
