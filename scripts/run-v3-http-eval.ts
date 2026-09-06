import { spawn } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { POST } from "../app/api/cars/conversation/v3/route";

process.env.CARS_V31_PROVIDER_DISABLED = "true";

const server = createServer(async (incoming, outgoing) => {
  try {
    if (incoming.method !== "POST" || incoming.url !== "/api/cars/conversation/v3") {
      outgoing.statusCode = 404; outgoing.end("Not found"); return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of incoming) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    const address = server.address();
    if (!address || typeof address === "string") throw new TypeError("V3_HTTP_EVAL_SERVER_ADDRESS_MISSING");
    const headers = new Headers();
    for (const [name, value] of Object.entries(incoming.headers)) {
      if (Array.isArray(value)) value.forEach((item) => headers.append(name, item));
      else if (value !== undefined) headers.set(name, value);
    }
    const request = new Request(`http://127.0.0.1:${address.port}${incoming.url}`, { method: "POST", headers, body: Buffer.concat(chunks).toString("utf8") });
    const response = await POST(request);
    outgoing.statusCode = response.status;
    response.headers.forEach((value, name) => outgoing.setHeader(name, value));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    outgoing.statusCode = 500;
    outgoing.setHeader("content-type", "application/json");
    outgoing.end(JSON.stringify({ message: error instanceof Error ? error.message : String(error) }));
  }
});

async function main() {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new TypeError("V3_HTTP_EVAL_SERVER_ADDRESS_MISSING");
  const promptfoo = path.join(process.cwd(), "node_modules", ".bin", "promptfoo");
  const child = spawn(promptfoo, ["eval", "-c", "evals/cars-v3/promptfoo.http.yaml", "-j", "1", "--no-cache", "--no-share", "-o", "evals/cars-v3/results/http-smoke.json"], {
    cwd: process.cwd(), stdio: "inherit",
    env: { ...process.env, CARS_V31_PROVIDER_DISABLED: "true", CARS_V3_EVAL_BASE_URL: `http://127.0.0.1:${address.port}`, PROMPTFOO_DISABLE_TELEMETRY: "1", PROMPTFOO_CONFIG_DIR: "evals/cars-v3/.promptfoo" },
  });
  const exitCode = await new Promise<number>((resolve) => {
    child.once("error", () => resolve(1));
    child.once("exit", (code) => resolve(code ?? 1));
  });
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  process.exitCode = exitCode;
}

main().catch(async (error) => {
  if (server.listening) await new Promise<void>((resolve) => server.close(() => resolve()));
  console.error(error);
  process.exitCode = 1;
});
