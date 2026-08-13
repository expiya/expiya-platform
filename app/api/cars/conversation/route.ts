import { z } from "zod";

import { runCarsConversationTurn } from "@/features/decision/conversation/runCarsConversationTurn";
import { enforceRateLimit, readJsonWithLimit, verifySameOrigin } from "@/lib/security/requestSecurity";

const requestSchema = z.object({
  conversationId: z.string().min(1).max(100),
  messages: z.array(z.object({
    id: z.string().min(1).max(100),
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4_000),
    recommendationIds: z.array(z.string().min(1).max(100)).max(3).optional(),
    satisfaction: z.enum(["HELPFUL", "NOT_HELPFUL"]).optional(),
    sellerResearchRequest: z.object({
      province: z.string().min(1).max(100),
      district: z.string().min(1).max(100),
      status: z.literal("PLANNED_V0_2"),
    }).optional(),
  })).min(1).max(80),
});

export async function POST(request: Request): Promise<Response> {
  const originRejected = verifySameOrigin(request);
  if (originRejected) return originRejected;
  const rejected = await enforceRateLimit(request, { scope: "cars-conversation", limit: 20, windowMs: 10 * 60_000 });
  if (rejected) return rejected;
  try {
    const input = requestSchema.parse(await readJsonWithLimit(request, 150_000));
    const conversationRejected = await enforceRateLimit(request, { scope: "cars-conversation-id", subject: input.conversationId, limit: 24, windowMs: 60 * 60_000 });
    if (conversationRejected) return conversationRejected;
    const response = await runCarsConversationTurn(input);
    return Response.json(response);
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError || error instanceof Error && error.message === "REQUEST_BODY_TOO_LARGE") {
      return Response.json(
        { message: "Please send a non-empty message to continue." },
        { status: 400 },
      );
    }

    return Response.json(
      { message: "The conversation could not be processed. Please try again." },
      { status: 500 },
    );
  }
}
