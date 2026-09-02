import "server-only";

import type { SqlQueryable } from "@/features/vehicle-data/repository";

export type InvoiceClaimResult =
  | { readonly status: "CLAIMED"; readonly orderId: string; readonly paidAt: Date }
  | { readonly status: "ISSUED" | "REVIEW_REQUIRED" | "NOT_FOUND" };

export interface PaidReportInvoiceRepository {
  claim(accessTokenHash: string, now: Date): Promise<InvoiceClaimResult>;
  markIssued(orderId: string, providerInvoiceId: string, now: Date): Promise<void>;
  markReviewRequired(orderId: string, failureCode: string, now: Date): Promise<void>;
}

export class PostgresPaidReportInvoiceRepository implements PaidReportInvoiceRepository {
  constructor(private readonly database: SqlQueryable) {}

  async claim(accessTokenHash: string, now: Date): Promise<InvoiceClaimResult> {
    const inserted = await this.database.query(
      `insert into paid_report_invoices (order_id, provider, status, claimed_at, updated_at)
       select o.id, 'ISBASI', 'PROCESSING', $2, $2 from paid_report_orders o
        where o.access_token_hash = $1 and o.status = 'PAID' and o.paid_at is not null
       on conflict (order_id) do nothing returning order_id`,
      [accessTokenHash, now.toISOString()],
    ) as { rows?: { order_id: string }[] };
    const orderId = inserted.rows?.[0]?.order_id;
    if (orderId) {
      const paid = await this.database.query(
        `select paid_at from paid_report_orders where id = $1 and status = 'PAID'`,
        [orderId],
      ) as { rows?: { paid_at: string | Date }[] };
      const paidAt = paid.rows?.[0]?.paid_at;
      if (!paidAt) throw new TypeError("ISBASI_PAID_ORDER_BINDING_INVALID");
      return { status: "CLAIMED", orderId, paidAt: new Date(paidAt) };
    }
    const existing = await this.database.query(
      `select i.status from paid_report_orders o
       left join paid_report_invoices i on i.order_id = o.id
       where o.access_token_hash = $1 and o.status = 'PAID'`,
      [accessTokenHash],
    ) as { rows?: { status: string | null }[] };
    const status = existing.rows?.[0]?.status;
    if (status === "ISSUED") return { status: "ISSUED" };
    if (status === "PROCESSING" || status === "REVIEW_REQUIRED") return { status: "REVIEW_REQUIRED" };
    return { status: "NOT_FOUND" };
  }

  async markIssued(orderId: string, providerInvoiceId: string, now: Date): Promise<void> {
    const result = await this.database.query(
      `update paid_report_invoices set status = 'ISSUED', provider_invoice_id = $2,
       completed_at = $3, updated_at = $3, failure_code = null
       where order_id = $1 and status = 'PROCESSING' returning order_id`,
      [orderId, providerInvoiceId, now.toISOString()],
    ) as { rows?: { order_id: string }[] };
    if (!result.rows?.length) throw new TypeError("ISBASI_INVOICE_ISSUED_TRANSITION_INVALID");
  }

  async markReviewRequired(orderId: string, failureCode: string, now: Date): Promise<void> {
    await this.database.query(
      `update paid_report_invoices set status = 'REVIEW_REQUIRED', failure_code = $2,
       updated_at = $3 where order_id = $1 and status = 'PROCESSING'`,
      [orderId, failureCode.slice(0, 80), now.toISOString()],
    );
  }
}
