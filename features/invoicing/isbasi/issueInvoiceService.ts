import "server-only";

import { createPaidComparisonIsbasiInvoice, isbasiInvoiceCustomerSchema } from "./invoice";
import type { IsbasiHttpClient } from "./httpClient";
import type { PaidReportInvoiceRepository } from "./invoiceRepository";

export async function issuePaidReportInvoice(input: {
  readonly accessTokenHash: string;
  readonly customer: unknown;
  readonly repository: PaidReportInvoiceRepository;
  readonly client: IsbasiHttpClient;
  readonly now?: Date;
}) {
  const customer = isbasiInvoiceCustomerSchema.parse(input.customer);
  const now = input.now ?? new Date();
  const claim = await input.repository.claim(input.accessTokenHash, now);
  if (claim.status !== "CLAIMED") return claim;
  try {
    const session = await input.client.login();
    const issued = await createPaidComparisonIsbasiInvoice({
      client: input.client,
      session,
      orderId: claim.orderId,
      paidAt: claim.paidAt,
      customer,
    });
    await input.repository.markIssued(claim.orderId, issued.invoiceId, now);
    return { status: "ISSUED" as const };
  } catch (error) {
    const failureCode = error instanceof Error && /^ISBASI_[A-Z0-9_]+$/u.test(error.message)
      ? error.message
      : "ISBASI_PROVIDER_RESULT_UNKNOWN";
    await input.repository.markReviewRequired(claim.orderId, failureCode, now);
    return { status: "REVIEW_REQUIRED" as const };
  }
}
