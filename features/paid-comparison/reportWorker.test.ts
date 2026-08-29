import { describe, expect, it, vi } from "vitest";
import type { CatalogVariantSnapshot } from "@/features/decision/v2/catalog/types";
import type { PaidComparisonReportJobRepository } from "./reportJobRepository";
import { processOnePaidComparisonReport } from "./reportWorker";

const provenance = [{ sourceId: "official", sourceUrl: "https://example.com", accessedAt: "2026-08-29", extractionMethod: "MANUAL" as const, confidence: "HIGH" as const, limitations: [] }];
const fact = <T,>(value: T) => ({ value, confidence: "HIGH" as const, provenance, catalogFingerprint: "fp", explanationAccess: "AUTHORITY_REQUIRED" as const });
const variant = (id: string): CatalogVariantSnapshot => ({ id, market: "TR", lifecycleStatus: "ON_SALE", brand: "B", model: "M", trim: id, identityProvenance: provenance, decisionFacts: { bodyStyle: fact("SUV"), modelYear: fact(2026), powertrain: { fuelType: fact("GASOLINE"), powerKw: fact(100), transmission: fact("A") }, dimensions: {}, efficiency: {}, safetyFeatureCodes: [] }, activeNewPrice: { id: `p-${id}`, vehicleVariantId: id, market: "TR", condition: "NEW", amountTry: 1, priceType: "LIST", consumerVisibility: "PUBLIC", realizationSafe: true, validFrom: "2026-08-01", taxTreatment: "INCLUDED", confidence: "HIGH", provenance, catalogFingerprint: "fp" } });
const job = { jobId: "job", orderId: "order", quoteId: "quote", catalogReleaseVersion: "1", catalogFingerprint: "fp", approvedNeeds: [{ concept: "primaryUsage", summary: "Ana kullanım: şehir" }], exactVariantIds: ["a", "b", "c"] as const };

describe("paid comparison report worker", () => {
  it("builds from the pinned catalog and completes atomically", async () => {
    const repository: PaidComparisonReportJobRepository = { claim: vi.fn().mockResolvedValue(job), complete: vi.fn(), fail: vi.fn() };
    const variants = [variant("a"), variant("b"), variant("c")];
    const loadCatalog = vi.fn().mockResolvedValue({ status: "READY", snapshot: { variantById: { get: (id: string) => variants.find((item) => item.id === id) } } });
    await expect(processOnePaidComparisonReport({ repository, loadCatalog: loadCatalog as never, reportId: "report", now: new Date("2026-08-29T10:00:00Z") })).resolves.toEqual({ status: "SUCCEEDED", jobId: "job" });
    expect(repository.complete).toHaveBeenCalledWith(expect.objectContaining({ reportId: "report", document: expect.objectContaining({ schemaVersion: "paid-comparison-report/v1", needsSummary: job.approvedNeeds }) }));
    expect(repository.fail).not.toHaveBeenCalled();
  });

  it("requeues a bounded failure without publishing a partial document", async () => {
    const repository: PaidComparisonReportJobRepository = { claim: vi.fn().mockResolvedValue(job), complete: vi.fn(), fail: vi.fn() };
    const loadCatalog = vi.fn().mockResolvedValue({ status: "UNAVAILABLE" });
    await expect(processOnePaidComparisonReport({ repository, loadCatalog: loadCatalog as never, now: new Date("2026-08-29T10:00:00Z") })).resolves.toEqual({ status: "RETRY_SCHEDULED", jobId: "job" });
    expect(repository.complete).not.toHaveBeenCalled();
    expect(repository.fail).toHaveBeenCalledWith("job", "PINNED_CATALOG_UNAVAILABLE", new Date("2026-08-29T10:00:00Z"));
  });
});
