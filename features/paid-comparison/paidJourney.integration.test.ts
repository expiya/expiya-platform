import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { CatalogVariantSnapshot } from "@/features/decision/v2/catalog/types";
import { paidComparisonLegalArtifacts } from "./legalArtifacts";
import type { PaidComparisonReportJob, PaidComparisonReportJobRepository } from "./reportJobRepository";
import { processOnePaidComparisonReport } from "./reportWorker";
import type { IyzicoOrderRepository } from "@/features/payments/iyzico/orderRepository";
import { finalizeIyzicoCheckout, startIyzicoCheckout } from "@/features/payments/iyzico/checkoutService";
import type { IyzicoHttpClient } from "@/features/payments/iyzico/httpClient";

const signature = (values: readonly (string | number)[]) => createHmac("sha256", "sandbox-secret").update(values.join(":"), "utf8").digest("hex");
const provenance = [{ sourceId: "official", sourceUrl: "https://manufacturer.example/spec", accessedAt: "2026-08-29", extractionMethod: "MANUAL" as const, confidence: "HIGH" as const, limitations: [] }];
const fact = <T,>(value: T) => ({ value, confidence: "HIGH" as const, provenance, catalogFingerprint: "fp", explanationAccess: "AUTHORITY_REQUIRED" as const });
const variant = (id: string, price: number): CatalogVariantSnapshot => ({ id, market: "TR", lifecycleStatus: "ON_SALE", brand: "Marka", model: id, trim: "Exact", identityProvenance: provenance, decisionFacts: { bodyStyle: fact("SUV"), modelYear: fact(2026), powertrain: { fuelType: fact("GASOLINE"), powerKw: fact(100), transmission: fact("Otomatik") }, dimensions: { luggageLitres: fact(400) }, efficiency: { combinedLitresPer100Km: fact(6) }, safetyFeatureCodes: [] }, activeNewPrice: { id: `p-${id}`, vehicleVariantId: id, market: "TR", condition: "NEW", amountTry: price, priceType: "LIST", consumerVisibility: "PUBLIC", realizationSafe: true, validFrom: "2026-08-01", taxTreatment: "INCLUDED", confidence: "HIGH", provenance, catalogFingerprint: "fp" } });

describe("paid comparison purchase-to-report journey", () => {
  it("never publishes before signed 349 TRY payment verification, then builds the pinned three-vehicle report", async () => {
    let state: "QUOTE" | "INITIALIZED" | "PAID" = "QUOTE";
    let queued: PaidComparisonReportJob | undefined;
    const orderRepository: IyzicoOrderRepository = {
      createFromQuote: vi.fn(async () => ({ orderId: "order", quoteId: "quote", amountKurus: 34_900, currency: "TRY" as const })),
      markInitialized: vi.fn(async () => { state = "INITIALIZED"; }),
      markFailed: vi.fn(), markReviewRequired: vi.fn(), grantReportAccess: vi.fn(),
      findPendingByToken: vi.fn(async () => { if (state !== "INITIALIZED") throw new Error("NOT_PENDING"); return { orderId: "order", quoteId: "quote", providerToken: "token", amountKurus: 34_900, currency: "TRY" as const }; }),
      markPaidAndQueue: vi.fn(async () => { state = "PAID"; queued = { jobId: "job", orderId: "order", quoteId: "quote", catalogReleaseVersion: "1", catalogFingerprint: "fp", approvedNeeds: [{ concept: "budgetMax", summary: "Kesin bütçe", value: 1_500_000 }], exactVariantIds: ["decision", "one", "two"] }; }),
    };
    const initializeClient = { post: vi.fn(async () => ({ status: "success" as const, conversationId: "order", token: "token", tokenExpireTime: 1800, paymentPageUrl: "https://sandbox-cpp.iyzipay.com/token", signature: signature(["order", "token"]) })) } as unknown as IyzicoHttpClient;
    await startIyzicoCheckout({ quoteId: "quote", orderId: "order", now: new Date("2026-08-29T10:00:00Z"), buyer: { name: "Ada", surname: "Yılmaz", identityNumber: "11111111111", email: "ada@example.com", gsmNumber: "+905350000000", billingAddress: { address: "Test Mahallesi No 1", city: "İstanbul" } }, buyerIp: "127.0.0.1", callbackUrl: "https://sandbox.example/callback", secretKey: "sandbox-secret", client: initializeClient, repository: orderRepository, subjectHash: "a".repeat(24), legalAcceptance: { preInformationVersion: paidComparisonLegalArtifacts.preInformation.version, distanceContractVersion: paidComparisonLegalArtifacts.distanceContract.version, immediatePerformanceVersion: paidComparisonLegalArtifacts.immediatePerformance.version, preInformationAccepted: true, distanceContractAccepted: true, immediatePerformanceAccepted: true, acceptedAt: "2026-08-29T10:00:00.000Z" } });
    expect(state).toBe("INITIALIZED"); expect(queued).toBeUndefined();

    const retrieveValues = ["SUCCESS", "payment", "TRY", "quote", "order", 349, 349, "token"] as const;
    const retrieveClient = { post: vi.fn(async () => ({ status: "success" as const, paymentStatus: "SUCCESS", paymentId: "payment", currency: "TRY", basketId: "quote", conversationId: "order", paidPrice: 349, price: 349, token: "token", signature: signature(retrieveValues) })) } as unknown as IyzicoHttpClient;
    await finalizeIyzicoCheckout({ token: "token", secretKey: "sandbox-secret", client: retrieveClient, repository: orderRepository, jobId: "job", now: new Date("2026-08-29T10:01:00Z") });
    expect(state).toBe("PAID"); expect(queued).toBeDefined();

    let document: unknown;
    const reportRepository: PaidComparisonReportJobRepository = { claim: vi.fn(async () => queued), complete: vi.fn(async (input) => { document = input.document; }), fail: vi.fn() };
    const variants = [variant("decision", 1_400_000), variant("one", 1_500_000), variant("two", 1_600_000)];
    const loadCatalog = vi.fn(async () => ({ status: "READY", snapshot: { variantById: { get: (id: string) => variants.find((item) => item.id === id) } } }));
    await expect(processOnePaidComparisonReport({ repository: reportRepository, loadCatalog: loadCatalog as never, reportId: "report", now: new Date("2026-08-29T10:02:00Z") })).resolves.toEqual({ status: "SUCCEEDED", jobId: "job" });
    expect(document).toMatchObject({ schemaVersion: "paid-comparison-report/v1", vehicles: [{ exactVariantId: "decision" }, { exactVariantId: "one" }, { exactVariantId: "two" }] });
  });
});
