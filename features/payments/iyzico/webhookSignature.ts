import { createHmac, timingSafeEqual } from "node:crypto";

export interface IyzicoCheckoutWebhook {
  readonly iyziEventType: string;
  readonly iyziPaymentId: string;
  readonly token: string;
  readonly paymentConversationId: string;
  readonly status: string;
}

export function createIyzicoCheckoutWebhookSignature(secretKey: string, payload: IyzicoCheckoutWebhook): string {
  const message = secretKey
    + payload.iyziEventType
    + payload.iyziPaymentId
    + payload.token
    + payload.paymentConversationId
    + payload.status;
  return createHmac("sha256", secretKey).update(message, "utf8").digest("hex");
}

export function verifyIyzicoCheckoutWebhookSignature(input: {
  readonly secretKey: string;
  readonly signature: string | null;
  readonly payload: IyzicoCheckoutWebhook;
}): boolean {
  if (!input.signature || !/^[a-f\d]{64}$/iu.test(input.signature)) return false;
  const expected = Buffer.from(createIyzicoCheckoutWebhookSignature(input.secretKey, input.payload), "hex");
  const actual = Buffer.from(input.signature, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
