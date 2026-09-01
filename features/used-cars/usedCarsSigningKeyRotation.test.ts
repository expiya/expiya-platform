import { describe, expect, it } from "vitest";
import { assessSigningKeyRotation } from "./identity/keyRotation";
describe("used-cars signing key rotation", () => {
  it("requires overlap, fail-closed and rollback tests", () => expect(assessSigningKeyRotation({ currentKeyId: "k1", nextKeyId: null, previousKeyId: null, jwksCacheMaxAgeSeconds: 7200, overlapStartsAt: null, overlapEndsAt: null, oldKeyDisabledAt: null, forcedRefreshTestPassed: false, unknownKeyFailClosedTestPassed: false, rollbackTestPassed: false }, "2026-09-01")).toMatchObject({ ready: false, rotationExecutionAuthorized: false }));
  it("accepts complete rotation evidence without executing it", () => expect(assessSigningKeyRotation({ currentKeyId: "k1", nextKeyId: "k2", previousKeyId: "k0", jwksCacheMaxAgeSeconds: 900, overlapStartsAt: "2026-09-01", overlapEndsAt: "2026-09-02", oldKeyDisabledAt: "2026-09-02", forcedRefreshTestPassed: true, unknownKeyFailClosedTestPassed: true, rollbackTestPassed: true }, "2026-09-01")).toMatchObject({ ready: true, rotationExecutionAuthorized: false }));
});
