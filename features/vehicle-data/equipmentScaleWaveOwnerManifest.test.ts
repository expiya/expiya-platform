import { readFileSync } from "node:fs";
/* eslint-disable @typescript-eslint/no-explicit-any -- fixtures exercise immutable JSON contracts */
import path from "node:path";
import { describe, expect, it } from "vitest";
import { calculateEquipmentSubjectContentFingerprint } from "./equipmentSubjectFingerprint";
import { validateScaleWaveOwnerManifest } from "./equipmentScaleWaveOwnerManifest";

const ROOT=process.cwd(), BASE="data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-SCALE-WAVE-001/corrections/EE-PILOT-002-SCALE-WAVE-001-R1";
const read=<T>(p:string)=>JSON.parse(readFileSync(path.join(ROOT,p),"utf8")) as T;
const manifest=read<any>(`${BASE}/owner-governance/EE-OAM-SCALE-WAVE-001-R1-BYD-NISSAN/approval-manifest.json`);
const events=read<any[]>(`${BASE}/second-review/independent-review-events.json`);
describe("scale-wave owner manifest preparation",()=>{
  it("contains only 65 passed assertions and two passed trim links",()=>{expect(manifest).toMatchObject({subjectCount:67,assertionCount:65,trimLinkCount:2,approvalEventsCreated:0,materializationsCreated:0,activePointerChanged:false,decisionEngineEffect:"ZERO"});expect(manifest.subjects.filter((x:any)=>x.subjectType==="ASSERTION")).toHaveLength(65);expect(manifest.subjects.filter((x:any)=>x.subjectType==="TRIM_LINK")).toHaveLength(2);});
  it("preserves BYD, Nissan and zero Volvo scope",()=>expect(manifest.distributions).toMatchObject({BYD:{assertions:33,trimLinks:1},Nissan:{assertions:32,trimLinks:1},Volvo:{subjects:0}}));
  it("uses the observed availability distribution and exact negative evidence",()=>{expect(manifest.distributions.totalAvailabilityProvision).toEqual({"NOT_AVAILABLE+NOT_OFFERED":3,"OPTIONAL+FACTORY_OPTION":0,"PACKAGE_DEPENDENT+PACKAGE_OPTION":0,"STANDARD+INCLUDED":62});const negative=manifest.subjects.filter((x:any)=>x.availabilityStatus==="NOT_AVAILABLE");expect(negative).toHaveLength(3);expect(negative.every((x:any)=>x.brand==="BYD"&&x.evidencePolarity==="NEGATIVE"&&x.locator.row&&x.locator.column&&x.legend.negativeMeaning)).toBe(true);});
  it("validates passed review, fingerprints, actor, checksum and decision boundary",()=>expect(validateScaleWaveOwnerManifest({manifest,passedReviewEvents:events,ownerActorValid:true,expectedR1Checksum:"sha256:dc5bdbdf7f9e1e6f1e0dbe3780fa348b8f93ebbb818e00c336b739e600df2224",recomputeFingerprint:calculateEquipmentSubjectContentFingerprint})).toEqual([]));
  it("rejects duplicates and invalid availability combinations",()=>{const duplicate={...manifest,subjects:[...manifest.subjects.slice(0,-1),manifest.subjects[0]]};expect(validateScaleWaveOwnerManifest({manifest:duplicate,passedReviewEvents:events,ownerActorValid:true,expectedR1Checksum:manifest.r1CycleChecksum,recomputeFingerprint:calculateEquipmentSubjectContentFingerprint})).toContain("DUPLICATE_SUBJECT");const invalid=structuredClone(manifest);const assertion=invalid.subjects.find((x:any)=>x.subjectType==="ASSERTION");assertion.provisionMode="FACTORY_OPTION";expect(validateScaleWaveOwnerManifest({manifest:invalid,passedReviewEvents:events,ownerActorValid:true,expectedR1Checksum:manifest.r1CycleChecksum,recomputeFingerprint:calculateEquipmentSubjectContentFingerprint})).toContain("INVALID_AVAILABILITY_PROVISION_COMBINATION");});
});
