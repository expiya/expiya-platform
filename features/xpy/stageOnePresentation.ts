/** Versioned, presentation-only contract. It deliberately contains no ranking or authorization hooks. */
export const XPY_STAGE_ONE_PRESENTATION_VERSION = "xpy-stage1-presentation/v1" as const;

export interface XpyPresentedMedia {
  readonly status: "EXACT" | "REPRESENTATIVE" | "UNAVAILABLE";
  readonly src?: string;
  readonly alt: string;
  readonly assetId?: string;
  readonly authorityLabel?: string;
  readonly provenanceDigest?: string;
  readonly linkTarget?: string;
  readonly disclosure?: string;
  readonly cacheMode?: "PERSISTENT" | "TRANSIENT_URL_ONLY" | "NO_STORE";
}

export interface XpyPresentedItem { readonly label: string; readonly value?: string; readonly explanation?: string }
export interface XpyPresentedSource { readonly label: string; readonly href?: string; readonly observedAt?: string }
export interface XpyPresentedOffer { readonly merchant: string; readonly amount: number; readonly currency: "TRY"; readonly observedAt: string; readonly availability: string; readonly href?: string }

export interface XpyStageOneDecisionPresentation {
  readonly schemaVersion: typeof XPY_STAGE_ONE_PRESENTATION_VERSION;
  readonly exactIdentity: { readonly id: string; readonly brand: string; readonly model: string; readonly configuration: string };
  readonly media: XpyPresentedMedia;
  readonly badge: string;
  readonly reasons: readonly string[];
  readonly matchedNeeds: readonly string[];
  readonly supportingContext: readonly string[];
  readonly technicalFacts: readonly XpyPresentedItem[];
  readonly capabilities: readonly XpyPresentedItem[];
  readonly limitations: readonly string[];
  readonly offers: readonly XpyPresentedOffer[];
  readonly commerceNotice: string;
  readonly sources: readonly XpyPresentedSource[];
  readonly audit: Readonly<Record<string, unknown>>;
  readonly continuation?: { readonly label: string; readonly href?: string };
}

export interface XpyStageOnePresentationAdapter<Input> {
  readonly adapterId: string;
  readonly version: typeof XPY_STAGE_ONE_PRESENTATION_VERSION;
  project(input: Input): XpyStageOneDecisionPresentation;
}

export function defineXpyStageOnePresentationAdapter<Input>(adapter: XpyStageOnePresentationAdapter<Input>): XpyStageOnePresentationAdapter<Input> {
  return Object.freeze(adapter);
}
