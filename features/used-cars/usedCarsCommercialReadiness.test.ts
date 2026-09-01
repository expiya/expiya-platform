import {describe,expect,it} from "vitest";
import {currentUsedCarsCommercialReadiness,usedCarsCommercialReadinessSnapshot} from "./readiness/commercialReadiness";
describe("commercial readiness",()=>{
 it("records internal commercial controls without claiming pricing approval",()=>{expect(usedCarsCommercialReadinessSnapshot.prerequisites.planCatalogReady).toBe(true);expect(usedCarsCommercialReadinessSnapshot.prerequisites.pricingApproved).toBe(false);});
 it("blocks all real commercial actions",()=>expect(currentUsedCarsCommercialReadiness).toMatchObject({ready:false,realChargeAuthorized:false,invoiceIssuanceAuthorized:false,sponsoredPublicationAuthorized:false}));
});
