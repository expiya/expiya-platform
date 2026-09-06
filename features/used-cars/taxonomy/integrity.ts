import type {UsedCarTaxonomyEntity} from "./contracts";
const stableIdPattern=/^uct_(make|model|generation|body|powertrain|market|trim)_[a-z0-9][a-z0-9_-]{2,80}$/u;
const normalize=(value:string)=>value.normalize("NFKC").trim().toLocaleLowerCase("tr-TR").replace(/\s+/gu," ");
export type TaxonomyIntegrityCode="INVALID_STABLE_ID"|"CANONICAL_NAME_EMPTY"|"DUPLICATE_ALIAS"|"CANONICAL_ALIAS_COLLISION"|"INVALID_PRODUCTION_PERIOD"|"SELF_SUPERSEDE"|"SUPERSEDE_TARGET_MISSING"|"SUPERSEDE_TYPE_MISMATCH"|"SUPERSEDE_CYCLE";
export function validateTaxonomyIntegrity(entities:readonly UsedCarTaxonomyEntity[]):readonly TaxonomyIntegrityCode[]{
 const codes:TaxonomyIntegrityCode[]=[];const byId=new Map(entities.map(entity=>[entity.id,entity]));
 for(const entity of entities){
  if(!stableIdPattern.test(entity.id))codes.push("INVALID_STABLE_ID");if(!entity.canonicalName.trim())codes.push("CANONICAL_NAME_EMPTY");
  const aliases=entity.aliases.map(alias=>normalize(alias.value));if(new Set(aliases).size!==aliases.length)codes.push("DUPLICATE_ALIAS");if(aliases.includes(normalize(entity.canonicalName)))codes.push("CANONICAL_ALIAS_COLLISION");
  if(entity.productionFrom&&entity.productionUntil&&entity.productionUntil<entity.productionFrom)codes.push("INVALID_PRODUCTION_PERIOD");
  if(entity.supersedesEntityId===entity.id)codes.push("SELF_SUPERSEDE");
  if(entity.supersedesEntityId){const target=byId.get(entity.supersedesEntityId);if(!target)codes.push("SUPERSEDE_TARGET_MISSING");else if(target.entityType!==entity.entityType)codes.push("SUPERSEDE_TYPE_MISMATCH");}
 }
 for(const entity of entities){const seen=new Set<string>();let current:UsedCarTaxonomyEntity|undefined=entity;while(current?.supersedesEntityId){if(seen.has(current.id)){codes.push("SUPERSEDE_CYCLE");break;}seen.add(current.id);current=byId.get(current.supersedesEntityId);}}
 return Object.freeze([...new Set(codes)]);
}
