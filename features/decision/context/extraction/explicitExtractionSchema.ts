import { z } from "zod";

export const explicitContextTargetSchema = z.enum([
  "decisionNeed",
  "userContext.needs",
  "userContext.priorities",
  "userContext.preferences",
  "userContext.constraints",
  "userContext.usageConditions",
  "evaluationContext.decisionCriteria",
  "evaluationContext.decisionOptions",
  "domainContext.contextualElements",
  "domainContext.contextualRelationships",
]);

export const explicitExtractedFactSchema = z.object({
  target: explicitContextTargetSchema,
  value: z.string().min(1),
});

export const explicitExtractionOutputSchema = z.object({
  facts: z.array(explicitExtractedFactSchema),
});

export type ExplicitExtractedFact = z.infer<
  typeof explicitExtractedFactSchema
>;

export type ExplicitExtractionOutput = z.infer<
  typeof explicitExtractionOutputSchema
>;
