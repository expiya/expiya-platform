/**
 * Server-only Cars conversation model selection.
 *
 * Default production model: gpt-5.5.
 * Override with OPENAI_CARS_CONVERSATION_MODEL (never NEXT_PUBLIC_*).
 * Optional OPENAI_CARS_CONVERSATION_FALLBACK_MODEL is used only after a genuine
 * API/schema/timeout failure of the primary model, and is recorded in provenance.
 * Missing configuration uses gpt-5.5. No weaker silent fallback is applied.
 */
export const DEFAULT_CARS_CONVERSATION_MODEL = "gpt-5.5";

export interface CarsConversationModelSelection {
  readonly requestedModel: string;
  readonly fallbackModel?: string;
}

function readServerModel(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

export function resolveCarsConversationModel(): CarsConversationModelSelection {
  const requestedModel = readServerModel("OPENAI_CARS_CONVERSATION_MODEL", DEFAULT_CARS_CONVERSATION_MODEL);
  const fallback = process.env.OPENAI_CARS_CONVERSATION_FALLBACK_MODEL?.trim();
  return {
    requestedModel,
    fallbackModel: fallback && fallback !== requestedModel ? fallback : undefined,
  };
}

export function carsConversationModelAttempts(): readonly string[] {
  const selection = resolveCarsConversationModel();
  return selection.fallbackModel
    ? [selection.requestedModel, selection.fallbackModel]
    : [selection.requestedModel];
}
