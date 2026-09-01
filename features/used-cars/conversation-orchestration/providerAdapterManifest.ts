export type ConversationProviderCapability = "MESSAGING" | "LIVE_VIDEO" | "AI_MODEL";
export interface ConversationProviderAdapterManifest { readonly capability: ConversationProviderCapability; readonly providerCode: string | null; readonly opaqueSubjectIds: true; readonly shortLivedSingleUseTokens: true; readonly signedTimestampedWebhooks: true; readonly replayProtection: true; readonly recordingDefaultOff: true; readonly transcriptionDefaultOff: true; readonly trainingUseDefaultOff: true; readonly dataLocationReviewed: false; readonly dpaApproved: false; readonly productionEnabled: false }
export function validateConversationProviderAdapter(manifest: ConversationProviderAdapterManifest) {
  const codes: string[] = [];
  if (manifest.providerCode !== null || manifest.dataLocationReviewed || manifest.dpaApproved || manifest.productionEnabled) codes.push("PROVIDER_ACTIVATION_PREMATURE");
  if (!manifest.opaqueSubjectIds || !manifest.shortLivedSingleUseTokens || !manifest.signedTimestampedWebhooks || !manifest.replayProtection) codes.push("SECURITY_CONTROL_REQUIRED");
  if (!manifest.recordingDefaultOff || !manifest.transcriptionDefaultOff || !manifest.trainingUseDefaultOff) codes.push("PRIVACY_DEFAULT_INVALID");
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), realSessionAuthorized: false as const });
}
