import { processOnePaidComparisonReport } from "@/features/paid-comparison/reportWorker";

const result = await processOnePaidComparisonReport();
process.stdout.write(`${JSON.stringify(result)}\n`);
