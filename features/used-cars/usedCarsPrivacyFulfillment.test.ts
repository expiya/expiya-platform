import {describe,expect,it} from "vitest";
import {validatePrivacyExportPlan,validatePrivacyMutationPlan,type PrivacyExportPlan} from "./privacy/fulfillment";
const plan:PrivacyExportPlan={requestId:"r1",categories:["LEAD","CONSENT"],tenantIds:["t1"],thirdPartyRedactionRequired:true,secretsExcluded:true,fraudDetectionDetailsExcluded:true,fileEncrypted:true,downloadSingleUse:true,downloadExpiresAt:"2026-09-02",rawAuditLogIncluded:false,executionAuthorized:false};
describe("privacy request fulfillment",()=>{
 it("requires encrypted single-use redacted export",()=>expect(validatePrivacyExportPlan(plan,"2026-09-01")).toEqual([]));
 it("never exports raw audit or fraud internals",()=>expect(plan).toMatchObject({rawAuditLogIncluded:false,fraudDetectionDetailsExcluded:true,executionAuthorized:false}));
 it("requires revision-scoped deletion and backup suppression",()=>expect(validatePrivacyMutationPlan({requestId:"r1",action:"DELETE",recordReferences:["lead:l1"],expectedRevisionIds:["v1"],recipientTenantIds:["t1"],legalReviewRequired:true,backupSuppressionRequired:true,rollbackMeansRestorePersonalData:false,executionAuthorized:false})).toEqual([]));
});
