import { randomUUID } from "node:crypto";
import type { ApiProvider, CallApiContextParams, ProviderResponse } from "promptfoo";
import { runV3Turn } from "../../../features/decision/v3/engine.server";
import { runStoredV31Turn } from "../../../features/decision/v3/store.server";
import { adaptWholeTurnToCarsStages } from "../../../features/decision/v3/carsStages";
import { createRecommendationTermsAcceptance } from "../../../lib/legal/recommendationTerms";
import type { V3ConversationState } from "../../../features/decision/v3/types";

interface ProviderOptions { readonly id?: string }

export default class V3SimulatedProvider implements ApiProvider {
  private readonly providerId: string;
  private readonly revisions = new Map<string, number>();
  private readonly states = new Map<string, V3ConversationState>();

  constructor(options: ProviderOptions = {}) {
    this.providerId = options.id ?? "expiya-cars-v3-simulated";
  }

  id() { return this.providerId; }

  async callApi(prompt: string, context?: CallApiContextParams): Promise<ProviderResponse> {
    try {
      const messages = JSON.parse(prompt) as Array<{ role?: string; content?: unknown }>;
      const latestUser = [...messages].reverse().find((message) => message.role === "user");
      const message = typeof latestUser?.content === "string" ? latestUser.content.trim() : "";
      if (!message) return { error: "Simüle edilmiş kullanıcı mesajı bulunamadı." };

      const caseId = String(context?.vars?.caseId ?? context?.vars?.sessionId ?? randomUUID());
      const conversationId = `pf-sim-${caseId}`;
      const expectedRevision = this.revisions.get(conversationId) ?? 0;
      const messageId = `${conversationId}-turn-${expectedRevision + 1}`;
      const response = await runStoredV31Turn({
        conversationId,
        messageId,
        message,
        expectedRevision,
        stages: adaptWholeTurnToCarsStages((state) => runV3Turn({ conversationId, messageId, message, expectedRevision, state, ...(this.states.get(conversationId)?.pendingOffer ? { recommendationTermsAcceptance: createRecommendationTermsAcceptance() } : {}) })),
      });
      this.revisions.set(conversationId, response.state.revision);
      this.states.set(conversationId, response.state);
      const recommendationText = response.recommendations?.length
        ? `\n\nÖnerilen araçlar: ${response.recommendations.map((item: { title: string }) => item.title).join("; ")}`
        : "";
      return {
        output: `${response.message}${recommendationText}`,
        sessionId: caseId,
        metadata: {
          caseId,
          revision: response.state.revision,
          purchaseIntent: response.state.purchaseIntent,
          recommendationIds: response.recommendations?.map((item: { id: string }) => item.id) ?? [],
        },
      };
    } catch (error) {
      return { error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
    }
  }
}
