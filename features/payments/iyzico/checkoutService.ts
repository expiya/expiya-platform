import { randomUUID } from "node:crypto";

import type { IyzicoHttpClient } from "./httpClient";
import { initializeIyzicoCheckout, retrieveIyzicoCheckout, type IyzicoBuyerInput } from "./checkout";
import type { IyzicoOrderRepository } from "./orderRepository";
import type { PaidComparisonLegalAcceptance } from "@/features/paid-comparison/legalArtifacts";

export async function startIyzicoCheckout(input: {
  readonly quoteId: string;
  readonly buyer: IyzicoBuyerInput;
  readonly buyerIp: string;
  readonly callbackUrl: string;
  readonly secretKey: string;
  readonly client: IyzicoHttpClient;
  readonly repository: IyzicoOrderRepository;
  readonly legalAcceptance: PaidComparisonLegalAcceptance;
  readonly subjectHash: string;
  readonly orderId?: string;
  readonly now?: Date;
}) {
  const now = input.now ?? new Date();
  const orderId = input.orderId ?? randomUUID();
  const order = await input.repository.createFromQuote({ orderId, quoteId: input.quoteId, now, legalAcceptance: input.legalAcceptance, subjectHash: input.subjectHash, deliveryEmail: input.buyer.email });
  try {
    const checkout = await initializeIyzicoCheckout({
      client: input.client,
      secretKey: input.secretKey,
      orderId,
      quoteId: order.quoteId,
      amountKurus: order.amountKurus,
      callbackUrl: input.callbackUrl,
      buyerIp: input.buyerIp,
      buyer: input.buyer,
    });
    const expiresAt = new Date(now.getTime() + Math.min(checkout.tokenExpireTime ?? 1_800, 1_800) * 1_000);
    await input.repository.markInitialized({ orderId, token: checkout.token, expiresAt });
    return { orderId, paymentPageUrl: checkout.paymentPageUrl, expiresAt: expiresAt.toISOString() };
  } catch (error) {
    await input.repository.markFailed(orderId);
    throw error;
  }
}

export async function finalizeIyzicoCheckout(input: {
  readonly token: string;
  readonly secretKey: string;
  readonly client: IyzicoHttpClient;
  readonly repository: IyzicoOrderRepository;
  readonly jobId?: string;
  readonly now?: Date;
}) {
  const now = input.now ?? new Date();
  const order = await input.repository.findPendingByToken(input.token);
  try {
    const payment = await retrieveIyzicoCheckout({
      client: input.client,
      secretKey: input.secretKey,
      orderId: order.orderId,
      token: input.token,
      quoteId: order.quoteId,
      expectedAmountKurus: order.amountKurus,
    });
    await input.repository.markPaidAndQueue({ orderId: order.orderId, paymentId: payment.paymentId, jobId: input.jobId ?? randomUUID(), now });
    return { orderId: order.orderId, status: "PAID" as const };
  } catch (error) {
    await input.repository.markReviewRequired(order.orderId);
    throw error;
  }
}
