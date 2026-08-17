import { createHash } from "node:crypto";
import { getOpenAIClient } from "../lib/openai";
import { readCarsDecisionV2ProviderConfig } from "../features/decision/v2/provider/openaiTransport.server";

const fingerprint = (value: string | undefined): string => value?.trim()
  ? createHash("sha256").update(value.trim()).digest("hex").slice(0, 16)
  : "UNCONFIGURED";

async function main() {
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error("OPENAI_API_KEY_REQUIRED");
  const config = readCarsDecisionV2ProviderConfig(process.env);
  try {
    const response = await getOpenAIClient().responses.create({ model: config.interpretationModel, store: false, max_output_tokens: 16, input: "Reply with exactly READY." }, { timeout: Math.min(config.timeoutMs, 20_000) });
    console.log(JSON.stringify({ status: "READY", responseCreated: Boolean(response.id), organizationFingerprint: fingerprint(process.env.OPENAI_ORGANIZATION), projectFingerprint: fingerprint(process.env.OPENAI_PROJECT) }));
  } catch (error) {
    const value = error as { status?: number; code?: string; error?: { code?: string } };
    console.log(JSON.stringify({ status: "FAILED", errorClass: value.status === 429 ? "RATE_LIMIT_OR_QUOTA" : "PROVIDER_ERROR", statusCode: value.status ?? null, code: value.code ?? value.error?.code ?? null, organizationFingerprint: fingerprint(process.env.OPENAI_ORGANIZATION), projectFingerprint: fingerprint(process.env.OPENAI_PROJECT) }));
    process.exitCode = 2;
  }
}

void main();
