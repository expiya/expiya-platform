import { describe, expect, it } from "vitest";
import { assessDependencyFindings } from "./supply-chain/dependencyPolicy";
import { validateSecretInventory } from "./supply-chain/secretPolicy";
describe("used-cars supply-chain policies", () => {
  it("blocks high vulnerabilities without automatic exceptions", () => expect(assessDependencyFindings([{ packageName: "pkg", version: "1", scope: "RUNTIME", license: "MIT", vulnerabilitySeverity: "HIGH", fixAvailable: true, transitive: false, lastReviewedAt: "2026-09-01", exceptionId: null, exceptionExpiresAt: null }], "2026-09-01")).toMatchObject({ ready: false, automaticVulnerabilityExceptionAuthorized: false }));
  it("requires secret ownership, KMS and rotation", () => expect(validateSecretInventory([{ secretId: "s", environment: "PRODUCTION", purpose: "test", ownerId: null, kmsReference: null, lastRotatedAt: null, nextRotationAt: null, repositoryStored: false, sharedAcrossPublicPartnerOps: false }], "2026-09-01")).toMatchObject({ valid: false, secretActivationAuthorized: false }));
});
