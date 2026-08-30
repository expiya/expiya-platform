import type { SqlConnection, SqlQueryable } from "@/features/vehicle-data/repository";
import type { ComparisonReportQuote } from "./contracts";
import { randomUUID } from "node:crypto";

export interface PaidComparisonQuoteRepository {
  createQuote(quote: ComparisonReportQuote): Promise<void>;
}

const developmentQuotes = new Map<string, ComparisonReportQuote>();

export class DevelopmentPaidComparisonQuoteRepository implements PaidComparisonQuoteRepository {
  async createQuote(quote: ComparisonReportQuote): Promise<void> {
    if (process.env.NODE_ENV === "production") throw new TypeError("DEVELOPMENT_QUOTE_STORE_DISABLED");
    developmentQuotes.set(quote.id, quote);
  }

  find(quoteId: string): ComparisonReportQuote | undefined {
    if (process.env.NODE_ENV === "production") return undefined;
    return developmentQuotes.get(quoteId);
  }
}

export function resetDevelopmentPaidComparisonQuotesForTests(): void {
  developmentQuotes.clear();
}

export function findDevelopmentPaidComparisonQuote(quoteId: string): ComparisonReportQuote | undefined {
  if (process.env.NODE_ENV === "production") return undefined;
  return developmentQuotes.get(quoteId);
}

export class PostgresPaidComparisonQuoteRepository implements PaidComparisonQuoteRepository {
  constructor(private readonly database: SqlQueryable) {}

  async createQuote(quote: ComparisonReportQuote): Promise<void> {
    const pooled = this.database.connect ? await this.database.connect() : undefined;
    const connection: SqlQueryable | SqlConnection = pooled ?? this.database;
    await connection.query("begin");
    try {
      await connection.query(
        `insert into comparison_report_quotes
          (id, product_code, conversation_id, decision_id, catalog_release_version,
          catalog_fingerprint, approved_needs, amount_kurus, currency, tax_included, status, expires_at, created_at)
         values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13)`,
        [quote.id, quote.productCode, quote.conversationId, quote.decisionId,
          quote.catalogReleaseVersion, quote.catalogFingerprint, JSON.stringify(quote.approvedNeeds), quote.amountKurus,
          quote.currency, quote.taxIncluded, quote.status, quote.expiresAt, quote.createdAt],
      );
      for (const vehicle of quote.vehicles) {
        await connection.query(
          `insert into comparison_report_quote_vehicles (quote_id, exact_variant_id, role)
           values ($1,$2,$3)`,
          [quote.id, vehicle.exactVariantId, vehicle.role],
        );
      }
      await connection.query("commit");
      try {
        await this.database.query(
          `insert into paid_comparison_events (id, event_name, conversation_id, decision_id, exact_variant_id, quote_id)
           values ($1,'QUOTE_CREATED',$2,$3,$4,$5)`,
          [randomUUID(), quote.conversationId, quote.decisionId, quote.vehicles[0].exactVariantId, quote.id],
        );
      } catch {
        // Measurement must never invalidate a customer quote.
      }
    } catch (error) {
      await connection.query("rollback");
      throw error;
    } finally {
      pooled?.release();
    }
  }
}
