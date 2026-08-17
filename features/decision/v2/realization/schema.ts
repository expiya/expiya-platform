import { z } from "zod";
import type { NaturalRealizationResult } from "./types";
const id = z.string().trim().min(1).max(160);
export const naturalRealizationResultSchema = z.strictObject({ message: z.string().max(12_000), usedExplanationFactIds: z.array(id).max(128), mentionedCandidateIds: z.array(id).max(16), renderedQuestionId: id.nullable() });
export function parseNaturalRealizationResult(input: unknown): NaturalRealizationResult { const parsed = naturalRealizationResultSchema.parse(input && typeof input === "object" ? { renderedQuestionId: null, ...input } : input); return { message: parsed.message, usedExplanationFactIds: parsed.usedExplanationFactIds, mentionedCandidateIds: parsed.mentionedCandidateIds, ...(parsed.renderedQuestionId ? { renderedQuestionId: parsed.renderedQuestionId } : {}) }; }
