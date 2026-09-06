import { describe, expect, it } from "vitest";
import { assessTaxonomyRollbackSuite, requiredTaxonomyRollbackScenarios } from "./staging/taxonomyRollbackSuite";
describe("used-cars staging taxonomy rollback", () => {
  it("requires six reference-safe synthetic drills", () => expect(assessTaxonomyRollbackSuite(requiredTaxonomyRollbackScenarios.map((scenario) => ({ scenario, environment: "STAGING", syntheticOnly: true, passed: true, recoveryTimeSeconds: 300, orphanReferenceCount: 0, evidenceChecksum: `sha256:${"a".repeat(64)}`, productionPointerChanged: false })))).toMatchObject({ complete: true, activationAuthorized: false, productionPointerChangeAuthorized: false }));
  it("rejects missing drills", () => expect(assessTaxonomyRollbackSuite([]).missing).toHaveLength(6));
});
