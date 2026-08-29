import type { SqlQueryable } from "@/features/vehicle-data/repository";
import type { IyzicoCheckoutWebhook } from "./webhookSignature";

export class PostgresIyzicoWebhookRepository {
  constructor(private readonly database: SqlQueryable) {}

  async recordAccepted(payload: IyzicoCheckoutWebhook): Promise<"RECORDED" | "DUPLICATE"> {
    const order = await this.database.query(
      `select id from paid_report_orders where provider = 'IYZICO' and provider_conversation_id = $1`,
      [payload.paymentConversationId],
    ) as { rows?: { id: string }[] };
    const orderId = order.rows?.[0]?.id;
    if (!orderId) throw new TypeError("IYZICO_WEBHOOK_ORDER_NOT_FOUND");
    const eventKey = [payload.iyziEventType, payload.iyziPaymentId, payload.token, payload.status].join(":");
    const result = await this.database.query(
      `insert into payment_webhook_events
        (provider, provider_event_key, order_id, signature_version, status, payload)
       values ('IYZICO',$1,$2,'V3','ACCEPTED',$3::jsonb)
       on conflict (provider, provider_event_key) do nothing
       returning provider_event_key`,
      [eventKey, orderId, JSON.stringify(payload)],
    ) as { rows?: { provider_event_key: string }[] };
    return result.rows?.length ? "RECORDED" : "DUPLICATE";
  }
}
