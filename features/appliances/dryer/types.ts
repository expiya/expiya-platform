import type { AppliancesDecisionCard } from "../recommendation/publicCard";

export interface DryerDecisionArtifact {
  readonly schemaVersion: "dryer-recommendation-artifact/v1";
  readonly conversationId: string;
  readonly contextRevision: number;
  readonly selectedProductId: string;
  readonly eligibleProductIds: readonly string[];
  readonly acceptedEventIds: readonly string[];
  readonly authorityDigest: string;
  readonly artifactFingerprint: string;
}
export interface DryerDecisionAuthorization {
  readonly schemaVersion: "dryer-decision-authorization/v1";
  readonly conversationId: string;
  readonly contextRevision: number;
  readonly productId: string;
  readonly artifactFingerprint: string;
  readonly authorityFingerprint: string;
}
export interface DryerDecisionRecord { readonly artifact: DryerDecisionArtifact; readonly authorization: DryerDecisionAuthorization; readonly card: AppliancesDecisionCard }
