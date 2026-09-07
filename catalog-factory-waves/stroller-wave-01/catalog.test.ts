import {describe,expect,it} from "vitest";
import {STROLLERS,TERMINAL_UNKNOWNS} from "./catalog";
import {buildArtifacts} from "./generate";

describe("STROLLER Catalog Factory wave 01",()=>{
 it("meets exact identity, brand, and segment targets without changing active Baby",()=>{const a=buildArtifacts();expect(STROLLERS).toHaveLength(15);expect(new Set(STROLLERS.map(x=>x.brand)).size).toBeGreaterThanOrEqual(5);expect(new Set(STROLLERS.map(x=>x.segment)).size).toBeGreaterThanOrEqual(5);expect(a.coverage).toMatchObject({targetMet:true,activeBabyCountBefore:4,activeBabyCountAfter:4});});
 it("reconciles every observation terminally with no silent drop",()=>{const a=buildArtifacts();expect(a.terminal).toHaveLength(STROLLERS.length*2+TERMINAL_UNKNOWNS.length);expect(new Set(a.terminal.map(x=>x.observationId)).size).toBe(a.terminal.length);expect(a.terminal.every(x=>["EXACT","UNKNOWN","REJECTED"].includes(x.outcome))).toBe(true);});
 it("keeps technical, commerce, media, and persona authority separated",()=>{const a=buildArtifacts();expect(a.candidate.members.every(x=>x.commerce.technicalEvidenceDigest===null&&x.media.technicalEvidenceDigest===null&&x.persona.status==="UNKNOWN_NEUTRAL")).toBe(true);expect(a.candidate.activationPlan).toEqual({ownerApprovalRequired:true,activePointerWrite:false,runtimeWrite:false,databaseMigration:false,deployment:false});});
 it("builds deterministically",()=>{expect(buildArtifacts()).toEqual(buildArtifacts());});
});
