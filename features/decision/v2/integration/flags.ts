import { z } from "zod";
const flag = z.enum(["true", "false"]).optional().transform((value) => value === "true");
export interface CarsDecisionV2Flags { readonly shadow: boolean; readonly public: boolean }
export function parseCarsDecisionV2Flags(env: Readonly<Record<string, string | undefined>>): CarsDecisionV2Flags { const parsed = z.object({ CARS_DECISION_V2_SHADOW: flag, CARS_DECISION_V2_PUBLIC: flag }).strict().parse({ CARS_DECISION_V2_SHADOW: env.CARS_DECISION_V2_SHADOW, CARS_DECISION_V2_PUBLIC: env.CARS_DECISION_V2_PUBLIC }); return Object.freeze({ shadow: parsed.CARS_DECISION_V2_SHADOW, public: parsed.CARS_DECISION_V2_PUBLIC }); }
