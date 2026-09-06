import type { PublicCopyContext } from "../content/publicCopyGate";
export interface ContentReviewResult { readonly contentId: string; readonly context: PublicCopyContext; readonly checksum: string; readonly forbiddenLanguageScanPassed: boolean; readonly trustLabelReviewPassed: boolean; readonly legalReviewPassed: boolean; readonly accessibilityReviewPassed: boolean; readonly evidenceReviewPassed: boolean; readonly classicSpecialistReviewPassed: boolean | null; readonly sponsorshipSeparationReviewPassed: boolean | null; readonly reviewerIds: readonly string[]; readonly syntheticOnly: true }

export function assessContentReviewSuite(results: readonly ContentReviewResult[], requiredContentIds: readonly string[]) {
  const checksum = /^sha256:[a-f0-9]{64}$/u;
  const missing = requiredContentIds.filter((contentId) => !results.some((result) => result.contentId === contentId && checksum.test(result.checksum) && result.forbiddenLanguageScanPassed && result.trustLabelReviewPassed && result.legalReviewPassed && result.accessibilityReviewPassed && result.evidenceReviewPassed && (result.context !== "CLASSIC" || result.classicSpecialistReviewPassed === true) && (result.context !== "SPONSORED" || result.sponsorshipSeparationReviewPassed === true) && result.reviewerIds.length >= 4 && new Set(result.reviewerIds).size === result.reviewerIds.length && result.syntheticOnly));
  return Object.freeze({ complete: missing.length === 0, missing: Object.freeze(missing), publicCopyPublicationAuthorized: false as const, automatedCopyPublicationAuthorized: false as const });
}
