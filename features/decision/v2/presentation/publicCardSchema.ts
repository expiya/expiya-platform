import { z } from "zod";

export const decisionSafePublicCardSchema = z.strictObject({
  exactVariantId: z.string().trim().min(1),
  title: z.string().trim().min(1),
  brand: z.string().trim().min(1),
  model: z.string().trim().min(1),
  trim: z.string().trim().min(1),
  modelYear: z.number().int().positive().optional(),
  fuelLabel: z.string().trim().min(1).optional(),
  transmissionLabel: z.string().trim().min(1).optional(),
  bodyTypeLabel: z.string().trim().min(1).optional(),
  image: z.string().startsWith("/"),
  imageStatus: z.literal("PLACEHOLDER"),
  decisionSummary: z.strictObject({
    recommendation: z.string().trim().min(1),
    reasons: z.array(z.string().trim().min(1)).min(1),
    confidenceLabel: z.enum(["YUKSEK", "ORTA"]),
  }),
  caveats: z.array(z.string().trim().min(1)),
  verifiedPublicPrice: z.strictObject({
    amountTry: z.number().finite().positive(),
    priceType: z.enum(["LIST", "CAMPAIGN"]),
    validFrom: z.string().optional(),
    validUntil: z.string().optional(),
  }).optional(),
});

export type DecisionSafePublicCard = z.infer<typeof decisionSafePublicCardSchema>;
