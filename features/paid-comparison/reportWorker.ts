import { randomUUID } from "node:crypto";
import { createProductionCatalogReleaseRepository } from "@/features/decision/v2/catalog/fileSystemRepository.server";
import { loadPinnedCatalogSnapshot } from "@/features/decision/v2/catalog/snapshot";
import { getPostgresDatabase } from "@/lib/server/postgres";
import { buildPaidComparisonReportDraft } from "./reportDraft";
import { PostgresPaidComparisonReportJobRepository, type PaidComparisonReportJobRepository } from "./reportJobRepository";

export async function processOnePaidComparisonReport(input: {
  readonly repository?: PaidComparisonReportJobRepository;
  readonly now?: Date;
  readonly reportId?: string;
  readonly loadCatalog?: typeof loadPinnedCatalogSnapshot;
} = {}) {
  const repository = input.repository ?? new PostgresPaidComparisonReportJobRepository(getPostgresDatabase());
  const now = input.now ?? new Date();
  const job = await repository.claim(now);
  if (!job) return { status: "IDLE" as const };
  try {
    const loaded = await (input.loadCatalog ?? loadPinnedCatalogSnapshot)({
      repository: createProductionCatalogReleaseRepository(process.cwd()),
      releaseVersion: job.catalogReleaseVersion,
      catalogFingerprint: job.catalogFingerprint,
      now,
    });
    if (loaded.status !== "READY") throw new TypeError("PINNED_CATALOG_UNAVAILABLE");
    const variants = job.exactVariantIds.map((id) => loaded.snapshot.variantById.get(id));
    if (variants.some((variant) => !variant)) throw new TypeError("PINNED_VARIANT_UNAVAILABLE");
    const [decision, alternativeOne, alternativeTwo] = variants;
    if (!decision || !alternativeOne || !alternativeTwo) throw new TypeError("PINNED_VARIANT_UNAVAILABLE");
    const document = buildPaidComparisonReportDraft({
      catalogReleaseVersion: job.catalogReleaseVersion,
      catalogFingerprint: job.catalogFingerprint,
      approvedNeeds: job.approvedNeeds,
      generatedAt: now.toISOString(),
      variants: [decision, alternativeOne, alternativeTwo],
    });
    await repository.complete({ job, reportId: input.reportId ?? randomUUID(), document, generatedAt: now });
    return { status: "SUCCEEDED" as const, jobId: job.jobId };
  } catch (error) {
    const failureCode = error instanceof TypeError ? error.message : "REPORT_GENERATION_FAILED";
    await repository.fail(job.jobId, failureCode, now);
    return { status: "RETRY_SCHEDULED" as const, jobId: job.jobId };
  }
}
