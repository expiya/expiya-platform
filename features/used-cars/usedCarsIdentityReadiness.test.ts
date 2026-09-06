import {describe,expect,it} from "vitest";
import {currentUsedCarsIdentityReadiness,usedCarsIdentityReadinessSnapshot} from "./readiness/identityReadinessSnapshot";
describe("identity readiness snapshot",()=>{
 it("records internal contracts without claiming provider completion",()=>{expect(usedCarsIdentityReadinessSnapshot.prerequisites.principalContractReady).toBe(true);expect(usedCarsIdentityReadinessSnapshot.prerequisites.providerSelected).toBe(false);});
 it("keeps production authentication blocked",()=>{expect(currentUsedCarsIdentityReadiness.ready).toBe(false);expect(currentUsedCarsIdentityReadiness.productionAuthenticationAuthorized).toBe(false);expect(currentUsedCarsIdentityReadiness.missing).toContain("penetrationTestComplete");});
});
