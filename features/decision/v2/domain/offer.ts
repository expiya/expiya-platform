import type { RecommendationEligibility } from "./affordability";

export type OfferMode = "FAMILY_DIVERSE" | "TRIM_COMPARISON" | "PRICE_UNVERIFIED_ALTERNATIVES";
export type OfferLifecycleState = "CREATED" | "CONSENTED" | "REVEALED" | "EXPIRED" | "REVOKED";

export interface AuthorizedCandidateRef {
  readonly exactVariantId: string;
  readonly modelFamilyId: string;
  readonly authorizationId: string;
  readonly eligibility: RecommendationEligibility;
}

export interface GovernedOffer {
  readonly offerId: string;
  readonly mode: OfferMode;
  readonly candidates: readonly AuthorizedCandidateRef[];
  readonly explicitTrimComparisonRequested: boolean;
  readonly explicitPriceUnverifiedConsent: boolean;
  readonly catalogFingerprint: string;
  readonly decisionFingerprint: string;
  readonly expiresAt: string;
  readonly lifecycleState: OfferLifecycleState;
}
