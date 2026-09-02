import "server-only";

import type { IsbasiConfig } from "./config";

const MAX_RESPONSE_BYTES = 128_000;
const REQUEST_TIMEOUT_MS = 10_000;

export interface IsbasiSession {
  readonly accessToken: string;
  readonly tenantId: string;
}

export interface IsbasiHttpClient {
  login(): Promise<IsbasiSession>;
  postAuthenticated<T>(path: string, body: unknown, session: IsbasiSession): Promise<T>;
}

function assertRelativePath(path: string): void {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("?") || path.includes("#") || path.includes("\\")) {
    throw new TypeError("ISBASI_PATH_INVALID");
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;
}

async function readJsonResponse(response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) throw new Error(`ISBASI_HTTP_${response.status}`);
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json") && !contentType.startsWith("application/vnd.api+json")) {
    throw new Error("ISBASI_RESPONSE_CONTENT_TYPE_INVALID");
  }
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) throw new Error("ISBASI_RESPONSE_TOO_LARGE");
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) throw new Error("ISBASI_RESPONSE_TOO_LARGE");
  try {
    const parsed = asRecord(JSON.parse(text));
    if (!parsed) throw new Error("invalid");
    return parsed;
  } catch {
    throw new Error("ISBASI_RESPONSE_JSON_INVALID");
  }
}

function requiredString(record: Record<string, unknown>, names: readonly string[], code: string): string {
  for (const name of names) {
    const value = record[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  throw new Error(code);
}

export function createIsbasiHttpClient(config: IsbasiConfig, fetcher: typeof fetch = fetch): IsbasiHttpClient {
  async function post(path: string, body: unknown, headers: Record<string, string>): Promise<Record<string, unknown>> {
    assertRelativePath(path);
    const response = await fetcher(`${config.baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8", "apiKey": config.apiKey, ...headers },
      body: JSON.stringify(body),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const result = await readJsonResponse(response);
    if (result.isError === true) throw new Error("ISBASI_API_FAILURE");
    return result;
  }

  return {
    async login(): Promise<IsbasiSession> {
      const result = await post(config.loginPath, { username: config.username, password: config.password }, {});
      const data = asRecord(result.data) ?? result;
      return {
        accessToken: requiredString(data, ["access_token", "accessToken", "token", "Token"], "ISBASI_LOGIN_TOKEN_INVALID"),
        tenantId: requiredString(data, ["tenantId", "tenantID", "TenantId"], "ISBASI_LOGIN_TENANT_INVALID"),
      };
    },
    async postAuthenticated<T>(path: string, body: unknown, session: IsbasiSession): Promise<T> {
      if (!session.accessToken.trim() || !session.tenantId.trim()) throw new TypeError("ISBASI_SESSION_INVALID");
      return await post(path, body, {
        Authorization: `Bearer ${session.accessToken}`,
        tenantId: session.tenantId,
        lang: "tr-TR",
      }) as T;
    },
  };
}
