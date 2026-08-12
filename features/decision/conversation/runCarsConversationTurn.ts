import { randomUUID } from "node:crypto";

import { runCarsRuntime } from "@/features/decision/runtime/runCarsRuntime";
import type {
  CarsConversationRequest,
  CarsConversationResponse,
} from "@/types/carsConversation";

import { buildCarsConversationQuery } from "./buildCarsConversationQuery";
import { createCarsFollowUp } from "./createCarsFollowUp";
import { hasActionableCarsContext } from "./hasActionableCarsContext";

export async function runCarsConversationTurn(
  input: CarsConversationRequest,
): Promise<CarsConversationResponse> {
  if (!hasActionableCarsContext(input.messages)) {
    return {
      kind: "QUESTION",
      message: "Aracı en çok nasıl kullanacaksınız ve sizin için en önemli ölçüt nedir? Örneğin bütçe, şehir içi kullanım, yakıt türü veya genişlikten birini paylaşabilirsiniz.",
    };
  }

  const query = buildCarsConversationQuery(input.messages);
  const turnId = randomUUID();
  const result = await runCarsRuntime({
    requestId: `${input.conversationId}:turn:${turnId}`,
    contextReference: `${input.conversationId}:context`,
    query,
  });

  if (result.status === "SUCCEEDED") {
    return {
      kind: "RECOMMENDATIONS",
      message: result.recommendations.length > 0
        ? "Based on everything you've told me, these are the strongest matches. You can still change any preference or ask me to compare them."
        : "I have enough context, but there are no matching cars in the current catalog. You can relax or change a requirement and I'll check again.",
      recommendations: result.recommendations,
    };
  }

  if (result.status === "FAILED") {
    return { kind: "ERROR", message: createCarsFollowUp(result) };
  }

  return { kind: "QUESTION", message: createCarsFollowUp(result) };
}
