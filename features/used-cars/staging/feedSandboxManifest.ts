import type { InventoryImportSource } from "../inventory/importContract";
export interface FeedSandboxChannel { readonly source: InventoryImportSource; readonly endpointRef: string | null; readonly serviceAccountRef: string | null; readonly secretKeyRef: string | null; readonly tenantId: "synthetic-feed-tenant"; readonly taxonomyReleaseVersion: "tr-used-pilot-0.1.0"; readonly maximumRows: 10_000; readonly validateOnlyDefault: true; readonly realDealerDataAllowed: false; readonly inventoryWriteEnabled: false; readonly configured: false }
export const usedCarsStagingFeedSandboxChannels: readonly FeedSandboxChannel[] = Object.freeze([
  "CSV", "XLSX", "SFTP_FEED", "PULL_API", "PUSH_API",
].map((source) => ({ source: source as InventoryImportSource, endpointRef: null, serviceAccountRef: null, secretKeyRef: null, tenantId: "synthetic-feed-tenant" as const, taxonomyReleaseVersion: "tr-used-pilot-0.1.0" as const, maximumRows: 10_000 as const, validateOnlyDefault: true as const, realDealerDataAllowed: false as const, inventoryWriteEnabled: false as const, configured: false as const })));
export function validateFeedSandboxManifest(channels: readonly FeedSandboxChannel[]) {
  const required: readonly InventoryImportSource[] = ["CSV", "XLSX", "SFTP_FEED", "PULL_API", "PUSH_API"];
  const codes: string[] = [];
  for (const source of required) if (!channels.some((item) => item.source === source)) codes.push(`SOURCE_REQUIRED:${source}`);
  for (const item of channels) { if (!item.validateOnlyDefault || item.realDealerDataAllowed || item.inventoryWriteEnabled || item.maximumRows !== 10_000) codes.push(`SANDBOX_POLICY_INVALID:${item.source}`); if (item.endpointRef || item.serviceAccountRef || item.secretKeyRef || item.configured) codes.push(`SANDBOX_ENABLEMENT_FORBIDDEN:${item.source}`); }
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), realFeedConnectionAuthorized: false as const, inventoryWriteAuthorized: false as const });
}
