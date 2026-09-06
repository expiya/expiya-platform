import type { XpyDomainVisualPack, XpyStageAvailability } from "./experience";

export const XPY_DEPARTMENT_LANDING_VERSION = "xpy-department-landing/v1" as const;

export interface DepartmentLandingCategory {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly href: string;
  readonly availability: "AVAILABLE" | "UNAVAILABLE";
  readonly visual?: {
    readonly kind: "CATEGORY_SYMBOL_FALLBACK";
    readonly symbol: string;
    readonly alt: string;
    readonly disclosure: string;
  };
}

export interface DepartmentLandingPack {
  readonly version: typeof XPY_DEPARTMENT_LANDING_VERSION;
  readonly departmentId: string;
  readonly canonicalPath: `/${string}`;
  readonly visualPack: XpyDomainVisualPack;
  readonly eyebrow: string;
  readonly headline: readonly [string, string];
  readonly supportingCopy: string;
  readonly heroImage?: { readonly src: `/${string}`; readonly alt: string; readonly sizes: string };
  readonly primaryCta: { readonly label: string; readonly href: string };
  readonly secondaryCta?: { readonly label: string; readonly href: string };
  readonly categories: readonly DepartmentLandingCategory[];
  readonly works: readonly { readonly title: string; readonly description: string }[];
  readonly xpy: readonly [
    { readonly letter: "X"; readonly title: string; readonly description: string },
    { readonly letter: "P"; readonly title: string; readonly description: string },
    { readonly letter: "Y"; readonly title: string; readonly description: string },
  ];
  readonly stages: readonly {
    readonly id: "STAGE_1_DECISION" | "STAGE_2_EVALUATION" | "STAGE_3_ACTION";
    readonly label: string;
    readonly description: string;
    readonly href: string;
    readonly availability: XpyStageAvailability;
  }[];
  readonly trust: { readonly title: string; readonly description: string; readonly points: readonly string[] };
  readonly footerCopy: string;
}

export function defineDepartmentLandingPack<const T extends DepartmentLandingPack>(pack: T): T {
  return Object.freeze(pack);
}
