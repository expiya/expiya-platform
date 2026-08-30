import { getPostgresDatabase } from "../lib/server/postgres";
import { PostgresPaidReportEmailOutboxRepository, ResendPaidReportEmailClient, processOnePaidReportEmail, resolvePaidReportEmailConfig } from "../features/paid-comparison/reportEmailDelivery.server";
async function main() { const result = await processOnePaidReportEmail({ repository: new PostgresPaidReportEmailOutboxRepository(getPostgresDatabase()), client: new ResendPaidReportEmailClient(resolvePaidReportEmailConfig()) }); console.log(JSON.stringify(result)); }
void main();
