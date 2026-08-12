import OpenAI from "openai";

let openaiClient: OpenAI | undefined;

export function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI credentials are unavailable in this runtime.");
  }

  openaiClient ??= new OpenAI({ apiKey });
  return openaiClient;
}
