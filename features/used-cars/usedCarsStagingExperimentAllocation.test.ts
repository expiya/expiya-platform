import { describe, expect, it } from "vitest";
import { usedCarsStagingExperimentAllocations, validateExperimentAllocationManifest } from "./staging/experimentAllocationManifest";
import { validateExperimentAuditExport } from "./staging/experimentAuditExportGate";
describe("used-cars staging experiment allocation", () => {
  it("isolates five disabled surfaces without commercial keys", () => expect(validateExperimentAllocationManifest(usedCarsStagingExperimentAllocations)).toMatchObject({ valid: true, realExperimentAuthorized: false }));
  it("accepts a complete audit contract without exporting", () => { const checksum = `sha256:${"5".repeat(64)}`; expect(validateExperimentAuditExport({ experimentId: "exp-1", manifestChecksum: checksum, allocationSummaryChecksum: checksum, guardrailEvidenceChecksum: checksum, stoppedResultsIncluded: true, failedResultsIncluded: true, rawPiiIncluded: false, tenantCommercialAttributesIncluded: false, reviewerId: "reviewer", exportStorageRef: null, exportExecuted: false })).toMatchObject({ valid: true, auditExportAuthorized: false }); });
});
