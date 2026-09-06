import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import path from "node:path";
import {projectHierarchicalPersona,type PersonaScopedAssertion} from "./hierarchicalProjection";
const id={exactProductId:"v",brandKey:"SONY",classKey:"HEADPHONES",familyKey:"SONY:WH-1000XM5",modelKey:"WH-1000XM5",variantKey:"WH1000XM5B.CE7"};
const a=(partial:Partial<PersonaScopedAssertion>):PersonaScopedAssertion=>({assertionId:"a",assertionScope:"BRAND_PERSONA",scopeKey:"SONY",trait:"DESIGN_LED",contribution:.25,sourceIds:["s1","s2"],status:"QUALIFIED",identityBridge:"brand identity",market:"GLOBAL",confidence:"CORROBORATED",limitations:[],...partial});
describe("hierarchical Persona projection",()=>{
 it("uses the most specific compatible assertion and prevents double counting",()=>{const result=projectHierarchicalPersona(id,[a({}),a({assertionId:"family",assertionScope:"PRODUCT_FAMILY_PERSONA",scopeKey:"SONY:WH-1000XM5",contribution:.5})]);expect(result.traits).toHaveLength(1);expect(result.score).toBe(.5);expect(result.traits[0]?.inheritedFrom?.assertionScope).toBe("PRODUCT_FAMILY_PERSONA")});
 it("lets a lower-scope contradiction block inheritance",()=>{const result=projectHierarchicalPersona(id,[a({}),a({assertionId:"model-conflict",assertionScope:"MODEL_PERSONA",scopeKey:"WH-1000XM5",status:"CONFLICTED"})]);expect(result.status).toBe("CONFLICTED");expect(result.score).toBe(0)});
 it("caps unique soft traits and grants no membership or winner authority",()=>{const result=projectHierarchicalPersona(id,[a({}),a({assertionId:"b",trait:"PROFESSIONAL",contribution:.75})]);expect(result.score).toBe(.75);expect(result.membershipEffect).toBe("NONE");expect(result.selectionAuthority).toBe("NONE")});
 it("materializes all 169 projections with only two disclosed family inheritances",()=>{const file=path.join(process.cwd(),"data/production/personas/universal/external-evidence/XPY-UNIVERSAL-PERSONA-EXTERNAL-EVIDENCE-01/hierarchical-owner-review/owner-review-package.json"),value=JSON.parse(readFileSync(file,"utf8"));expect(value.projections).toHaveLength(169);expect(new Set(value.projections.map((row:{exactProductId:string})=>row.exactProductId)).size).toBe(169);expect(value.coverage).toMatchObject({PRODUCT_FAMILY_PERSONA:2,UNKNOWN:167,CONFLICTED:0});expect(value.ownerApproval).toMatchObject({ownerReviewEligible:true,activationEligible:false})});
});
