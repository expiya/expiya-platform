export interface FingerprintPolicy {
  readonly policyId: "cars-conversation-memory-fingerprint";
  readonly version: string;
  readonly algorithm: "SHA-256";
  readonly canonicalizationVersion: string;
}

export const CARS_MEMORY_FINGERPRINT_POLICY_V1: FingerprintPolicy = Object.freeze({
  policyId: "cars-conversation-memory-fingerprint",
  version: "1.0.0",
  algorithm: "SHA-256",
  canonicalizationVersion: "json-nfc-sorted-keys-v1",
});

export interface DecisionFingerprintPolicy {
  readonly policyId: "cars-conversation-decision-fingerprint";
  readonly version: string;
  readonly algorithm: "SHA-256";
  readonly canonicalizationVersion: string;
  readonly payloadSchemaVersion: 1;
}

export const CARS_DECISION_FINGERPRINT_POLICY_V1: DecisionFingerprintPolicy = Object.freeze({
  policyId: "cars-conversation-decision-fingerprint",
  version: "1.0.0",
  algorithm: "SHA-256",
  canonicalizationVersion: "json-nfc-sorted-keys-v1",
  payloadSchemaVersion: 1,
});
