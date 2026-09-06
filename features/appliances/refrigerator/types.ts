import type { AppliancesDecisionCard } from "../recommendation/publicCard";

export interface RefrigeratorDecisionArtifact {
  readonly schemaVersion: "refrigerator-recommendation-artifact/v1";
  readonly conversationId: string;
  readonly contextRevision: number;
  readonly selectedProductId: string;
  readonly eligibleProductIds: readonly string[];
  readonly acceptedEventIds: readonly string[];
  readonly authorityDigest: string;
  readonly artifactFingerprint: string;
}

export interface RefrigeratorDecisionAuthorization {
  readonly schemaVersion: "refrigerator-decision-authorization/v1";
  readonly conversationId: string;
  readonly contextRevision: number;
  readonly productId: string;
  readonly artifactFingerprint: string;
  readonly authorityFingerprint: string;
}

export interface RefrigeratorDecisionRecord {
  readonly artifact: RefrigeratorDecisionArtifact;
  readonly authorization: RefrigeratorDecisionAuthorization;
  readonly card: AppliancesDecisionCard;
}
