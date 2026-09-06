export interface PilotCityCandidate { readonly cityCode:string; readonly verifiedDealerCandidates:number; readonly estimatedEligibleStock:number; readonly taxonomyCoverageRatio:number; readonly moderationCapacityPerWeek:number; readonly supportCoverage:boolean; readonly launchRegions:readonly string[] }
export type CityGateCode="NO_CONTROLLED_REGION"|"DEALER_COHORT_TOO_SMALL"|"STOCK_TOO_SMALL"|"TAXONOMY_COVERAGE_LOW"|"MODERATION_CAPACITY_LOW"|"SUPPORT_UNAVAILABLE";
export function evaluatePilotCity(candidate:PilotCityCandidate):{readonly eligible:boolean;readonly codes:readonly CityGateCode[]}{
 const codes:CityGateCode[]=[];
 if(candidate.launchRegions.length===0||candidate.launchRegions.length>2)codes.push("NO_CONTROLLED_REGION");
 if(candidate.verifiedDealerCandidates<3)codes.push("DEALER_COHORT_TOO_SMALL");
 if(candidate.estimatedEligibleStock<100)codes.push("STOCK_TOO_SMALL");
 if(candidate.taxonomyCoverageRatio<0.85)codes.push("TAXONOMY_COVERAGE_LOW");
 if(candidate.moderationCapacityPerWeek<50)codes.push("MODERATION_CAPACITY_LOW");
 if(!candidate.supportCoverage)codes.push("SUPPORT_UNAVAILABLE");
 return Object.freeze({eligible:codes.length===0,codes:Object.freeze(codes)});
}
export const pilotScopeLimits=Object.freeze({maximumCities:2,maximumDealers:8,maximumActiveStock:500,minimumDealers:5,minimumActiveStock:250,classicVehiclesIncluded:false as const,nationwideLaunchAllowed:false as const});
