import {describe,expect,it} from "vitest";
import {evaluatePilotHealth} from "./pilot/health";
import {currentUsedCarsPilotOperationsReadiness} from "./readiness/pilotOperationsReadiness";
const healthy={activeDealers:5,eligibleStock:250,taxonomyMatchRatio:.92,staleStockRatio:.03,leadContactConsentRatio:1,qualifiedLeadRatio:.4,sellerResponseWithinBusinessDayRatio:.85,complaintRatio:.01,criticalSecurityIncidents:0,crossTenantIncidents:0,misleadingVerificationIncidents:0};
describe("pilot health and readiness",()=>{
 it("marks a healthy cohort successful without selling organic ranking",()=>expect(evaluatePilotHealth(healthy)).toEqual({continuePilot:true,success:true,stopCodes:[],organicRankingPurchasable:false}));
 it("stops immediately for tenant or trust incidents",()=>expect(evaluatePilotHealth({...healthy,crossTenantIncidents:1,misleadingVerificationIncidents:1})).toMatchObject({continuePilot:false,success:false,stopCodes:["CROSS_TENANT_INCIDENT","MISLEADING_VERIFICATION"]}));
 it("keeps pilot writes and real lead transfer blocked",()=>{expect(currentUsedCarsPilotOperationsReadiness.ready).toBe(false);expect(currentUsedCarsPilotOperationsReadiness.pilotDataWriteAuthorized).toBe(false);expect(currentUsedCarsPilotOperationsReadiness.realLeadTransferAuthorized).toBe(false);});
});
