import { ACTIVE_DEPARTMENT_REGISTRY, type DepartmentRegistryEntry } from "./departmentRegistry";

export interface ActiveDiscoveryCategory { readonly id: string; readonly label: string; readonly href: string; readonly example: string }
export interface ActiveDiscoveryDepartment { readonly id: string; readonly label: string; readonly href: string; readonly categories: readonly ActiveDiscoveryCategory[] }
const exampleFor = (label:string) => `${label} arıyorum`;

export function buildActivePlatformDiscovery(registry: readonly DepartmentRegistryEntry[]): readonly ActiveDiscoveryDepartment[] {
  return Object.freeze(registry.filter(department=>department.status==="ACTIVE").map(department=>Object.freeze({
    id:department.departmentId,label:department.publicLabelTr,href:department.canonicalPath,
    categories:Object.freeze(Object.entries(department.capabilities).filter(([,capability])=>capability.status==="ACTIVE").map(([id,capability])=>Object.freeze({id,label:capability.publicLabelTr,href:capability.destination,example:exampleFor(capability.publicLabelTr)}))),
  })));
}
export const ACTIVE_PLATFORM_DISCOVERY = buildActivePlatformDiscovery(ACTIVE_DEPARTMENT_REGISTRY);

export function buildSecretarySearchSuggestions(discovery: readonly ActiveDiscoveryDepartment[]): readonly { readonly id:string; readonly label:string }[] {
  const byDepartment=discovery.map(department=>department.categories.length
    ? department.categories.map(category=>({id:`${department.id}:${category.id}`,label:category.example}))
    : [{id:`${department.id}:DEPARTMENT`,label:exampleFor(department.label)}]);
  const suggestions: { id:string; label:string }[]=[];
  for(let categoryIndex=0;categoryIndex<Math.max(0,...byDepartment.map(items=>items.length));categoryIndex+=1){
    for(const items of byDepartment){const suggestion=items[categoryIndex];if(suggestion)suggestions.push(suggestion);}
  }
  return Object.freeze(suggestions.map(suggestion=>Object.freeze(suggestion)));
}

export const SECRETARY_SEARCH_SUGGESTIONS = buildSecretarySearchSuggestions(ACTIVE_PLATFORM_DISCOVERY);
