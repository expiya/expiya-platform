import {describe,expect,it} from "vitest";
import {pilotTaxonomyManifest,validateReleaseManifest} from "./taxonomy/releaseManifest";
describe("pilot taxonomy manifest",()=>{
 it("defines all staged layers without completeness claims",()=>expect(validateReleaseManifest(pilotTaxonomyManifest)).toEqual([]));
 it("keeps classic and rare identities request-only",()=>{expect(pilotTaxonomyManifest.entries.find(e=>e.layer==="CLASSIC")?.state).toBe("REQUEST_ONLY");expect(pilotTaxonomyManifest.entries.find(e=>e.layer==="RARE_SPECIAL")?.state).toBe("REQUEST_ONLY");});
 it("forbids treating zero-car catalog as used inventory",()=>expect(pilotTaxonomyManifest.zeroCarCatalogUsedAsInventory).toBe(false));
});
