import { randomUUID } from "node:crypto";
import type { AppliancesConversationState, AppliancesProductType } from "./contracts";
import { isActiveAppliancesCategoryId, type AppliancesCategoryId, type InactiveAppliancesCategoryId } from "./categoryRegistry";
import type { AppliancesArtifactRepository } from "./authority/loader.server";
import { loadActiveAppliancesAuthority } from "./authority/loader.server";
import { resolveDepartmentCapability } from "../platform/departmentRegistry";
import { loadActiveDryerAuthority } from "./dryer/authority.server";
import { loadActiveRefrigeratorAuthority } from "./refrigerator/authority.server";
import { isBoundedType, loadActiveBoundedAuthority } from "./bounded/authority.server";
import { loadActiveBrandConstraintPolicy } from "./brandConstraint/policy.server";
export type AppliancesEntryResult={readonly status:"READY";readonly state:AppliancesConversationState}|{readonly status:"NOT_READY";readonly productType:InactiveAppliancesCategoryId}|{readonly status:"UNSUPPORTED";readonly productType:string}|{readonly status:"FAILED_CLOSED"};
export async function enterAppliancesDepartment(input:{readonly repository:AppliancesArtifactRepository;readonly productType:AppliancesCategoryId;readonly conversationId?:string;readonly now?:Date}):Promise<AppliancesEntryResult>{
  if(!isActiveAppliancesCategoryId(input.productType))return{status:"NOT_READY",productType:input.productType};
  const productType: AppliancesProductType = input.productType;
  const brandPolicy=await loadActiveBrandConstraintPolicy(process.cwd());if(brandPolicy.status!=="READY")return{status:"FAILED_CLOSED"};
  const capability=resolveDepartmentCapability("APPLIANCES",productType);if(!capability||capability.status!=="ACTIVE")return{status:"UNSUPPORTED",productType};
  const loaded=productType==="DRYER"?await loadActiveDryerAuthority(process.cwd()):productType==="REFRIGERATOR"?await loadActiveRefrigeratorAuthority(process.cwd()):isBoundedType(productType)?await loadActiveBoundedAuthority(process.cwd(),productType):await loadActiveAppliancesAuthority({repository:input.repository});if(loaded.status!=="READY")return{status:"FAILED_CLOSED"};
  const authority=loaded.snapshot,timestamp=(input.now??new Date()).toISOString(),semantic=productType==="WASHING_MACHINE"?String((authority as import("./authority/types").AppliancesAuthoritySnapshot).manifest.semanticRegistryVersion):`${productType}_SEMANTIC_REGISTRY/v0.1`;
  return{status:"READY",state:{conversationId:input.conversationId??randomUUID(),schemaVersion:"appliances-conversation/v1",revision:0,departmentId:"APPLIANCES",productType,pinnedCatalogRelease:authority.releaseVersion,pinnedCatalogDigest:authority.catalogDigest,pinnedSemanticVersion:semantic,pinnedSemanticDigest:authority.semanticDigest,pinnedBrandPolicyId:brandPolicy.snapshot.policy.policyId,pinnedBrandPolicyDigest:brandPolicy.snapshot.policyDigest,intentState:"PRODUCT_TYPE_RESOLVED",budgetMode:"NEEDS_ONLY",budgetModeEvents:[],brandConstraintEvents:[],ledger:[],askedQuestionKeys:[],personaSignals:[],ended:false,createdAt:timestamp,updatedAt:timestamp}};
}
