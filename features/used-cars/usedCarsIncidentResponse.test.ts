import {describe,expect,it} from "vitest";
import {classifyIncident} from "./security/incidentResponse";
describe("incident response",()=>{
 it("classifies cross-tenant access as SEV1",()=>expect(classifyIncident({kind:"CROSS_TENANT_ACCESS",confirmed:false,suspectedPersonalData:true,affectedTenants:2,activeExploitation:false})).toMatchObject({severity:"SEV1",containWithinMinutes:15,legalAssessmentRequired:true}));
 it("preserves evidence and never auto-notifies regulators",()=>{const plan=classifyIncident({kind:"PII_EXPOSURE",confirmed:true,suspectedPersonalData:true,affectedTenants:1,activeExploitation:false});expect(plan.actions).toContain("PRESERVE_AUDIT_AND_EVIDENCE");expect(plan.regulatorNotificationAutomaticallySent).toBe(false);expect(plan.evidenceDeletionAllowed).toBe(false);});
 it("contains active exploitation immediately",()=>expect(classifyIncident({kind:"MALWARE_UPLOAD",confirmed:false,suspectedPersonalData:false,affectedTenants:1,activeExploitation:true}).severity).toBe("SEV1"));
});
