export interface IyzicoEnvironment {
  readonly IYZICO_ENV?: string;
  readonly IYZICO_API_KEY?: string;
  readonly IYZICO_SECRET_KEY?: string;
  readonly IYZICO_LIVE_PAYMENTS_ENABLED?: string;
}

export interface IyzicoConfig {
  readonly environment: "sandbox" | "live";
  readonly baseUrl: "https://sandbox-api.iyzipay.com" | "https://api.iyzipay.com";
  readonly apiKey: string;
  readonly secretKey: string;
}

export function resolveIyzicoConfig(environment: IyzicoEnvironment): IyzicoConfig {
  const mode = environment.IYZICO_ENV?.trim() || "sandbox";
  if (mode !== "sandbox" && mode !== "live") throw new Error("IYZICO_ENV_INVALID");
  if (mode === "live" && environment.IYZICO_LIVE_PAYMENTS_ENABLED !== "true") throw new Error("IYZICO_LIVE_PAYMENTS_DISABLED");

  const apiKey = environment.IYZICO_API_KEY?.trim();
  const secretKey = environment.IYZICO_SECRET_KEY?.trim();
  if (!apiKey || !secretKey) throw new Error("IYZICO_CREDENTIALS_REQUIRED");
  if (mode === "sandbox" && (!apiKey.startsWith("sandbox-") || !secretKey.startsWith("sandbox-"))) {
    throw new Error("IYZICO_SANDBOX_CREDENTIALS_REQUIRED");
  }

  return {
    environment: mode,
    baseUrl: mode === "sandbox" ? "https://sandbox-api.iyzipay.com" : "https://api.iyzipay.com",
    apiKey,
    secretKey,
  };
}
