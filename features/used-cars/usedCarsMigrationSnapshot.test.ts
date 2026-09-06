import { describe,expect,it } from "vitest";
import { currentUsedCarsMigrationReadiness,usedCarsMigrationReadinessSnapshot } from "./readiness/migrationReadinessSnapshot";
describe("current used-cars migration readiness snapshot",()=>{
  it("records completed internal design prerequisites without claiming external approval",()=>{expect(usedCarsMigrationReadinessSnapshot.prerequisites.verifiedSessionContract).toBe(true);expect(usedCarsMigrationReadinessSnapshot.prerequisites.compositeTenantKeysReviewed).toBe(true);expect(usedCarsMigrationReadinessSnapshot.prerequisites.retentionMatrixLegallyApproved).toBe(false);expect(usedCarsMigrationReadinessSnapshot.prerequisites.kmsAndHmacRotationApproved).toBe(false);});
  it("keeps migration and production writes blocked",()=>{expect(currentUsedCarsMigrationReadiness.ready).toBe(false);expect(currentUsedCarsMigrationReadiness.productionWriteAuthorized).toBe(false);expect(currentUsedCarsMigrationReadiness.missing).toContain("independentSecurityReviewComplete");expect(currentUsedCarsMigrationReadiness.missing).toContain("stagingRollbackTested");});
});

