export const XPY_EXPERIENCE_VERSION = "xpy-experience/v2" as const;

export type XpyStageId = "STAGE_1_DECISION" | "STAGE_2_EVALUATION" | "STAGE_3_ACTION";
export type XpyStageAvailability = "AVAILABLE" | "REQUIRES_HANDOFF" | "UNAVAILABLE";
export type XpyExperienceState = "READY" | "LOADING" | "ERROR" | "RECOVERY" | "UNSUPPORTED";
export type XpyExperienceSlot = "CONVERSATION" | "DECISION_CARDS" | "COMPARISON_REPORT" | "EVALUATION" | "METRICS" | "EVIDENCE" | "ADVISOR" | "COMMERCE" | "RECOVERY";

export interface XpyVisualAssetReference { readonly assetId: string; readonly uri: string; readonly identityScope: "DECORATIVE" | "CATEGORY" | "EXACT_PRODUCT"; readonly provenance: { readonly authorityId: string; readonly digest: string }; }

/** Data only. Visual packs contain no renderer, ranking, sufficiency or authorization hooks. */
export interface XpyDomainVisualPack {
  readonly experienceVersion: typeof XPY_EXPERIENCE_VERSION;
  readonly visualPackId: string; readonly domainPackId: string; readonly publicName: string;
  readonly sceneConcept: "ROAD" | "STUDIO_CYCLORAMA" | "NEUTRAL";
  readonly tokens: { readonly accent: "EMERALD"; readonly density: "COMFORTABLE"; readonly contrast: "XPY_AA"; readonly motion: "REDUCED_MOTION_SAFE" };
  readonly labels: { readonly stageOne: string; readonly stageTwo: string; readonly stageThree: string; readonly composerPlaceholder: string };
  readonly assets: readonly XpyVisualAssetReference[]; readonly slots: readonly XpyExperienceSlot[];
}
export type XpyStageOneVisualPack = XpyDomainVisualPack;

export interface XpyStageRegistration { readonly id: XpyStageId; readonly label: string; readonly href: string; readonly availability: XpyStageAvailability; readonly unavailableReason?: string; }
export interface XpyExperienceAdapter { readonly experienceVersion: typeof XPY_EXPERIENCE_VERSION; readonly departmentId: string; readonly visualPack: XpyDomainVisualPack; readonly stages: readonly [XpyStageRegistration, XpyStageRegistration, XpyStageRegistration]; }

export const XPY_SHARED_STAGE_SLOTS = Object.freeze({
  STAGE_1_DECISION: ["CONVERSATION", "DECISION_CARDS", "EVIDENCE", "RECOVERY"],
  STAGE_2_EVALUATION: ["COMPARISON_REPORT", "EVALUATION", "METRICS", "EVIDENCE", "ADVISOR", "RECOVERY"],
  STAGE_3_ACTION: ["COMMERCE", "EVIDENCE", "RECOVERY"],
} as const satisfies Record<XpyStageId, readonly XpyExperienceSlot[]>);

export function defineXpyExperienceAdapter(adapter: XpyExperienceAdapter): XpyExperienceAdapter { return Object.freeze(adapter); }
