import {describe,expect,it} from "vitest";
import {currentUsedCarsDisasterRecoveryReadiness,usedCarsDisasterRecoveryReadinessSnapshot} from "./readiness/disasterRecoveryReadiness";
describe("disaster recovery readiness",()=>{
 it("records internal policies without claiming a backup provider",()=>{expect(usedCarsDisasterRecoveryReadinessSnapshot.prerequisites.backupPolicyReady).toBe(true);expect(usedCarsDisasterRecoveryReadinessSnapshot.prerequisites.backupProviderConfigured).toBe(false);});
 it("blocks backup, restore and automatic failover",()=>expect(currentUsedCarsDisasterRecoveryReadiness).toMatchObject({ready:false,realBackupAuthorized:false,productionRestoreAuthorized:false,automaticFailoverAuthorized:false}));
});
