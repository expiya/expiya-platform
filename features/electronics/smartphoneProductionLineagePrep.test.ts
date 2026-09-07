import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root=path.join(process.cwd(),"data/research/electronics/smartphone-amazon-tr-catalog-expansion-02/production-lineage-integration-prep-f1ce8e61");
const read=(name:string)=>JSON.parse(readFileSync(path.join(root,name),"utf8"));

describe("smartphone v02 production-lineage preparation",()=>{
  it("records the verified 93/6/87 source mismatch and refuses false 123 readiness",()=>{
    const discrepancy=read("blocking-discrepancy.json");
    expect(discrepancy.status).toBe("BLOCKED_SOURCE_AUTHORITY_COUNT_MISMATCH");
    expect(discrepancy.baselineCounts).toEqual({total:93,smartphone:6,nonSmartphone:87,headphones:18,categories:24});
    expect(discrepancy.feasibleIdentityPreservingCandidate).toMatchObject({total:120,smartphone:33,nonSmartphone:87,headphones:18,categories:24,unique:120});
  });
  it("proves all 24 categories and preserves headphones",()=>{
    const proof=read("membership-proof-24-categories.json");
    expect(proof.categories).toHaveLength(24);
    expect(proof.headphonesExactProductIds).toHaveLength(18);
    expect(proof.smartphoneExactProductIds).toHaveLength(33);
    expect(proof.categories.filter((c:{categoryId:string})=>c.categoryId!=="SMARTPHONE").every((c:{preservation:string})=>c.preservation==="BYTE_AND_IDENTITY_EQUIVALENT_TO_F1CE8E61")).toBe(true);
  });
  it("keeps the preparation read-only and digest-bound",()=>{
    const plan=read("integration-plan.json"), packageBytes=readFileSync(path.join(process.cwd(),plan.package.path));
    expect(`sha256:${createHash("sha256").update(packageBytes).digest("hex")}`).toBe(plan.package.sha256);
    expect(plan.status).toBe("READ_ONLY_PREPARATION_BLOCKED_NOT_AUTHORIZED_NOT_ACTIVE");
    expect(plan.invariants).toEqual({activePointerMutation:false,runtimeMutation:false,deployment:false,push:false});
    expect(plan.lineage.mitgoVerification.present).toBe(true);
  });
  it("records the conditional authorization but blocks CAS until 120 is explicitly reapproved",()=>{
    const event=read("governance/conditional-activation-authorization/SMARTPHONE-V02-F1CE8E61-20260906/authorization-event.json");
    const dryRun=read("governance/cas-dry-run.json");
    expect(event).toMatchObject({appendOnly:true,effective:false,blockingCondition:"EXPLICIT_NUMERIC_REAPPROVAL_OF_120_TOTAL_REQUIRED",pushAuthorized:false,deploymentAuthorized:false});
    expect(event.conditions).toMatchObject({sourceCountDiscrepancyResolved:true,expectedTotalNumericallyReapproved:false,membershipProofPassed:true,testsPassed:true,buildPassed:true,casDryRunPassed:false});
    expect(dryRun.status).toBe("BLOCKED_NO_WRITE_PERFORMED");
    expect(dryRun.checks).toMatchObject({exact33Membership:"PASS",nonSmartphoneIdentityPreservation:"PASS_87_OF_87",headphonesMembership:"PASS_18_OF_18",categoryMembershipProof:"PASS_24_OF_24",targetedRegressionTests:"PASS_147_OF_147",productionBuild:"PASS",expectedTotalNumericReapproval:"BLOCKED_EXPECTED_120_NOT_EXPLICITLY_REAPPROVED"});
    expect(dryRun).toMatchObject({wouldCompareAndSwap:false,activePointerMutation:false,runtimeMutation:false,deployment:false,push:false});
  });
});
