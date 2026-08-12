import { z } from "zod";

import { runCarsConversationTurn } from "@/features/decision/conversation/runCarsConversationTurn";

const requestSchema = z.object({
  conversationId: z.string().min(1).max(100),
  messages: z.array(z.object({
    id: z.string().min(1).max(100),
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(4_000),
  })).min(1).max(40),
});

export async function POST(request: Request): Promise<Response> {
  try {
    const input = requestSchema.parse(await request.json());
    const response = await runCarsConversationTurn(input);
    return Response.json(response);
  } catch (error) {
    if (error instanceof z.ZodError) {
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
