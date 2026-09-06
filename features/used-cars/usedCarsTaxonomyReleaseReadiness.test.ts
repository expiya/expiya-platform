import {describe,expect,it} from "vitest";
import {currentUsedCarsTaxonomyReleaseReadiness,usedCarsTaxonomyReleaseReadinessSnapshot} from "./readiness/taxonomyReleaseReadiness";
describe("taxonomy release readiness",()=>{
 it("records internal governance without claiming real data readiness",()=>{expect(usedCarsTaxonomyReleaseReadinessSnapshot.prerequisites.provenanceGateReady).toBe(true);expect(usedCarsTaxonomyReleaseReadinessSnapshot.prerequisites.initialDatasetReviewed).toBe(false);});
 it("keeps public taxonomy release blocked",()=>{expect(currentUsedCarsTaxonomyReleaseReadiness.ready).toBe(false);expect(currentUsedCarsTaxonomyReleaseReadiness.publicTaxonomyReleaseAuthorized).toBe(false);expect(currentUsedCarsTaxonomyReleaseReadiness.missing).toContain("legalUsageReviewComplete");});
});
