import {describe,expect,it} from "vitest";
import {evaluateBackupDeletion,validateRestoreSuppression,type BackupDeletionRecord} from "./resilience/backupPrivacy";
const record:BackupDeletionRecord={deletionRequestId:"d1",subjectScopeFingerprint:`hmac-sha256:v1:${"a".repeat(64)}`,primaryDeletedAt:"2026-09-01",backupSetIds:["b1"],legalHoldUntil:null,backupExpiryAt:"2026-10-01",restoreSuppressionRegistered:true,destroyedAt:null};
describe("backup privacy lifecycle",()=>{
 it("keeps primary-deleted data unavailable while backup expiry is pending",()=>expect(evaluateBackupDeletion({record,now:"2026-09-15"})).toEqual({state:"BACKUP_EXPIRY_PENDING",restorableForNormalOperations:false,deletionComplete:false}));
 it("requires destruction evidence after expiry",()=>expect(evaluateBackupDeletion({record,now:"2026-10-02"})).toMatchObject({state:"DESTRUCTION_EVIDENCE_REQUIRED",deletionComplete:false}));
 it("uses PII-free restore suppression",()=>expect(validateRestoreSuppression({subjectScopeFingerprint:record.subjectScopeFingerprint,deletionRequestId:"d1",effectiveAt:"2026-09-01",expiresAt:"2026-11-01",rawPiiIncluded:false},"2026-09-02")).toEqual([]));
});
