import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";

const testDatabaseUrl = process.env.CARS_DECISION_V2_TEST_DATABASE_URL?.trim();
if (!testDatabaseUrl) {
  console.error("CARS_VALIDATION_TEST_DATABASE_URL_MISSING");
  process.exit(1);
}
if (!process.env.OPENAI_API_KEY?.trim()) {
  console.error("CARS_VALIDATION_PROVIDER_MISSING");
  process.exit(1);
}

const npmCli = process.env.npm_execpath;
if (!npmCli) {
  console.error("CARS_VALIDATION_NPM_CLI_MISSING");
  process.exit(1);
}

const child = spawn(process.execPath, [npmCli, "run", "dev"], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: testDatabaseUrl,
    CARS_DECISION_V2_DATABASE_ENV: "development",
    CARS_CONVERSATION_LOCAL_TESTING: "true",
    CARS_DECISION_V2_PUBLIC: "true",
    CARS_DECISION_V2_SIGNING_SECRET: randomBytes(32).toString("hex"),
  },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
