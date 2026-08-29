import type { SqlQueryable } from "@/features/vehicle-data/repository";

export type PaidReportStatus = "QUEUED" | "RUNNING" | "READY" | "FAILED" | "REFUND_REQUIRED";

export class PostgresPaidReportStatusRepository {
  constructor(private readonly database: SqlQueryable) {}

  async findByAccessTokenHash(tokenHash: string): Promise<{ readonly status: PaidReportStatus } | undefined> {
    const result = await this.database.query(
      `select j.status
         from paid_report_orders o
         join comparison_report_jobs j on j.order_id = o.id
        where o.access_token_hash = $1 and o.status = 'PAID'`,
      [tokenHash],
    ) as { rows?: { status: string }[] };
    const status = result.rows?.[0]?.status;
    if (!status) return undefined;
    if (status === "SUCCEEDED") return { status: "READY" };
    if (["QUEUED", "RUNNING", "FAILED", "REFUND_REQUIRED"].includes(status)) return { status: status as PaidReportStatus };
    return undefined;
  }
}
