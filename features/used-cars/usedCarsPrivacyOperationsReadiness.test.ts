import {describe,expect,it} from "vitest";
import {currentUsedCarsPrivacyOperationsReadiness,usedCarsPrivacyOperationsReadinessSnapshot} from "./readiness/privacyOperationsReadiness";
describe("privacy operations readiness",()=>{
 it("records internal rights controls without claiming legal approval",()=>{expect(usedCarsPrivacyOperationsReadinessSnapshot.prerequisites.rightsLifecycleReady).toBe(true);expect(usedCarsPrivacyOperationsReadinessSnapshot.prerequisites.legalTextsApproved).toBe(false);});
 it("blocks real request, export and deletion operations",()=>expect(currentUsedCarsPrivacyOperationsReadiness).toMatchObject({ready:false,realRightsRequestProcessingAuthorized:false,personalDataExportAuthorized:false,personalDataDeletionAuthorized:false}));
});
