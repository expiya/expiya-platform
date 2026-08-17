import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

function databaseIdentity(value: string): string {
  const parsed = new URL(value);
  return `${parsed.hostname.toLowerCase()}:${parsed.port || "5432"}/${parsed.pathname.replace(/^\//u, "")}`;
}

const testDatabaseUrl = process.env.CARS_DECISION_V2_TEST_DATABASE_URL?.trim();
const defaultDatabaseUrl = process.env.DATABASE_URL?.trim();
const localPort = process.env.CARS_DECISION_V2_LOCAL_PORT?.trim() || "4071";
if (!testDatabaseUrl) throw new Error("CARS_DECISION_V2_TEST_DATABASE_URL_REQUIRED");
if (process.env.CARS_DECISION_V2_DATABASE_ENV !== "development") throw new Error("CARS_DECISION_V2_DATABASE_ENV_MUST_BE_DEVELOPMENT");
if (!defaultDatabaseUrl) throw new Error("DEFAULT_DATABASE_URL_REQUIRED_FOR_IDENTITY_CHECK");
if (databaseIdentity(testDatabaseUrl) === databaseIdentity(defaultDatabaseUrl)) throw new Error("TEST_DATABASE_IDENTITY_MUST_DIFFER_FROM_DEFAULT");
if (!/^\d{4,5}$/u.test(localPort) || Number(localPort) < 1024 || Number(localPort) > 65_535) throw new Error("CARS_DECISION_V2_LOCAL_PORT_INVALID");

const child = spawn("./node_modules/.bin/next", ["dev", "--hostname", "localhost", "--port", localPort], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    DATABASE_URL: testDatabaseUrl,
    CARS_DECISION_V2_PUBLIC: "true",
    CARS_DECISION_V2_SHADOW: "false",
    CARS_DECISION_V2_SIGNING_SECRET: randomBytes(48).toString("base64url"),
  },
  stdio: "inherit",
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => child.kill(signal));
}

child.once("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exitCode = code ?? 1;
});
