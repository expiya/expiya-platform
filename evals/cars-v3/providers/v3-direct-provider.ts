import type { ApiProvider, CallApiContextParams, ProviderResponse } from "promptfoo";
import { getV3SmokeJourney } from "../../../features/decision/v3/evaluation/journeyFixtures";
import { resetV3EvaluationStores, runV3SmokeJourney } from "../../../features/decision/v3/evaluation/runJourney";

interface ProviderOptions { readonly id?: string; readonly config?: Record<string, unknown> }

export default class V3DirectProvider implements ApiProvider {
  private readonly providerId: string;

  constructor(options: ProviderOptions = {}) { this.providerId = options.id ?? "expiya-cars-v3-direct"; }
  id() { return this.providerId; }

  async callApi(prompt: string, context?: CallApiContextParams): Promise<ProviderResponse> {
    const journeyId = String(context?.vars?.journeyId ?? prompt).trim();
    const priorDisabled = process.env.CARS_V31_PROVIDER_DISABLED;
    process.env.CARS_V31_PROVIDER_DISABLED = "true";
    resetV3EvaluationStores();
    try {
      const report = await runV3SmokeJourney(getV3SmokeJourney(journeyId));
      return { output: JSON.stringify(report), metadata: { journeyId, deterministic: true, openAiDisabled: true } };
    } catch (error) {
      return { error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
    } finally {
      resetV3EvaluationStores();
      if (priorDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED;
      else process.env.CARS_V31_PROVIDER_DISABLED = priorDisabled;
    }
  }
}
