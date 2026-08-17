export type CatalogSnapshotAvailability = "AVAILABLE" | "UNAVAILABLE";
export type CatalogConversationResolution =
  | "CONTINUE_PINNED_SNAPSHOT"
  | "CATALOG_SNAPSHOT_UNAVAILABLE"
  | "RESTART_WITH_ACTIVE_CATALOG";

export interface CatalogConversationPinningPolicy {
  readonly policyId: "cars-conversation-catalog-pinning";
  readonly version: "1.0.0";
  readonly pinAtConversationStart: true;
  readonly silentlyMigrateActiveConversation: false;
  readonly newConversationUsesCurrentActiveRelease: true;
  readonly unavailableSnapshotResult: "CATALOG_SNAPSHOT_UNAVAILABLE";
  readonly userMayRestartWithActiveCatalog: true;
}

export const CARS_CATALOG_CONVERSATION_PINNING_POLICY_V1: CatalogConversationPinningPolicy = Object.freeze({
  policyId: "cars-conversation-catalog-pinning",
  version: "1.0.0",
  pinAtConversationStart: true,
  silentlyMigrateActiveConversation: false,
  newConversationUsesCurrentActiveRelease: true,
  unavailableSnapshotResult: "CATALOG_SNAPSHOT_UNAVAILABLE",
  userMayRestartWithActiveCatalog: true,
});
