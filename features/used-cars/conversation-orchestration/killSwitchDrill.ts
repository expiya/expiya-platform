export type ConversationKillScope = "TENANT" | "CHANNEL" | "PROVIDER" | "MODEL" | "INVENTORY" | "COUNTRY";
export const requiredConversationKillScopes: readonly ConversationKillScope[] = Object.freeze(["TENANT", "CHANNEL", "PROVIDER", "MODEL", "INVENTORY", "COUNTRY"]);
export interface ConversationKillSwitchResult { readonly scope: ConversationKillScope; readonly syntheticOnly: true; readonly sessionsBlocked: boolean; readonly newToolCallsBlocked: boolean; readonly pendingOffersInvalidated: boolean; readonly auditPreserved: boolean; readonly humanFallbackShown: boolean; readonly completedAt: string | null; readonly evidenceChecksum: string }
export function assessConversationKillSwitchDrill(results: readonly ConversationKillSwitchResult[]) {
  const missing = requiredConversationKillScopes.filter((scope) => !results.some((result) => result.scope === scope && result.syntheticOnly && result.sessionsBlocked && result.newToolCallsBlocked && result.pendingOffersInvalidated && result.auditPreserved && result.humanFallbackShown && result.completedAt && /^sha256:[a-f0-9]{64}$/u.test(result.evidenceChecksum)));
  return Object.freeze({ complete: missing.length === 0, missing: Object.freeze(missing), automaticRestartAuthorized: false as const, realChannelMutationAuthorized: false as const });
}
