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

export interface XpyStageOneSetPresentation {
  readonly schemaVersion: typeof XPY_STAGE_ONE_PRESENTATION_VERSION;
  readonly kind: "TIED_TOP_SET" | "NON_DOMINATED_SET";
  readonly departmentLabel: string;
  readonly categoryLabel: string;
  readonly title: string;
  readonly explanation: string;
  readonly candidates: readonly { readonly id: string; readonly name: string; readonly configuration?: string; readonly differences?: readonly string[] }[];
  readonly unresolved: readonly string[];
  readonly nextAction?: { readonly label: string; readonly href?: string };
}

export interface XpyStageOneUnavailablePresentation {
  readonly schemaVersion: typeof XPY_STAGE_ONE_PRESENTATION_VERSION;
  readonly kind: "AUTHORITY_UNAVAILABLE";
  readonly departmentLabel: string;
  readonly categoryLabel: string;
  readonly title: string;
  readonly explanation: string;
  readonly recovery?: string;
}

export type XpyStageOnePresentation = XpyStageOneDecisionPresentation | XpyStageOneSetPresentation | XpyStageOneUnavailablePresentation;

export interface XpyStageOnePresentationAdapter<Input> {
  readonly adapterId: string;
  readonly version: typeof XPY_STAGE_ONE_PRESENTATION_VERSION;
  project(input: Input): XpyStageOneDecisionPresentation;
}

/** Converts an internal exact identity into an optional, consumer-relevant subtitle. */
export function naturalConsumerConfiguration(value: string, brand: string, model: string): string {
  const normalizedBrand = brand.trim().toLocaleLowerCase("tr-TR");
  const normalizedModel = model.trim().toLocaleLowerCase("tr-TR");
  const parts = value.split(/\s*[|/]\s*/u).map(part => part.trim()).filter(Boolean).filter(part => {
    const normalized = part.toLocaleLowerCase("tr-TR");
    if (normalized === normalizedBrand || normalized === normalizedModel || normalized === `${normalizedBrand} ${normalizedModel}`) return false;
    if (/^(?:tr|türkiye|5g)$/iu.test(part) || /^\d{8,}$/u.test(part)) return false;
    if (/^[A-Z][A-Z0-9_]+$/u.test(part)) return false;
    if (/^(?=.*\d)[A-Z0-9]+(?:-[A-Z0-9]+)+$/u.test(part)) return false;
    return true;
  }).map(part => part.replace(/(\d)\s*GB\b/giu, "$1 GB"));
  const memory = parts.filter(part => /^\d+\s*GB$/iu.test(part));
  const rest = parts.filter(part => !/^\d+\s*GB$/iu.test(part));
  return [...(memory.length ? [memory.join(" / ")] : []), ...rest].join(" · ");
}

export function defineXpyStageOnePresentationAdapter<Input>(adapter: XpyStageOnePresentationAdapter<Input>): XpyStageOnePresentationAdapter<Input> {
  return Object.freeze(adapter);
}
