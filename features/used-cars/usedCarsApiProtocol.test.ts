import { describe, expect, it } from "vitest";
import { validateApiErrorEnvelope, validateCursorPage } from "./api/protocol";
import { validateApiDeprecation } from "./api/deprecation";
describe("used-cars API protocol", () => {
  it("keeps internal error details out", () => expect(validateApiErrorEnvelope({ version: "used-cars-api-error/v1", requestId: "req", code: "RATE_LIMITED", message: "Daha sonra deneyin", fieldErrors: [], retryable: true, retryAfterSeconds: 30, internalDetailsIncluded: false })).toEqual([]));
  it("blocks oversized cursor pages", () => expect(validateCursorPage({ version: "used-cars-cursor-page/v1", items: Array.from({ length: 101 }), nextCursor: null, snapshotAt: "2026-09-01", totalCountExcluded: true })).toContain("PAGE_SIZE_EXCEEDED"));
  it("requires notice and does not auto-sunset", () => expect(validateApiDeprecation({ endpointId: "e", currentVersion: "v1", replacementVersion: "v2", announcedAt: "2026-09-01", sunsetAt: "2026-12-01", migrationGuideChecksum: `sha256:${"a".repeat(64)}`, affectedTenantNotificationComplete: true, usageBelowThreshold: true, securityEmergency: false })).toMatchObject({ readyToSunset: true, automaticSunsetAuthorized: false }));
});
