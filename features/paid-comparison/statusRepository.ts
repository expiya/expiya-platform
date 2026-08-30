import type { SqlQueryable } from "@/features/vehicle-data/repository";

export type PaidReportStatus = "QUEUED" | "RUNNING" | "READY" | "FAILED" | "REFUND_REQUIRED";

export class PostgresPaidReportStatusRepository {
  constructor(private readonly database: SqlQueryable) {}

  async findByAccessTokenHash(tokenHash: string): Promise<{ readonly status: PaidReportStatus; readonly emailDelivery?: "QUEUED" | "SENT" | "FAILED"; readonly maskedEmail?: string } | undefined> {
    const result = await this.database.query(
      `select j.status, e.status as email_status, o.delivery_email_masked
         from paid_report_orders o
         join comparison_report_jobs j on j.order_id = o.id
         left join paid_report_email_outbox e on e.order_id = o.id
        where o.access_token_hash = $1 and o.status = 'PAID'`,
      [tokenHash],
    ) as { rows?: { status: string; email_status: string | null; delivery_email_masked: string | null }[] };
    const row = result.rows?.[0]; const status = row?.status;
    if (!status) return undefined;
    if (status === "SUCCEEDED") return { status: "READY", emailDelivery: row?.email_status === "SENT" ? "SENT" : row?.email_status === "FAILED" ? "FAILED" : row?.email_status ? "QUEUED" : undefined, maskedEmail: row?.delivery_email_masked ?? undefined };
    if (["QUEUED", "RUNNING", "FAILED", "REFUND_REQUIRED"].includes(status)) return { status: status as PaidReportStatus };
    return undefined;
  }
}
