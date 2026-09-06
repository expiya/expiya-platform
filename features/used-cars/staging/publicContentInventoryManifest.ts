import type { PublicCopyContext } from "../content/publicCopyGate";
export interface PublicContentInventoryEntry { readonly contentId: string; readonly context: PublicCopyContext; readonly routePattern: string; readonly locale: "tr-TR"; readonly sourceRef: string | null; readonly evidenceBindingRequired: boolean; readonly safeNextStepRequired: boolean; readonly sponsoredLabelRequired: boolean; readonly approvedVersion: null; readonly publicationEnabled: false }

export const usedCarsStagingPublicContentInventory: readonly PublicContentInventoryEntry[] = Object.freeze([
  { contentId: "COPY-LISTING", context: "LISTING", routePattern: "/ikinciel/arac/:id", locale: "tr-TR", sourceRef: null, evidenceBindingRequired: true, safeNextStepRequired: true, sponsoredLabelRequired: false, approvedVersion: null, publicationEnabled: false },
  { contentId: "COPY-MATCH", context: "MATCH_EXPLANATION", routePattern: "/ikinciel/eslesmeler", locale: "tr-TR", sourceRef: null, evidenceBindingRequired: true, safeNextStepRequired: true, sponsoredLabelRequired: false, approvedVersion: null, publicationEnabled: false },
  { contentId: "COPY-DEALER", context: "DEALER_PROFILE", routePattern: "/ikinciel/satici/:id", locale: "tr-TR", sourceRef: null, evidenceBindingRequired: false, safeNextStepRequired: false, sponsoredLabelRequired: false, approvedVersion: null, publicationEnabled: false },
  { contentId: "COPY-SPONSORED", context: "SPONSORED", routePattern: "/ikinciel", locale: "tr-TR", sourceRef: null, evidenceBindingRequired: false, safeNextStepRequired: false, sponsoredLabelRequired: true, approvedVersion: null, publicationEnabled: false },
  { contentId: "COPY-CLASSIC", context: "CLASSIC", routePattern: "/ikinciel/arac/:id", locale: "tr-TR", sourceRef: null, evidenceBindingRequired: true, safeNextStepRequired: true, sponsoredLabelRequired: false, approvedVersion: null, publicationEnabled: false },
  { contentId: "COPY-LEAD", context: "LEAD_CTA", routePattern: "/ikinciel/arac/:id/iletisim", locale: "tr-TR", sourceRef: null, evidenceBindingRequired: false, safeNextStepRequired: false, sponsoredLabelRequired: false, approvedVersion: null, publicationEnabled: false },
  { contentId: "COPY-AI", context: "AI_RESPONSE", routePattern: "/ikinciel", locale: "tr-TR", sourceRef: null, evidenceBindingRequired: true, safeNextStepRequired: true, sponsoredLabelRequired: false, approvedVersion: null, publicationEnabled: false },
]);

export function validatePublicContentInventoryManifest(entries: readonly PublicContentInventoryEntry[]) {
  const contexts: readonly PublicCopyContext[] = ["LISTING", "MATCH_EXPLANATION", "DEALER_PROFILE", "SPONSORED", "CLASSIC", "LEAD_CTA", "AI_RESPONSE"];
  const codes: string[] = [];
  for (const context of contexts) if (!entries.some((item) => item.context === context)) codes.push(`CONTEXT_REQUIRED:${context}`);
  if (new Set(entries.map((item) => item.contentId)).size !== entries.length) codes.push("DUPLICATE_CONTENT_ID");
  for (const entry of entries) {
    if (["LISTING", "MATCH_EXPLANATION", "CLASSIC", "AI_RESPONSE"].includes(entry.context) && !entry.safeNextStepRequired) codes.push(`SAFE_NEXT_STEP_POLICY_REQUIRED:${entry.contentId}`);
    if (entry.context === "SPONSORED" && !entry.sponsoredLabelRequired) codes.push("SPONSORED_LABEL_POLICY_REQUIRED");
    if (entry.sourceRef || entry.approvedVersion !== null || entry.publicationEnabled) codes.push(`PUBLICATION_ENABLEMENT_FORBIDDEN:${entry.contentId}`);
  }
  return Object.freeze({ valid: codes.length === 0, codes: Object.freeze(codes), contentPublicationAuthorized: false as const });
}
