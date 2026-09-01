import {describe,expect,it} from "vitest";
import {validateRestoreManifest,type RestoreManifest} from "./resilience/restoreValidation";
const manifest:RestoreManifest={backupId:"b1",dataClass:"TENANT_OPERATIONAL",environment:"STAGING",sourceChecksum:`sha256:${"a".repeat(64)}`,restoredChecksum:`sha256:${"a".repeat(64)}`,tenantScope:"t1",kmsKeyVersion:"v1",auditChainVerified:true,rowCountExpected:10,rowCountRestored:10,crossTenantNegativeTestPassed:true,restoredAt:"2026-09-01",approvedBy:"a1",secondApproverId:"a2",productionCutoverAuthorized:false};
describe("restore validation",()=>{
 it("accepts an isolated checksum-verified staging restore",()=>expect(validateRestoreManifest(manifest)).toEqual([]));
 it("rejects corrupt or cross-tenant unsafe restore",()=>expect(validateRestoreManifest({...manifest,restoredChecksum:`sha256:${"b".repeat(64)}`,crossTenantNegativeTestPassed:false})).toEqual(expect.arrayContaining(["CHECKSUM_MISMATCH","TENANT_ISOLATION_TEST_REQUIRED"])));
 it("requires independent approval and never authorizes cutover",()=>expect(validateRestoreManifest({...manifest,secondApproverId:"a1"})).toContain("SELF_APPROVAL_FORBIDDEN"));
});
