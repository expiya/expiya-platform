export const BABY_DEPARTMENT_ID = "BABY_AND_CHILD" as const;
export const STROLLER_CATEGORY_ID = "STROLLER" as const;

export type StrollerType = "STANDARD" | "COMPACT_TRAVEL" | "TRAVEL_SYSTEM_COMPATIBLE";
export type EvidenceValue<T> = T | "UNKNOWN";

export interface StrollerProduct {
  readonly exactProductId: string;
  readonly manufacturer: string;
  readonly model: string;
  readonly configurationIdentity: string;
  readonly type: readonly StrollerType[];
  readonly trApplicability: { readonly status: "VERIFIED"; readonly evidenceIds: readonly string[] };
  readonly facts: {
    readonly childWeightMaxKg: EvidenceValue<number>;
    readonly newbornUse: EvidenceValue<"SEAT_LIE_FLAT" | "CARRYCOT_REQUIRED" | "NOT_DECLARED">;
    readonly strollerWeightKg: EvidenceValue<number>;
    readonly foldedMm: EvidenceValue<readonly [number, number, number]>;
    readonly oneHandFold: EvidenceValue<boolean>;
    readonly selfStanding: EvidenceValue<boolean>;
    readonly reversibleSeat: EvidenceValue<boolean>;
    readonly lieFlatRecline: EvidenceValue<boolean>;
    readonly suspension: EvidenceValue<"ALL_WHEEL" | "FRONT_WHEEL" | "DECLARED">;
    readonly basketMaxKg: EvidenceValue<number>;
    readonly cabinSizeClaim: EvidenceValue<boolean>;
    readonly travelSystemCompatible: EvidenceValue<boolean>;
  };
  readonly included: readonly string[];
  readonly separatelySold: readonly string[];
  readonly evidenceIds: readonly string[];
}

export const STROLLER_NEEDS = ["USE_STAGE", "NEWBORN", "TRANSPORT_CONTEXT", "CARRY_WEIGHT", "FOLDED_SIZE", "CABIN_TRAVEL", "SURFACE", "SEAT_DIRECTION", "RECLINE", "TRAVEL_SYSTEM", "BASKET_LOAD", "FOLDING", "BUDGET"] as const;
export type StrollerNeed = typeof STROLLER_NEEDS[number];

