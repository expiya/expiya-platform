import { assessPaidComparisonEnvironment } from "@/features/paid-comparison/readiness";

const result = assessPaidComparisonEnvironment(process.env);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (!result.ready) process.exitCode = 1;
