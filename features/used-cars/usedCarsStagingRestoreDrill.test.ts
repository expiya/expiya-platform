import { describe, expect, it } from "vitest";
import { assessStagingRestoreDrills, requiredStagingRestoreDrills } from "./staging/restoreDrill";
import { validateRestoredDataSafety } from "./staging/restoredDataGate";
describe("used-cars staging restore drills", () => {
  it("requires seven restore and failover scenarios", () => { expect(requiredStagingRestoreDrills).toHaveLength(7); expect(assessStagingRestoreDrills([])).toMatchObject({ complete: false, productionRestoreAuthorized: false, automaticFailoverAuthorized: false }); });
  it("accepts an isolated synthetic restored-data snapshot without promotion", () => expect(validateRestoredDataSafety({ expectedTenantIds: ["a", "b"], observedTenantIds: ["a", "b"], crossTenantQueryLeaks: 0, suppressedSubjectFingerprintsExpected: ["hmac:a"], suppressedSubjectFingerprintsObserved: ["hmac:a"], publicRowsForSuspendedTenants: 0, publicRowsForExpiredListings: 0, auditChainVerified: true, sourceEnvironment: "STAGING", containsProductionRows: false })).toMatchObject({ valid: true, restoredEnvironmentPromotionAuthorized: false }));
  it("blocks restored deletion resurrection", () => expect(validateRestoredDataSafety({ expectedTenantIds: ["a"], observedTenantIds: ["a"], crossTenantQueryLeaks: 0, suppressedSubjectFingerprintsExpected: ["deleted"], suppressedSubjectFingerprintsObserved: [], publicRowsForSuspendedTenants: 0, publicRowsForExpiredListings: 0, auditChainVerified: true, sourceEnvironment: "STAGING", containsProductionRows: false }).codes).toContain("DELETION_SUPPRESSION_MISSING"));
});
