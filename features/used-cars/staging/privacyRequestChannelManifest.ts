export type PrivacyRequestChannel = "WEB_FORM" | "REGISTERED_EMAIL" | "POSTAL" | "IN_PERSON";
export interface PrivacyRequestChannelEntry { readonly channel: PrivacyRequestChannel; readonly intakeEndpointRef: string | null; readonly ownerQueueRef: string | null; readonly attachmentAllowed: boolean; readonly malwareScanRequired: true; readonly rawIdentityDocumentRetentionAllowed: false; readonly acknowledgementRequired: true; readonly configured: false }

export const usedCarsStagingPrivacyRequestChannels: readonly PrivacyRequestChannelEntry[] = Object.freeze([
  { channel: "WEB_FORM", intakeEndpointRef: null, ownerQueueRef: null, attachmentAllowed: false, malwareScanRequired: true, rawIdentityDocumentRetentionAllowed: false, acknowledgementRequired: true, configured: false },
  { channel: "REGISTERED_EMAIL", intakeEndpointRef: null, ownerQueueRef: null, attachmentAllowed: true, malwareScanRequired: true, rawIdentityDocumentRetentionAllowed: false, acknowledgementRequired: true, configured: false },
  { channel: "POSTAL", intakeEndpointRef: null, ownerQueueRef: null, attachmentAllowed: true, malwareScanRequired: true, rawIdentityDocumentRetentionAllowed: false, acknowledgementRequired: true, configured: false },
  { channel: "IN_PERSON", intakeEndpointRef: null, ownerQueueRef: null, attachmentAllowed: true, malwareScanRequired: true, rawIdentityDocumentRetentionAllowed: false, acknowledgementRequired: true, configured: false },
]);

export function validatePrivacyRequestChannelManifest(channels: readonly PrivacyRequestChannelEntry[]) {
  const required: readonly PrivacyRequestChannel[] = ["WEB_FORM", "REGISTERED_EMAIL", "POSTAL", "IN_PERSON"];
  const codes: string[] = [];
  for (const channel of required) if (!channels.some((item) => item.channel === channel)) codes.push(`CHANNEL_REQUIRED:${channel}`);
  for (const channel of channels) {
    if (!channel.malwareScanRequired || channel.rawIdentityDocumentRetentionAllowed || !channel.acknowledgementRequired) codes.push(`CHANNEL_POLICY_INVALID:${channel.channel}`);
    if (channel.intakeEndpointRef || channel.ownerQueueRef || channel.configured) codes.push(`CHANNEL_ENABLEMENT_FORBIDDEN:${channel.channel}`);
  }
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), realRequestIntakeAuthorized: false as const });
}
