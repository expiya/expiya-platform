import { PAID_COMPARISON_LEGAL_READY } from "./legalArtifacts";

export type PaidComparisonReadinessFailure =
  | "DATABASE_URL_MISSING" | "SIGNING_SECRET_MISSING" | "IYZICO_CREDENTIALS_MISSING"
  | "IYZICO_SANDBOX_CREDENTIALS_INVALID" | "CALLBACK_URL_INVALID" | "LIVE_GATE_DISABLED"
  | "LEGAL_APPROVAL_MISSING" | "INVOICE_PROCESS_NOT_READY" | "SANDBOX_E2E_NOT_ATTESTED";

export function assessPaidComparisonReadiness(input: {
  readonly mode: "sandbox" | "live";
  readonly databaseUrl?: string;
  readonly signingSecret?: string;
  readonly iyzicoApiKey?: string;
  readonly iyzicoSecretKey?: string;
  readonly callbackUrl?: string;
  readonly liveGateEnabled?: boolean;
  readonly legalReady?: boolean;
  readonly invoiceReady?: boolean;
  readonly sandboxE2ePassed?: boolean;
}) {
  const failures: PaidComparisonReadinessFailure[] = [];
  if (!input.databaseUrl?.trim()) failures.push("DATABASE_URL_MISSING");
  if (!input.signingSecret?.trim() || input.signingSecret.trim().length < 32) failures.push("SIGNING_SECRET_MISSING");
  if (!input.iyzicoApiKey?.trim() || !input.iyzicoSecretKey?.trim()) failures.push("IYZICO_CREDENTIALS_MISSING");
  if (input.mode === "sandbox" && input.iyzicoApiKey && input.iyzicoSecretKey && (!input.iyzicoApiKey.startsWith("sandbox-") || !input.iyzicoSecretKey.startsWith("sandbox-"))) failures.push("IYZICO_SANDBOX_CREDENTIALS_INVALID");
  try { const callback = new URL(input.callbackUrl ?? ""); if (callback.protocol !== "https:" || callback.username || callback.password || callback.hash) failures.push("CALLBACK_URL_INVALID"); } catch { failures.push("CALLBACK_URL_INVALID"); }
  if (input.mode === "live") {
    if (!input.liveGateEnabled) failures.push("LIVE_GATE_DISABLED");
    if (!input.legalReady) failures.push("LEGAL_APPROVAL_MISSING");
    if (!input.invoiceReady) failures.push("INVOICE_PROCESS_NOT_READY");
    if (!input.sandboxE2ePassed) failures.push("SANDBOX_E2E_NOT_ATTESTED");
  }
  return { mode: input.mode, ready: failures.length === 0, failures } as const;
}

export function assessPaidComparisonEnvironment(environment: NodeJS.ProcessEnv) {
  const mode = environment.IYZICO_ENV === "live" ? "live" : "sandbox";
  return assessPaidComparisonReadiness({
    mode,
    databaseUrl: environment.DATABASE_URL,
    signingSecret: environment.CARS_DECISION_V2_SIGNING_SECRET || environment.CARS_PILOT_SESSION_SECRET,
    iyzicoApiKey: environment.IYZICO_API_KEY,
    iyzicoSecretKey: environment.IYZICO_SECRET_KEY,
    callbackUrl: environment.IYZICO_CALLBACK_URL,
    liveGateEnabled: environment.IYZICO_LIVE_PAYMENTS_ENABLED === "true",
    legalReady: PAID_COMPARISON_LEGAL_READY && environment.PAID_COMPARISON_LEGAL_APPROVED === "true",
    invoiceReady: environment.SKYBIT_INVOICE_PROCESS_READY === "true",
    sandboxE2ePassed: environment.PAID_COMPARISON_SANDBOX_E2E_PASSED === "true",
  });
}
