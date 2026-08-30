import type { SqlConnection, SqlQueryable } from "@/features/vehicle-data/repository";
import type { ApprovedDecisionNeed } from "@/features/sales-advisor/types";
import { randomUUID } from "node:crypto";

export interface PaidComparisonReportJob {
  readonly jobId: string;
  readonly orderId: string;
  readonly quoteId: string;
  readonly catalogReleaseVersion: string;
  readonly catalogFingerprint: string;
  readonly approvedNeeds: readonly ApprovedDecisionNeed[];
  readonly exactVariantIds: readonly [string, string, string];
}

export interface PaidComparisonReportJobRepository {
  claim(now: Date): Promise<PaidComparisonReportJob | undefined>;
  complete(input: { readonly job: PaidComparisonReportJob; readonly reportId: string; readonly document: unknown; readonly generatedAt: Date }): Promise<void>;
  fail(jobId: string, failureCode: string, now: Date): Promise<void>;
}

export class PostgresPaidComparisonReportJobRepository {
  constructor(private readonly database: SqlQueryable) {}

  private async transaction<T>(operation: (connection: SqlQueryable | SqlConnection) => Promise<T>): Promise<T> {
    const pooled = this.database.connect ? await this.database.connect() : undefined;
    const connection = pooled ?? this.database;
    await connection.query("begin");
    try { const result = await operation(connection); await connection.query("commit"); return result; }
    catch (error) { await connection.query("rollback"); throw error; }
    finally { pooled?.release(); }
  }

  async claim(now: Date): Promise<PaidComparisonReportJob | undefined> {
    return this.transaction(async (connection) => {
      const claimed = await connection.query(
        `select j.id
           from comparison_report_jobs j
          where (j.status = 'QUEUED' or (j.status = 'RUNNING' and j.started_at < $1::timestamptz - interval '15 minutes'))
            and j.attempt_count < 3
          order by j.created_at
          for update skip locked
          limit 1`,
        [now.toISOString()],
      ) as { rows?: { id: string }[] };
      const jobId = claimed.rows?.[0]?.id;
      if (!jobId) return undefined;
      const result = await connection.query(
        `select j.id as job_id, j.order_id, j.quote_id, q.catalog_release_version,
                q.catalog_fingerprint, q.approved_needs,
                array_agg(v.exact_variant_id order by case v.role when 'DECISION_CARD' then 0 when 'ALTERNATIVE_1' then 1 else 2 end) as exact_variant_ids
           from comparison_report_jobs j
           join comparison_report_quotes q on q.id = j.quote_id
           join comparison_report_quote_vehicles v on v.quote_id = q.id
          where j.id = $1
          group by j.id, q.id`,
        [jobId],
      ) as { rows?: { job_id: string; order_id: string; quote_id: string; catalog_release_version: string; catalog_fingerprint: string; approved_needs: unknown; exact_variant_ids: string[] }[] };
      const row = result.rows?.[0];
      if (!row) return undefined;
      if (!Array.isArray(row.exact_variant_ids) || row.exact_variant_ids.length !== 3) throw new TypeError("PAID_REPORT_JOB_VARIANTS_INVALID");
      const needs = Array.isArray(row.approved_needs) ? row.approved_needs.filter((item): item is ApprovedDecisionNeed => Boolean(item && typeof item === "object" && typeof (item as { concept?: unknown }).concept === "string" && typeof (item as { summary?: unknown }).summary === "string")) : [];
      await connection.query(`update comparison_report_jobs set status = 'RUNNING', started_at = $2, attempt_count = attempt_count + 1, failure_code = null where id = $1`, [row.job_id, now.toISOString()]);
      return { jobId: row.job_id, orderId: row.order_id, quoteId: row.quote_id, catalogReleaseVersion: row.catalog_release_version, catalogFingerprint: row.catalog_fingerprint, approvedNeeds: needs, exactVariantIds: row.exact_variant_ids as [string, string, string] };
    });
  }

  async complete(input: { readonly job: PaidComparisonReportJob; readonly reportId: string; readonly document: unknown; readonly generatedAt: Date }): Promise<void> {
    await this.transaction(async (connection) => {
      await connection.query(
        `insert into comparison_report_documents
          (id, order_id, quote_id, schema_version, catalog_release_version, catalog_fingerprint, document, generated_at)
         values ($1,$2,$3,'paid-comparison-report/v1',$4,$5,$6::jsonb,$7)`,
        [input.reportId, input.job.orderId, input.job.quoteId, input.job.catalogReleaseVersion, input.job.catalogFingerprint, JSON.stringify(input.document), input.generatedAt.toISOString()],
      );
      const result = await connection.query(`update comparison_report_jobs set status = 'SUCCEEDED', completed_at = $2 where id = $1 and status = 'RUNNING' returning id`, [input.job.jobId, input.generatedAt.toISOString()]) as { rows?: { id: string }[] };
      if (!result.rows?.length) throw new TypeError("PAID_REPORT_JOB_COMPLETE_TRANSITION_INVALID");
      await connection.query(
        `insert into paid_report_vehicle_entitlements
          (order_id, quote_id, conversation_id, exact_variant_id, source_role, catalog_release_version, granted_at)
         select $1, q.id, q.conversation_id, v.exact_variant_id, v.role, q.catalog_release_version, $3
           from comparison_report_quotes q join comparison_report_quote_vehicles v on v.quote_id = q.id
          where q.id = $2
         on conflict (order_id, exact_variant_id) do nothing`,
        [input.job.orderId, input.job.quoteId, input.generatedAt.toISOString()],
      );
      await connection.query(
        `insert into paid_comparison_events (id, event_name, quote_id, order_id)
         values ($1,'REPORT_READY',$2,$3)`,
        [randomUUID(), input.job.quoteId, input.job.orderId],
      );
      await connection.query(
        `insert into paid_report_email_outbox (order_id, report_id, status, created_at)
         select $1,$2,'PENDING',$3 from paid_report_orders where id = $1 and delivery_email_encrypted is not null
         on conflict (order_id) do nothing`,
        [input.job.orderId, input.reportId, input.generatedAt.toISOString()],
      );
    });
  }

  async fail(jobId: string, failureCode: string, now: Date): Promise<void> {
    await this.database.query(
      `with failed as (
        update comparison_report_jobs
          set status = case when attempt_count >= 3 then 'REFUND_REQUIRED' else 'QUEUED' end,
              failure_code = $2, completed_at = case when attempt_count >= 3 then $3 else null end
        where id = $1 and status = 'RUNNING'
        returning quote_id, order_id, status
       )
       insert into paid_comparison_events (id, event_name, quote_id, order_id)
       select $4, 'REPORT_FAILED', quote_id, order_id from failed where status = 'REFUND_REQUIRED'`,
      [jobId, failureCode.slice(0, 80), now.toISOString(), randomUUID()],
    );
  }
}
