import { afterEach, describe, expect, it } from "vitest";
import { paidComparisonLegalArtifacts } from "@/features/paid-comparison/legalArtifacts";
import { DevelopmentPaidComparisonQuoteRepository, resetDevelopmentPaidComparisonQuotesForTests } from "@/features/paid-comparison/repository";
import type { ComparisonReportQuote } from "@/features/paid-comparison/contracts";
import { DevelopmentIyzicoOrderRepository, resetDevelopmentIyzicoOrdersForTests } from "./developmentOrderRepository";

const quote = { id: "quote-1", status: "READY_FOR_CHECKOUT", amountKurus: 34_900, currency: "TRY", expiresAt: "2099-01-01T00:00:00.000Z" } as ComparisonReportQuote;
const legalAcceptance = { preInformationVersion: paidComparisonLegalArtifacts.preInformation.version, distanceContractVersion: paidComparisonLegalArtifacts.distanceContract.version, immediatePerformanceVersion: paidComparisonLegalArtifacts.immediatePerformance.version, preInformationAccepted: true, distanceContractAccepted: true, immediatePerformanceAccepted: true, acceptedAt: "2026-08-29T12:00:00.000Z" } as const;

describe("development iyzico order repository", () => {
  afterEach(() => { resetDevelopmentPaidComparisonQuotesForTests(); resetDevelopmentIyzicoOrdersForTests(); });

  it("keeps sandbox checkout and callback state without production PostgreSQL", async () => {
    await new DevelopmentPaidComparisonQuoteRepository().createQuote(quote);
    const repository = new DevelopmentIyzicoOrderRepository();
    await repository.createFromQuote({ orderId: "order-1", quoteId: quote.id, now: new Date("2026-08-29T12:00:00.000Z"), legalAcceptance, subjectHash: "subject" });
    await repository.markInitialized({ orderId: "order-1", token: "provider-token", expiresAt: new Date("2026-08-29T12:30:00.000Z") });
    expect(DevelopmentIyzicoOrderRepository.hasPendingToken("provider-token")).toBe(true);
    await repository.markPaidAndQueue({ orderId: "order-1", paymentId: "payment-1", jobId: "job-1", now: new Date("2026-08-29T12:01:00.000Z") });
    await repository.grantReportAccess({ orderId: "order-1", tokenHash: "access-hash" });
    expect(DevelopmentIyzicoOrderRepository.findStatus("access-hash")).toEqual({ status: "QUEUED" });
    await expect(DevelopmentIyzicoOrderRepository.processQueuedReport("access-hash", async () => ({ schemaVersion: "paid-comparison-report/v1" }))).resolves.toEqual({ status: "READY" });
    expect(DevelopmentIyzicoOrderRepository.findReportDocument("access-hash")).toEqual({ schemaVersion: "paid-comparison-report/v1" });
  });
});
