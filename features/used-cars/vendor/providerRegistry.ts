export type ProviderCapability = "IDENTITY" | "DATABASE" | "OBJECT_STORAGE" | "MALWARE_SCANNING" | "KMS" | "EMAIL_SMS" | "CHANNEL_MESSAGING" | "LIVE_VIDEO" | "PAYMENT_BILLING" | "OBSERVABILITY_SIEM" | "AI_INFERENCE" | "BACKUP_RECOVERY";
export type ProviderDataClass = "PUBLIC" | "TENANT_CONFIDENTIAL" | "PERSONAL" | "HIGH_RISK_IDENTIFIER" | "PAYMENT_METADATA" | "MEDIA" | "AUDIT_SECURITY";
export interface ProviderRequirement {
  readonly capability: ProviderCapability;
  readonly dataClasses: readonly ProviderDataClass[];
  readonly requiredControls: readonly string[];
  readonly failClosedOnOutage: boolean;
  readonly fallbackMode: "DISABLE" | "QUEUE" | "DEGRADED_READ_ONLY";
}

export const usedCarsProviderRequirements: readonly ProviderRequirement[] = Object.freeze([
  { capability: "IDENTITY", dataClasses: ["PERSONAL", "AUDIT_SECURITY"], requiredControls: ["MFA", "OIDC_AUDIENCE_ISOLATION", "SCIM_OR_CONTROLLED_LIFECYCLE", "BREACH_NOTICE"], failClosedOnOutage: true, fallbackMode: "DISABLE" },
  { capability: "DATABASE", dataClasses: ["TENANT_CONFIDENTIAL", "PERSONAL", "HIGH_RISK_IDENTIFIER"], requiredControls: ["RLS", "ENCRYPTION", "PITR", "REGION_DISCLOSURE"], failClosedOnOutage: true, fallbackMode: "DISABLE" },
  { capability: "OBJECT_STORAGE", dataClasses: ["MEDIA", "HIGH_RISK_IDENTIFIER"], requiredControls: ["PRIVATE_BY_DEFAULT", "SIGNED_URL", "RETENTION_DELETE", "REGION_DISCLOSURE"], failClosedOnOutage: true, fallbackMode: "DISABLE" },
  { capability: "MALWARE_SCANNING", dataClasses: ["MEDIA"], requiredControls: ["QUARANTINE", "SIGNATURE_UPDATE", "NO_TRAINING_REUSE"], failClosedOnOutage: true, fallbackMode: "QUEUE" },
  { capability: "KMS", dataClasses: ["HIGH_RISK_IDENTIFIER", "AUDIT_SECURITY"], requiredControls: ["KEY_ROTATION", "DUAL_CONTROL", "RECOVERY_TEST"], failClosedOnOutage: true, fallbackMode: "DISABLE" },
  { capability: "EMAIL_SMS", dataClasses: ["PERSONAL"], requiredControls: ["CONSENT_PURPOSE", "DELIVERY_LOG_REDACTION", "SUPPRESSION"], failClosedOnOutage: false, fallbackMode: "QUEUE" },
  { capability: "CHANNEL_MESSAGING", dataClasses: ["PERSONAL", "TENANT_CONFIDENTIAL"], requiredControls: ["EXPLICIT_HANDOFF_CONSENT", "WEBHOOK_SIGNATURE", "RETENTION_CONTROL"], failClosedOnOutage: false, fallbackMode: "DISABLE" },
  { capability: "LIVE_VIDEO", dataClasses: ["PERSONAL", "MEDIA"], requiredControls: ["EPHEMERAL_ROOM", "RECORDING_OFF_DEFAULT", "PARTICIPANT_CONSENT"], failClosedOnOutage: false, fallbackMode: "DISABLE" },
  { capability: "PAYMENT_BILLING", dataClasses: ["PAYMENT_METADATA", "PERSONAL"], requiredControls: ["PCI_SCOPE_MINIMIZATION", "SIGNED_WEBHOOK", "REFUND_DISPUTE"], failClosedOnOutage: true, fallbackMode: "DISABLE" },
  { capability: "OBSERVABILITY_SIEM", dataClasses: ["AUDIT_SECURITY"], requiredControls: ["LOG_REDACTION", "TENANT_DIMENSION_CONTROL", "RETENTION_CONTROL"], failClosedOnOutage: false, fallbackMode: "QUEUE" },
  { capability: "AI_INFERENCE", dataClasses: ["TENANT_CONFIDENTIAL", "PERSONAL"], requiredControls: ["NO_TRAINING_REUSE", "DATA_MINIMIZATION", "REGION_DISCLOSURE", "MODEL_VERSION_AUDIT"], failClosedOnOutage: false, fallbackMode: "DEGRADED_READ_ONLY" },
  { capability: "BACKUP_RECOVERY", dataClasses: ["TENANT_CONFIDENTIAL", "PERSONAL", "HIGH_RISK_IDENTIFIER"], requiredControls: ["IMMUTABLE_BACKUP", "EXPIRY_DELETE", "RESTORE_ISOLATION", "REGION_DISCLOSURE"], failClosedOnOutage: false, fallbackMode: "DEGRADED_READ_ONLY" },
]);

export function validateProviderRequirementRegistry(requirements: readonly ProviderRequirement[]) {
  const capabilities = requirements.map((item) => item.capability);
  const codes: string[] = [];
  if (new Set(capabilities).size !== capabilities.length) codes.push("DUPLICATE_CAPABILITY");
  if (requirements.some((item) => item.dataClasses.length === 0)) codes.push("DATA_CLASS_REQUIRED");
  if (requirements.some((item) => item.requiredControls.length === 0)) codes.push("CONTROL_SET_REQUIRED");
  if (requirements.some((item) => item.failClosedOnOutage && item.fallbackMode === "DEGRADED_READ_ONLY")) codes.push("FAIL_CLOSED_FALLBACK_CONFLICT");
  return Object.freeze(codes);
}
