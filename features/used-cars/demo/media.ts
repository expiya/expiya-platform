export const DEMO_MEDIA_JOBS = Object.freeze([
  { id: "demo-media-901", file: "front-three-quarter.jpg", kind: "IMAGE", mime: "image/jpeg", size: "3.2 MB", malware: "PASSED", pii: "EXIF_REMOVED", state: "READY" },
  { id: "demo-media-902", file: "service-history.pdf", kind: "DOCUMENT", mime: "application/pdf", size: "1.1 MB", malware: "PASSED", pii: "RESTRICTED", state: "QUARANTINED" },
  { id: "demo-media-903", file: "archive.zip", kind: "ARCHIVE", mime: "application/zip", size: "8.7 MB", malware: "NOT_SCANNED", pii: "UNKNOWN", state: "REJECTED" },
]);
export const DEMO_FRAUD_SIGNALS = Object.freeze([
  { signal: "DUPLICATE_VIN", result: "CLEAR", action: "NONE" },
  { signal: "IMAGE_REUSE", result: "REVIEW", action: "MODERATOR_QUEUE" },
  { signal: "PRICE_ANOMALY", result: "UNAVAILABLE", action: "NO_UNSOURCED_CLAIM" },
]);

