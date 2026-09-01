export const usedCarsTaxonomyReleaseReadinessSnapshot=Object.freeze({prerequisites:Object.freeze({
 releaseManifestReady:true,sourcePolicyReady:true,provenanceGateReady:true,identityIntegrityReady:true,specialQueueReady:true,
 licensedSourcesContracted:false,initialDatasetReviewed:false,duplicateResolutionComplete:false,classicSpecialistPanelReady:false,legalUsageReviewComplete:false,rollbackDrillComplete:false,
}),publicTaxonomyReleaseAuthorized:false as const});
export function assessTaxonomyReleaseReadiness(){const missing=Object.entries(usedCarsTaxonomyReleaseReadinessSnapshot.prerequisites).filter(([,ready])=>!ready).map(([key])=>key);return Object.freeze({ready:missing.length===0,missing:Object.freeze(missing),publicTaxonomyReleaseAuthorized:false as const});}
export const currentUsedCarsTaxonomyReleaseReadiness=assessTaxonomyReleaseReadiness();
