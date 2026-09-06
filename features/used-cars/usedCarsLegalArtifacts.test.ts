import { describe, expect, it } from "vitest";
import { assessLegalArtifactCoverage, requiredUsedCarsLegalArtifacts, validateLegalArtifact } from "./legal/artifactRegistry";
describe("used-cars legal artifact registry", () => {
  it("tracks twelve required artifact classes", () => expect(requiredUsedCarsLegalArtifacts).toHaveLength(12));
  it("keeps every draft unusable for production", () => expect(requiredUsedCarsLegalArtifacts.every((artifact) => !validateLegalArtifact(artifact, "2026-09-01T00:00:00Z").usable)).toBe(true));
  it("reports complete legal coverage as missing", () => expect(assessLegalArtifactCoverage(requiredUsedCarsLegalArtifacts, "2026-09-01T00:00:00Z")).toMatchObject({ complete: false, productionUseAuthorized: false }));
});
