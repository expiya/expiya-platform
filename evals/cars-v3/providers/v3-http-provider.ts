import type { ApiProvider, CallApiContextParams, ProviderResponse } from "promptfoo";
import { getV3HttpContractFixture } from "../http/httpContractFixtures";
import { runV3HttpContract } from "../http/runHttpContract";

interface ProviderOptions { readonly id?: string; readonly config?: { readonly baseUrl?: string } }

export default class V3HttpProvider implements ApiProvider {
  private readonly providerId: string;
  private readonly baseUrl: string;

  constructor(options: ProviderOptions = {}) {
    this.providerId = options.id ?? "expiya-cars-v3-http";
    this.baseUrl = process.env.CARS_V3_EVAL_BASE_URL?.trim() || options.config?.baseUrl || "http://localhost:3000";
  }
  id() { return this.providerId; }

  async callApi(prompt: string, context?: CallApiContextParams): Promise<ProviderResponse> {
    const fixtureId = String(context?.vars?.fixtureId ?? prompt).trim();
    try {
      const report = await runV3HttpContract(getV3HttpContractFixture(fixtureId), this.baseUrl);
      return { output: JSON.stringify(report), metadata: { fixtureId, baseUrl: this.baseUrl, transport: "http" } };
    } catch (error) {
      const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      return { error: `Motor V3 HTTP endpoint'ine erişilemedi (${this.baseUrl}): ${detail}` };
    }
  }
}
