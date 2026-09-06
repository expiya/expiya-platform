import { describe, expect, it } from "vitest";
import { detectDuplicateSignals, evaluateRiskSignals, type UsedCarRiskSignal } from "./fraud/contracts";
import { canTransitionMedia, evaluatePublicMediaGate, type UsedCarMediaAsset } from "./media/contracts";

const safeRendition: UsedCarMediaAsset = {
  id: "media-public-1", tenantId: "tenant-a", inventoryUnitId: "unit-1",
  kind: "VEHICLE_IMAGE", state: "PUBLIC_RENDITION_READY", storageClass: "PUBLIC_RENDITION",
  declaredMimeType: "image/webp", detectedMimeType: "image/webp", byteSize: 400_000,
  sha256: "sha256:asset", malwareScan: "PASSED", exifRemoved: true, piiReview: "PASSED",
  identityReview: "PASSED", rightsConfirmed: true, derivedFromAssetId: "media-original-1",
};

describe("used-cars media quarantine boundary", () => {
  it("publishes only a fully gated derived image rendition", () => {
    expect(evaluatePublicMediaGate(safeRendition)).toEqual({ publishable: true, codes: [] });
  });

  it("fails closed when any security, privacy, identity or rights gate is missing", () => {
    const variants: readonly [Partial<UsedCarMediaAsset>, string][] = [
      [{ state: "UPLOADED_QUARANTINED", storageClass: "QUARANTINE_PRIVATE" }, "NOT_PUBLIC_RENDITION"],
      [{ malwareScan: "ERROR" }, "MALWARE_SCAN_REQUIRED"],
      [{ exifRemoved: false }, "EXIF_NOT_REMOVED"],
      [{ piiReview: "MANUAL_REVIEW" }, "PII_REVIEW_REQUIRED"],
      [{ identityReview: "FAILED" }, "IDENTITY_REVIEW_REQUIRED"],
      [{ rightsConfirmed: false }, "RIGHTS_NOT_CONFIRMED"],
      [{ detectedMimeType: "text/html" }, "MIME_NOT_ALLOWED"],
      [{ derivedFromAssetId: undefined }, "DERIVATION_MISSING"],
    ];
    for (const [change, code] of variants) {
      const result = evaluatePublicMediaGate({ ...safeRendition, ...change });
      expect(result.publishable, code).toBe(false);
      expect(result.codes, code).toContain(code);
    }
  });

  it("never publishes documents and forbids quarantine bypass", () => {
    expect(evaluatePublicMediaGate({ ...safeRendition, kind: "DOCUMENT" }).codes).toContain("DOCUMENT_PUBLICATION_FORBIDDEN");
    expect(canTransitionMedia("UPLOADED_QUARANTINED", "PUBLIC_RENDITION_READY")).toBe(false);
    expect(canTransitionMedia("UPLOADED_QUARANTINED", "STRUCTURE_VALIDATED")).toBe(true);
    expect(canTransitionMedia("REJECTED", "PUBLIC_RENDITION_READY")).toBe(false);
    expect(canTransitionMedia("REVOKED", "PUBLIC_RENDITION_READY")).toBe(false);
  });
});

describe("used-cars duplicate and fraud signal boundary", () => {
  it("detects fingerprint and perceptual-image duplicate candidates without declaring fraud", () => {
    const subject = { tenantId: "tenant-a", inventoryUnitId: "unit-a", vinFingerprint: "vin-1", plateFingerprint: "plate-1", imagePerceptualHashes: ["phash-1"], active: true };
    const signals = detectDuplicateSignals(subject, [
      { ...subject, inventoryUnitId: "unit-same-tenant", imagePerceptualHashes: [] },
      { ...subject, tenantId: "tenant-b", inventoryUnitId: "unit-cross-tenant", plateFingerprint: "plate-2", imagePerceptualHashes: [] },
      { ...subject, tenantId: "tenant-c", inventoryUnitId: "unit-image", vinFingerprint: "vin-3", plateFingerprint: "plate-3" },
    ]);
    expect(signals).toEqual(["DUPLICATE_VIN_SAME_TENANT", "DUPLICATE_PLATE_ACTIVE", "DUPLICATE_VIN_CROSS_TENANT", "DUPLICATE_IMAGE"]);
  });

  it("requires human review and blocks high risk without automatic fraud conclusion", () => {
    const signal = (severity: UsedCarRiskSignal["severity"], status: UsedCarRiskSignal["status"] = "OPEN"): UsedCarRiskSignal => ({
      id: `signal-${severity}`, tenantId: "tenant-a", inventoryUnitId: "unit-1",
      code: "MILEAGE_ROLLBACK", severity, evidenceReferenceIds: ["evidence-1"],
      detectedAt: "2026-09-01T00:00:00.000Z", detectorVersion: "v1", status,
    });
    expect(evaluateRiskSignals([signal("HIGH")])).toEqual({ publicationBlocked: true, manualReviewRequired: true, automaticFraudConclusion: false, signalCodes: ["MILEAGE_ROLLBACK"] });
    expect(evaluateRiskSignals([signal("LOW")])).toMatchObject({ publicationBlocked: false, manualReviewRequired: true, automaticFraudConclusion: false });
    expect(evaluateRiskSignals([signal("CRITICAL", "DISMISSED")])).toEqual({ publicationBlocked: false, manualReviewRequired: false, automaticFraudConclusion: false, signalCodes: [] });
  });
});

