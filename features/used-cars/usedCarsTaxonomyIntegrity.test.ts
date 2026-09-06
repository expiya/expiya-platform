import {describe,expect,it} from "vitest";
import {validateTaxonomyIntegrity} from "./taxonomy/integrity";
import type {UsedCarTaxonomyEntity} from "./taxonomy/contracts";
const entity:UsedCarTaxonomyEntity={id:"uct_model_corolla",entityType:"MODEL_LINE",canonicalName:"Corolla",aliases:[{value:"Toyota Corolla",locale:"tr-TR",market:"TR"}],market:"TR",productionFrom:1966,sourceReferences:[],confidence:"HIGH",moderationStatus:"APPROVED",releaseVersion:"tr-used-pilot-0.1.0"};
describe("taxonomy identity integrity",()=>{
 it("accepts stable controlled identity",()=>expect(validateTaxonomyIntegrity([entity])).toEqual([]));
 it("detects alias and production anomalies",()=>expect(validateTaxonomyIntegrity([{...entity,aliases:[{value:"Corolla",locale:"tr-TR"}],productionUntil:1900}])).toEqual(expect.arrayContaining(["CANONICAL_ALIAS_COLLISION","INVALID_PRODUCTION_PERIOD"])));
 it("detects missing and cyclic supersede targets",()=>{expect(validateTaxonomyIntegrity([{...entity,supersedesEntityId:"missing"}])).toContain("SUPERSEDE_TARGET_MISSING");const second={...entity,id:"uct_model_corolla_legacy",supersedesEntityId:entity.id};expect(validateTaxonomyIntegrity([{...entity,supersedesEntityId:second.id},second])).toContain("SUPERSEDE_CYCLE");});
});
