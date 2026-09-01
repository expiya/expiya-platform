import {describe,expect,it} from "vitest";
import {currentUsedCarsDeploymentTopologyReadiness,usedCarsDeploymentTopologyReadinessSnapshot} from "./readiness/deploymentTopologyReadiness";
describe("deployment topology readiness",()=>{
 it("records internal topology without claiming DNS or deployment",()=>{expect(usedCarsDeploymentTopologyReadinessSnapshot.prerequisites.routeContractReady).toBe(true);expect(usedCarsDeploymentTopologyReadinessSnapshot.prerequisites.dnsAndTlsConfigured).toBe(false);});
 it("keeps redirect, partner production and DNS changes blocked",()=>expect(currentUsedCarsDeploymentTopologyReadiness).toMatchObject({ready:false,legacyRedirectActivationAuthorized:false,partnerProductionDeploymentAuthorized:false,dnsChangeAuthorized:false}));
});
