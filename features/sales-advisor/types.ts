export const SALES_ADVISOR_VERSION = "2.0.0" as const;
export const VARIANT_CONTENT_SCHEMA_VERSION = "variant-content/v2" as const;

export interface ApprovedDecisionNeed {
  readonly concept: string;
  readonly summary: string;
  readonly value?: string | number | readonly string[];
}

export type ClaimDisposition = "VERIFIED" | "FAMILY_LEVEL" | "REPRESENTATIVE" | "APPROXIMATE" | "NO_CLAIM";

export interface Phase2HandoffPayload {
  readonly version: typeof SALES_ADVISOR_VERSION;
  readonly conversationId: string;
  readonly decisionFingerprint: string;
  readonly offerId: string;
  readonly selectedExactVariantId: string;
  readonly catalogRelease: string;
  readonly catalogFingerprint: string;
  readonly approvedNeeds: readonly ApprovedDecisionNeed[];
  readonly personaMatchSummary: readonly string[];
  readonly recommendationTerms: { readonly version: string; readonly acceptedAt: string };
  readonly decisionStateDigest: string;
  readonly nonce: string;
  readonly issuedAt: string;
  readonly expiresAt: string;
}

export interface PublicVariantFact {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly dailyMeaning?: string;
  readonly dailyExample?: string;
  readonly classComparison?: {
    readonly text: string;
    readonly peerCount: number;
    readonly dataCount: number;
    readonly basis: string;
    readonly gaugePosition?: "LOW" | "MID" | "HIGH";
    readonly gaugeTone?: "PERFORMANCE" | "NEUTRAL";
  };
  readonly disposition: ClaimDisposition;
  readonly scopeNote?: string;
  readonly source?: { readonly label: string; readonly url: string; readonly accessedAt: string };
  readonly visual?: { readonly swatchHex: `#${string}`; readonly approximation: true };
}

export interface VariantContentArtifact {
  readonly schemaVersion: typeof VARIANT_CONTENT_SCHEMA_VERSION;
  readonly artifactVersion: string;
  readonly exactVariantId: string;
  readonly catalogRelease: string;
  readonly catalogFingerprint: string;
  readonly title: string;
  readonly identity: { readonly brand: string; readonly model: string; readonly trim: string; readonly modelYear: number };
  readonly facts: readonly PublicVariantFact[];
  readonly equipment: readonly PublicVariantFact[];
  readonly colors: readonly PublicVariantFact[];
  readonly media: readonly { readonly url: string; readonly alt: string; readonly disposition: ClaimDisposition; readonly label: string; readonly attribution?: string }[];
  readonly video?: { readonly provider: "YOUTUBE" | "VIMEO"; readonly sourceUrl: string; readonly embedUrl: string; readonly title: string; readonly disposition: "VERIFIED" };
  readonly price: { readonly status: "VERIFIED" | "ESTIMATED" | "UNAVAILABLE"; readonly display: string; readonly note: string };
  readonly researchStatus: { readonly lastReviewedAt: string; readonly exactFacts: number; readonly scopedFacts: number };
  readonly sourceChecksum: string;
  readonly checksum: string;
}
