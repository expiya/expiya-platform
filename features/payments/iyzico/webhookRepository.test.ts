import { describe, expect, it, vi } from "vitest";

import { PostgresIyzicoWebhookRepository } from "./webhookRepository";

const payload = { iyziEventType: "CHECKOUT_FORM_AUTH", iyziPaymentId: "payment", token: "token", paymentConversationId: "order", status: "SUCCESS" };

describe("PostgresIyzicoWebhookRepository", () => {
  it("records a known order and treats provider retries as duplicates", async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: "order-id" }] })
      .mockResolvedValueOnce({ rows: [{ provider_event_key: "key" }] })
      .mockResolvedValueOnce({ rows: [{ id: "order-id" }] })
      .mockResolvedValueOnce({ rows: [] });
    const repository = new PostgresIyzicoWebhookRepository({ query });
    await expect(repository.recordAccepted(payload)).resolves.toBe("RECORDED");
    await expect(repository.recordAccepted(payload)).resolves.toBe("DUPLICATE");
  });

  it("does not persist a webhook that is not bound to an order", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    await expect(new PostgresIyzicoWebhookRepository({ query }).recordAccepted(payload)).rejects.toThrow("IYZICO_WEBHOOK_ORDER_NOT_FOUND");
    expect(query).toHaveBeenCalledOnce();
  });
});
