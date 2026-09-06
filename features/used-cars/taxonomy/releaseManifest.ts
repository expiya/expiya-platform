export type TaxonomyCoverageLayer="TR_MODERN_COMMON"|"TR_LAST_25_YEARS"|"LIGHT_COMMERCIAL"|"LOW_VOLUME_IMPORT"|"CLASSIC"|"RARE_SPECIAL";
export type CoverageState="IN_SCOPE"|"DEFERRED"|"REQUEST_ONLY";
export interface TaxonomyCoverageEntry { readonly layer:TaxonomyCoverageLayer; readonly state:CoverageState; readonly claim:string }
export interface TaxonomyReleaseManifest { readonly version:string; readonly market:"TR"; readonly generatedAt:string; readonly entries:readonly TaxonomyCoverageEntry[]; readonly completenessClaimAllowed:false; readonly zeroCarCatalogUsedAsInventory:false }

const pilotCoverageEntries:readonly TaxonomyCoverageEntry[]=[
 {layer:"TR_MODERN_COMMON",state:"IN_SCOPE",claim:"Pilot şehirlerde yaygın kurumsal stok aileleri"},
 {layer:"TR_LAST_25_YEARS",state:"IN_SCOPE",claim:"Kaynak ve lisans kapısını geçen seçili nesiller"},
 {layer:"LIGHT_COMMERCIAL",state:"DEFERRED",claim:"Ayrı doğrulama dilimi"},
 {layer:"LOW_VOLUME_IMPORT",state:"REQUEST_ONLY",claim:"Kanıtlı kimlik talebiyle"},
 {layer:"CLASSIC",state:"REQUEST_ONLY",claim:"Uzman ve arşiv incelemesiyle"},
 {layer:"RARE_SPECIAL",state:"REQUEST_ONLY",claim:"İkinci moderasyonla"},
];

export const pilotTaxonomyManifest:TaxonomyReleaseManifest=Object.freeze({
 version:"tr-used-pilot-0.1.0",market:"TR",generatedAt:"2026-09-01T00:00:00.000Z",completenessClaimAllowed:false,zeroCarCatalogUsedAsInventory:false,
 entries:Object.freeze(pilotCoverageEntries),
});

export function validateReleaseManifest(manifest:TaxonomyReleaseManifest):readonly string[]{
 const codes:string[]=[];
 if(!/^tr-used-pilot-\d+\.\d+\.\d+$/u.test(manifest.version))codes.push("INVALID_VERSION");
 if(manifest.completenessClaimAllowed!==false)codes.push("COMPLETENESS_CLAIM_FORBIDDEN");
 if(manifest.zeroCarCatalogUsedAsInventory!==false)codes.push("ZERO_CAR_CATALOG_BOUNDARY_BROKEN");
 if(new Set(manifest.entries.map(entry=>entry.layer)).size!==6)codes.push("COVERAGE_LAYER_INCOMPLETE");
 return Object.freeze(codes);
}
