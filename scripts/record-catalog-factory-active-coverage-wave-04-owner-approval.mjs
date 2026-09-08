import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const root="outputs/catalog-factory-active-coverage-wave-04-owner-review-01";
const eventDir=`${root}/governance/approval-events/CATALOG-FACTORY-WAVE04-OWNER-APPROVAL-01`;
const stable=v=>JSON.stringify(v,(_k,x)=>x&&typeof x==="object"&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
const sha=v=>createHash("sha256").update(typeof v==="string"?v:stable(v)).digest("hex");
const packet=JSON.parse(await readFile(`${root}/CANDIDATE_PACKET.json`,"utf8"));
const canonical=(await readFile(`${root}/OWNER_APPROVAL_SENTENCE.txt`,"utf8")).trim();
const expected="fc85a4d9a3814ed05a20805f3b6e9033cd0c0925d8d680407ff48e0983817126";
if(packet.candidateDigest!==expected||!canonical.startsWith(`${expected} SHA-256`))throw new Error("APPROVAL_BINDING_MISMATCH");
const core={schemaVersion:"catalog-factory-owner-approval-event/v1",eventId:"CATALOG-FACTORY-WAVE04-OWNER-APPROVAL-01",workUnitId:packet.workUnitId,eventType:"OWNER_REVIEW_CANDIDATE_APPROVED",recordedAt:"2026-09-08T01:30:00.000+03:00",candidateDigest:expected,productionSourceCommit:packet.authority.productionSourceCommit,approvedCategoryIds:["AIR_PURIFIER","HOB","BUILT_IN_MICROWAVE_OVEN"],approvedCandidateCount:3,authorityGranted:["OWNER_REVIEW_CANDIDATE_APPROVAL"],authorityNotGranted:["P_READINESS","Y_READINESS","ACTIVATION","POINTER","RUNTIME","DATABASE","PRODUCTION","DEPLOYMENT","PUSH"],canonicalApprovalSentence:canonical};
const event={...core,eventDigest:sha(core)};
await mkdir(eventDir,{recursive:true});
await Promise.all([writeFile(`${eventDir}/owner-approval-event.json`,`${stable(event)}\n`,{flag:"wx"}),writeFile(`${eventDir}/canonical-approval-sentence.txt`,`${canonical}\n`,{flag:"wx"}),writeFile(`${eventDir}/submitted-display-sentence.txt`,`${canonical}\n`,{flag:"wx"})]);
console.log(JSON.stringify({eventId:event.eventId,eventDigest:event.eventDigest,candidateDigest:event.candidateDigest,status:"RECORDED_APPEND_ONLY"},null,2));
