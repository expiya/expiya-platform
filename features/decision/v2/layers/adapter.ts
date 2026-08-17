import { z } from "zod";
import { VEHICLE_PERSONA_TRAITS } from "../domain/conversationEvent";
import type { DailyLifeLayerSnapshot, PersonaLayerSnapshot } from "./types";

const id = z.string().trim().min(1).max(256); const compatibility = { catalogReleaseVersion: id, catalogFingerprint: id, layerVersion: id };
const dailySchema = z.strictObject({ ...compatibility, signals: z.array(z.strictObject({ exactVariantId: id, mappingId: id, authority: id, mappingClass: id, decisionUse: z.enum(["SOFT_UNTIL_CONFIRMED", "ILLUSTRATIVE_ONLY", "NONE", "DIRECT_FILTER"]), rankingEffect: z.union([z.literal(-1), z.literal(0), z.literal(1)]), explanationFactId: id.optional() })).max(100_000) });
const personaSchema = z.strictObject({ ...compatibility, signals: z.array(z.strictObject({ exactVariantId: id, trait: z.enum(VEHICLE_PERSONA_TRAITS), authority: z.literal("OWNER_EDITORIAL"), decisionUse: z.literal("SOFT_PREFERENCE_ONLY"), matchStrength: z.literal(1), explanationFactId: id.optional() })).max(100_000) });
function deepFreeze<T>(value: T): T { if (value && typeof value === "object" && !Object.isFrozen(value)) { for (const child of Object.values(value as object)) deepFreeze(child); Object.freeze(value); } return value; }
export function createDailyLifeLayerSnapshot(input: unknown): DailyLifeLayerSnapshot { return deepFreeze(dailySchema.parse(input)); }
export function createPersonaLayerSnapshot(input: unknown): PersonaLayerSnapshot { return deepFreeze(personaSchema.parse(input)); }
