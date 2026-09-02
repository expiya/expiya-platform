import "server-only";

const SANDBOX_ORIGIN = "https://soho-isbasi-mwv2-test.logo-paas.com" as const;

export interface IsbasiEnvironment {
  readonly ISBASI_ENV?: string;
  readonly ISBASI_API_BASE_URL?: string;
  readonly ISBASI_API_KEY?: string;
  readonly ISBASI_USERNAME?: string;
  readonly ISBASI_PASSWORD?: string;
  readonly ISBASI_LIVE_INVOICING_ENABLED?: string;
}

export interface IsbasiConfig {
  readonly environment: "sandbox" | "live";
  readonly baseUrl: string;
  readonly loginPath: "/api/v1.0/user/integrationLogin";
  readonly apiKey: string;
  readonly username: string;
  readonly password: string;
}

function validatedOrigin(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash) {
    throw new TypeError("ISBASI_BASE_URL_INVALID");
  }
  if (url.hostname !== "logo-paas.com" && !url.hostname.endsWith(".logo-paas.com")) {
    throw new TypeError("ISBASI_PROVIDER_ORIGIN_REQUIRED");
  }
  return url.origin;
}

export function resolveIsbasiConfig(environment: IsbasiEnvironment): IsbasiConfig {
  const mode = environment.ISBASI_ENV?.trim() || "sandbox";
  if (mode !== "sandbox" && mode !== "live") throw new TypeError("ISBASI_ENV_INVALID");
  if (mode === "live" && environment.ISBASI_LIVE_INVOICING_ENABLED !== "true") {
    throw new TypeError("ISBASI_LIVE_INVOICING_DISABLED");
  }

  const apiKey = environment.ISBASI_API_KEY?.trim();
  const username = environment.ISBASI_USERNAME?.trim();
  const password = environment.ISBASI_PASSWORD;
  if (!apiKey || !username || !password) throw new TypeError("ISBASI_CREDENTIALS_REQUIRED");

  const baseUrl = validatedOrigin(environment.ISBASI_API_BASE_URL?.trim() || SANDBOX_ORIGIN);
  if (mode === "sandbox" && baseUrl !== SANDBOX_ORIGIN) throw new TypeError("ISBASI_SANDBOX_ORIGIN_REQUIRED");
  if (mode === "live" && baseUrl === SANDBOX_ORIGIN) throw new TypeError("ISBASI_LIVE_ORIGIN_REQUIRED");

  return {
    environment: mode,
    baseUrl,
    loginPath: "/api/v1.0/user/integrationLogin",
    apiKey,
    username,
    password,
  };
}
