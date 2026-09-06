import {describe,expect,it} from "vitest";
import {usedCarsBackupPolicies,validateBackupPolicies} from "./resilience/backupPolicy";
describe("used-cars backup policy",()=>{
 it("covers every critical data class",()=>expect(validateBackupPolicies(usedCarsBackupPolicies)).toEqual([]));
 it("uses the strictest RPO for the audit chain",()=>expect(usedCarsBackupPolicies.find(policy=>policy.dataClass==="AUDIT_CHAIN")?.rpoMinutes).toBe(5));
 it("keeps cross-region recovery disabled",()=>expect(usedCarsBackupPolicies.every(policy=>!policy.crossRegionAllowed)).toBe(true));
});
