export const RECOMMENDATION_TERMS_VERSION = "REC-2026.08-v1.0";

export interface RecommendationTermsAcceptance {
  readonly version: typeof RECOMMENDATION_TERMS_VERSION;
  readonly acceptedAt: string;
}

export function createRecommendationTermsAcceptance(): RecommendationTermsAcceptance {
  return {
    version: RECOMMENDATION_TERMS_VERSION,
    acceptedAt: new Date().toISOString(),
  };
}
