export interface PrivacyDeliveryBoundary { readonly exportStorageRef: string | null; readonly encryptionKeyRef: string | null; readonly singleUseTokenRequired: true; readonly maximumTokenTtlMinutes: 30; readonly stepUpAuthenticationRequired: true; readonly thirdPartyRedactionRequired: true; readonly rawAuditExportForbidden: true; readonly downloadEnabled: false }
export const usedCarsStagingPrivacyDeliveryBoundary: PrivacyDeliveryBoundary = Object.freeze({ exportStorageRef: null, encryptionKeyRef: null, singleUseTokenRequired: true, maximumTokenTtlMinutes: 30, stepUpAuthenticationRequired: true, thirdPartyRedactionRequired: true, rawAuditExportForbidden: true, downloadEnabled: false });

export function validatePrivacyDeliveryBoundary(boundary: PrivacyDeliveryBoundary) {
  const codes: string[] = [];
  if (!boundary.singleUseTokenRequired || boundary.maximumTokenTtlMinutes > 30 || !boundary.stepUpAuthenticationRequired) codes.push("SECURE_TOKEN_POLICY_REQUIRED");
  if (!boundary.thirdPartyRedactionRequired || !boundary.rawAuditExportForbidden) codes.push("EXPORT_REDACTION_POLICY_REQUIRED");
  if (boundary.exportStorageRef || boundary.encryptionKeyRef || boundary.downloadEnabled) codes.push("DELIVERY_ENABLEMENT_FORBIDDEN");
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), personalDataExportAuthorized: false as const });
}
