import { describe, expect, it } from "vitest";
import { validateSyntheticSeedManifest } from "./staging/syntheticSeed";
const checksum = `sha256:${"b".repeat(64)}`;
describe("used-cars synthetic staging seed", () => {
  it("requires multi-tenant and multi-branch fixtures", () => expect(validateSyntheticSeedManifest({ seedId: "s", datasetChecksum: checksum, tenantCount: 1, branchesPerTenant: 1, usersPerTenant: 1, inventoryPerTenant: 1, allIdentifiersReservedSynthetic: true, realNamesIncluded: false, realContactDataIncluded: false, copiedProductionRows: 0, outboundDeliveryDisabled: true, resetScriptChecksum: checksum, expiresAt: "2027-01-01" }, "2026-09-01").valid).toBe(false));
  it("accepts safe seed metadata without authorizing execution", () => expect(validateSyntheticSeedManifest({ seedId: "s", datasetChecksum: checksum, tenantCount: 2, branchesPerTenant: 2, usersPerTenant: 2, inventoryPerTenant: 2, allIdentifiersReservedSynthetic: true, realNamesIncluded: false, realContactDataIncluded: false, copiedProductionRows: 0, outboundDeliveryDisabled: true, resetScriptChecksum: checksum, expiresAt: "2027-01-01" }, "2026-09-01")).toMatchObject({ valid: true, seedExecutionAuthorized: false }));
});
