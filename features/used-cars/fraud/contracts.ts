export type UsedCarRiskSignalCode =
  | "DUPLICATE_VIN_SAME_TENANT" | "DUPLICATE_VIN_CROSS_TENANT"
  | "DUPLICATE_PLATE_ACTIVE" | "DUPLICATE_IMAGE"
  | "MILEAGE_ROLLBACK" | "PRICE_OUTLIER" | "DOCUMENT_REUSE"
  | "IDENTITY_CONFLICT" | "RAPID_ACCOUNT_STOCK_BURST" | "REPEATED_USER_COMPLAINT";

export type RiskSignalSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface UsedCarRiskSignal {
  readonly id: string;
  readonly tenantId: string;
  readonly inventoryUnitId: string;
  readonly code: UsedCarRiskSignalCode;
  readonly severity: RiskSignalSeverity;
  readonly evidenceReferenceIds: readonly string[];
  readonly detectedAt: string;
  readonly detectorVersion: string;
  readonly status: "OPEN" | "DISMISSED" | "CONFIRMED" | "SUPERSEDED";
}

export interface UsedCarRiskDisposition {
  readonly publicationBlocked: boolean;
  readonly manualReviewRequired: boolean;
  readonly automaticFraudConclusion: false;
  readonly signalCodes: readonly UsedCarRiskSignalCode[];
}

export function evaluateRiskSignals(signals: readonly UsedCarRiskSignal[]): UsedCarRiskDisposition {
  const active = signals.filter((signal) => signal.status === "OPEN" || signal.status === "CONFIRMED");
  const publicationBlocked = active.some((signal) => signal.severity === "HIGH" || signal.severity === "CRITICAL");
  return Object.freeze({
    publicationBlocked,
    manualReviewRequired: active.length > 0,
    automaticFraudConclusion: false,
    signalCodes: Object.freeze([...new Set(active.map((signal) => signal.code))]),
  });
}

export interface DuplicateCandidateInput {
  readonly tenantId: string;
  readonly inventoryUnitId: string;
  readonly vinFingerprint?: string;
  readonly plateFingerprint?: string;
  readonly imagePerceptualHashes: readonly string[];
  readonly active: boolean;
}

export function detectDuplicateSignals(subject: DuplicateCandidateInput, candidates: readonly DuplicateCandidateInput[]): readonly UsedCarRiskSignalCode[] {
  const codes = new Set<UsedCarRiskSignalCode>();
  for (const candidate of candidates) {
    if (candidate.inventoryUnitId === subject.inventoryUnitId || !candidate.active) continue;
    if (subject.vinFingerprint && subject.vinFingerprint === candidate.vinFingerprint) codes.add(subject.tenantId === candidate.tenantId ? "DUPLICATE_VIN_SAME_TENANT" : "DUPLICATE_VIN_CROSS_TENANT");
    if (subject.plateFingerprint && subject.plateFingerprint === candidate.plateFingerprint) codes.add("DUPLICATE_PLATE_ACTIVE");
    if (subject.imagePerceptualHashes.some((hash) => candidate.imagePerceptualHashes.includes(hash))) codes.add("DUPLICATE_IMAGE");
  }
  return Object.freeze([...codes]);
}

