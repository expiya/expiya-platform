import type { SqlQueryable } from "@/features/vehicle-data/repository";

export class PostgresPaidComparisonReportDocumentRepository {
  constructor(private readonly database: SqlQueryable) {}

  async findByAccessTokenHash(tokenHash: string): Promise<unknown | undefined> {
    const result = await this.database.query(
      `select d.document
         from paid_report_orders o
         join comparison_report_documents d on d.order_id = o.id
         join comparison_report_jobs j on j.order_id = o.id and j.status = 'SUCCEEDED'
        where o.access_token_hash = $1 and o.status = 'PAID'`,
      [tokenHash],
    ) as { rows?: { document: unknown }[] };
    return result.rows?.[0]?.document;
  }
}
