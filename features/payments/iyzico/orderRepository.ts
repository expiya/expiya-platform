import type { SqlConnection, SqlQueryable } from "@/features/vehicle-data/repository";

export interface CheckoutOrderContext {
  readonly orderId: string;
  readonly quoteId: string;
  readonly amountKurus: number;
  readonly currency: "TRY";
  readonly providerToken?: string;
}

export interface IyzicoOrderRepository {
  createFromQuote(input: { readonly orderId: string; readonly quoteId: string; readonly now: Date }): Promise<CheckoutOrderContext>;
  markInitialized(input: { readonly orderId: string; readonly token: string; readonly expiresAt: Date }): Promise<void>;
  markFailed(orderId: string): Promise<void>;
  markReviewRequired(orderId: string): Promise<void>;
  findPendingByToken(token: string): Promise<CheckoutOrderContext>;
  markPaidAndQueue(input: { readonly orderId: string; readonly paymentId: string; readonly jobId: string; readonly now: Date }): Promise<void>;
}

export class PostgresIyzicoOrderRepository implements IyzicoOrderRepository {
  constructor(private readonly database: SqlQueryable) {}

  private async transaction<T>(operation: (connection: SqlQueryable | SqlConnection) => Promise<T>): Promise<T> {
    const pooled = this.database.connect ? await this.database.connect() : undefined;
    const connection = pooled ?? this.database;
    await connection.query("begin");
    try {
      const result = await operation(connection);
      await connection.query("commit");
      return result;
    } catch (error) {
      await connection.query("rollback");
      throw error;
    } finally {
      pooled?.release();
    }
  }

  async createFromQuote(input: { readonly orderId: string; readonly quoteId: string; readonly now: Date }): Promise<CheckoutOrderContext> {
    return this.transaction(async (connection) => {
      const result = await connection.query(
        `select id, amount_kurus, currency, status, expires_at
           from comparison_report_quotes where id = $1 for update`,
        [input.quoteId],
      ) as { rows?: { id: string; amount_kurus: number; currency: string; status: string; expires_at: string | Date }[] };
      const quote = result.rows?.[0];
      if (!quote || quote.status !== "READY_FOR_CHECKOUT" || new Date(quote.expires_at).getTime() <= input.now.getTime()) {
        throw new TypeError("PAID_COMPARISON_QUOTE_NOT_CHECKOUT_READY");
      }
      if (quote.amount_kurus !== 34_900 || quote.currency !== "TRY") throw new TypeError("PAID_COMPARISON_QUOTE_PRICE_INVALID");
      await connection.query(
        `insert into paid_report_orders
          (id, quote_id, provider, provider_conversation_id, status, created_at, updated_at)
         values ($1,$2,'IYZICO',$1,'CREATED',$3,$3)`,
        [input.orderId, input.quoteId, input.now.toISOString()],
      );
      await connection.query(`update comparison_report_quotes set status = 'CHECKOUT_STARTED' where id = $1`, [input.quoteId]);
      return { orderId: input.orderId, quoteId: input.quoteId, amountKurus: quote.amount_kurus, currency: "TRY" };
    });
  }

  async markInitialized(input: { readonly orderId: string; readonly token: string; readonly expiresAt: Date }): Promise<void> {
    const result = await this.database.query(
      `update paid_report_orders set status = 'CHECKOUT_INITIALIZED', provider_token = $2,
         checkout_expires_at = $3, updated_at = now()
       where id = $1 and status = 'CREATED' returning id`,
      [input.orderId, input.token, input.expiresAt.toISOString()],
    ) as { rows?: { id: string }[] };
    if (!result.rows?.length) throw new TypeError("IYZICO_ORDER_INITIALIZE_TRANSITION_INVALID");
  }

  async markFailed(orderId: string): Promise<void> {
    await this.database.query(
      `update paid_report_orders set status = 'PAYMENT_FAILED', updated_at = now()
       where id = $1 and status in ('CREATED','CHECKOUT_INITIALIZED')`,
      [orderId],
    );
  }

  async markReviewRequired(orderId: string): Promise<void> {
    await this.database.query(
      `update paid_report_orders set status = 'PAYMENT_REVIEW_REQUIRED', updated_at = now()
       where id = $1 and status = 'CHECKOUT_INITIALIZED'`,
      [orderId],
    );
  }

  async findPendingByToken(token: string): Promise<CheckoutOrderContext> {
    const result = await this.database.query(
      `select o.id, o.quote_id, o.provider_token, q.amount_kurus, q.currency
         from paid_report_orders o join comparison_report_quotes q on q.id = o.quote_id
        where o.provider = 'IYZICO' and o.provider_token = $1 and o.status = 'CHECKOUT_INITIALIZED'`,
      [token],
    ) as { rows?: { id: string; quote_id: string; provider_token: string; amount_kurus: number; currency: string }[] };
    const row = result.rows?.[0];
    if (!row || row.amount_kurus !== 34_900 || row.currency !== "TRY") throw new TypeError("IYZICO_PENDING_ORDER_NOT_FOUND");
    return { orderId: row.id, quoteId: row.quote_id, providerToken: row.provider_token, amountKurus: row.amount_kurus, currency: "TRY" };
  }

  async markPaidAndQueue(input: { readonly orderId: string; readonly paymentId: string; readonly jobId: string; readonly now: Date }): Promise<void> {
    await this.transaction(async (connection) => {
      const updated = await connection.query(
        `update paid_report_orders set status = 'PAID', provider_payment_id = $2,
           paid_at = $3, updated_at = $3
         where id = $1 and status = 'CHECKOUT_INITIALIZED' returning quote_id`,
        [input.orderId, input.paymentId, input.now.toISOString()],
      ) as { rows?: { quote_id: string }[] };
      const quoteId = updated.rows?.[0]?.quote_id;
      if (!quoteId) throw new TypeError("IYZICO_ORDER_PAID_TRANSITION_INVALID");
      await connection.query(
        `insert into comparison_report_jobs (id, order_id, quote_id, status, created_at)
         values ($1,$2,$3,'QUEUED',$4)`,
        [input.jobId, input.orderId, quoteId, input.now.toISOString()],
      );
      await connection.query(`update comparison_report_quotes set status = 'CONSUMED' where id = $1`, [quoteId]);
    });
  }
}
