import type { ApiProvider, ProviderResponse } from "promptfoo";

export default class TranscriptReplayProvider implements ApiProvider {
  id() { return "expiya-cars-v3-transcript-replay"; }
  async callApi(prompt: string): Promise<ProviderResponse> {
    return { output: prompt, metadata: { replayed: true, openAiCalls: 0 } };
  }
}
