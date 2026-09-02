const SANDBOX_ORIGIN = "https://soho-isbasi-mwv2-test.logo-paas.com";
const LIVE_ORIGIN = "https://lite-mw.isbasi.com";

export interface IsbasiReadinessEnvironment {
  readonly ISBASI_ENV?: string;
  readonly ISBASI_API_BASE_URL?: string;
  readonly ISBASI_API_KEY?: string;
  readonly ISBASI_USERNAME?: string;
  readonly ISBASI_PASSWORD?: string;
  readonly ISBASI_LIVE_INVOICING_ENABLED?: string;
}

export function assessIsbasiEnvironment(environment: IsbasiReadinessEnvironment) {
  const mode = environment.ISBASI_ENV === "live" ? "live" as const : "sandbox" as const;
  const failures: string[] = [];
  if (environment.ISBASI_ENV && environment.ISBASI_ENV !== "sandbox" && environment.ISBASI_ENV !== "live") failures.push("ISBASI_ENV_INVALID");
  if (!environment.ISBASI_API_KEY?.trim() || !environment.ISBASI_USERNAME?.trim() || !environment.ISBASI_PASSWORD) failures.push("ISBASI_CREDENTIALS_REQUIRED");
  try {
    const url = new URL(environment.ISBASI_API_BASE_URL?.trim() || SANDBOX_ORIGIN);
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash) failures.push("ISBASI_BASE_URL_INVALID");
    if (url.origin !== SANDBOX_ORIGIN && url.origin !== LIVE_ORIGIN) failures.push("ISBASI_PROVIDER_ORIGIN_REQUIRED");
    if (mode === "sandbox" && url.origin !== SANDBOX_ORIGIN) failures.push("ISBASI_SANDBOX_ORIGIN_REQUIRED");
    if (mode === "live" && url.origin !== LIVE_ORIGIN) failures.push("ISBASI_LIVE_ORIGIN_REQUIRED");
  } catch {
    failures.push("ISBASI_BASE_URL_INVALID");
  }
  if (mode === "live" && environment.ISBASI_LIVE_INVOICING_ENABLED !== "true") failures.push("ISBASI_LIVE_INVOICING_DISABLED");
  return { ready: failures.length === 0, mode, failures } as const;
}
