import { createHmac, randomBytes } from "node:crypto";

import type { IyzicoConfig } from "./config";

export function createIyzicoV2Authorization(input: {
  readonly apiKey: string;
  readonly secretKey: string;
  readonly path: string;
  readonly body: string;
  readonly randomKey: string;
}): string {
  if (!input.path.startsWith("/") || input.path.includes("?")) throw new TypeError("IYZICO_PATH_INVALID");
  const signature = createHmac("sha256", input.secretKey)
    .update(input.randomKey + input.path + input.body, "utf8")
    .digest("hex");
  const encoded = Buffer.from(
    `apiKey:${input.apiKey}&randomKey:${input.randomKey}&signature:${signature}`,
    "utf8",
  ).toString("base64");
  return `IYZWSv2 ${encoded}`;
}

export interface IyzicoHttpClient {
  post<TResponse>(path: string, body: unknown): Promise<TResponse>;
}

export function createIyzicoHttpClient(config: IyzicoConfig, fetcher: typeof fetch = fetch): IyzicoHttpClient {
  return {
    async post<TResponse>(path: string, body: unknown): Promise<TResponse> {
      const serialized = JSON.stringify(body);
      const randomKey = randomBytes(16).toString("hex");
      const response = await fetcher(`${config.baseUrl}${path}`, {
        method: "POST",
        headers: {
          Authorization: createIyzicoV2Authorization({
            apiKey: config.apiKey,
            secretKey: config.secretKey,
            path,
            body: serialized,
            randomKey,
          }),
          "Content-Type": "application/json",
          "x-iyzi-rnd": randomKey,
        },
        body: serialized,
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`IYZICO_HTTP_${response.status}`);
      const result = await response.json() as TResponse & { status?: string; errorCode?: string };
      if (result.status !== "success") throw new Error(`IYZICO_API_${result.errorCode ?? "FAILURE"}`);
      return result;
    },
  };
}
