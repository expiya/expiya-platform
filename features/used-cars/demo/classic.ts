export type DemoClassicClaim = "ORIGINAL" | "MATCHING_NUMBERS" | "COLLECTIBLE" | "PERIOD_CORRECT";
export interface DemoClassicClaimDisposition { readonly claim: DemoClassicClaim; readonly display: "DEALER_DECLARATION" | "HIDDEN"; readonly specialistRequired: true }
export const DEMO_CLASSIC_CLAIMS: readonly DemoClassicClaimDisposition[] = Object.freeze([
  { claim: "ORIGINAL", display: "DEALER_DECLARATION", specialistRequired: true },
  { claim: "MATCHING_NUMBERS", display: "HIDDEN", specialistRequired: true },
  { claim: "COLLECTIBLE", display: "DEALER_DECLARATION", specialistRequired: true },
  { claim: "PERIOD_CORRECT", display: "HIDDEN", specialistRequired: true },
]);
export const isClassicClaimVerified = (claim: DemoClassicClaimDisposition) => claim.display === ("EXPIYA_VERIFIED" as string);
