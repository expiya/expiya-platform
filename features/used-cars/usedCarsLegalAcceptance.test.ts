import { describe, expect, it } from "vitest";
import { evaluateReacceptance, validateLegalAcceptanceReceipt } from "./legal/acceptance";
const checksum = `sha256:${"c".repeat(64)}`;
describe("used-cars legal acceptance", () => {
  it("validates immutable content evidence", () => expect(validateLegalAcceptanceReceipt({ receiptId: "r", artifactId: "a", artifactKind: "B2C_TERMS", artifactVersion: "1", contentChecksum: checksum, subjectType: "B2C_USER", subjectReference: "user-ref", purpose: "service", acceptedAt: "2026-09-01", acceptanceMethod: "CLICKWRAP", locale: "tr-TR", withdrawnAt: null })).toEqual([]));
  it("requires reacceptance after a material content change", () => expect(evaluateReacceptance({ previousChecksum: checksum, nextChecksum: `sha256:${"d".repeat(64)}`, materiality: "MATERIAL" })).toMatchObject({ reacceptanceRequired: true, automaticConsentMigrationAuthorized: false }));
  it("preserves prior receipts as audit evidence", () => expect(evaluateReacceptance({ previousChecksum: checksum, nextChecksum: checksum, materiality: "NON_MATERIAL" }).priorReceiptRemainsAuditEvidence).toBe(true));
});
