import { randomUUID } from "node:crypto";

import { createProductionCatalogReleaseRepository } from "@/features/decision/v2/catalog/fileSystemRepository.server";
import { loadActiveCatalogSnapshot } from "@/features/decision/v2/catalog/snapshot";
import { openPhase2Experience } from "@/features/sales-advisor/handoff.server";
import { getPostgresDatabase } from "@/lib/server/postgres";
import { createPaidComparisonQuote } from "./createQuote";
import { listPaidComparisonAlternatives } from "./eligibility";
import { DevelopmentPaidComparisonQuoteRepository, PostgresPaidComparisonQuoteRepository, type PaidComparisonQuoteRepository } from "./repository";
import { resolveVehicleImage } from "@/features/vehicle-data/resolveVehicleImage";
import type { CatalogVariantSnapshot } from "@/features/decision/v2/catalog/types";
import { isDevPaidComparisonHandoff, openDevPaidComparisonHandoff } from "./devFixture.server";
import { isPaidRecomparisonHandoff, PostgresPaidRecomparisonHandoffRepository } from "./recomparisonHandoff.server";

function publicVehicle(variant: CatalogVariantSnapshot) {
  const image = resolveVehicleImage({ variantId: variant.id, brand: variant.brand, model: variant.model, bodyStyle: variant.decisionFacts.bodyStyle.value, modelYear: variant.decisionFacts.modelYear.value });
  return {
    exactVariantId: variant.id,
    brand: variant.brand,
    model: variant.model,
    trim: variant.trim,
    bodyStyle: variant.decisionFacts.bodyStyle.value,
    fuelType: variant.decisionFacts.powertrain.fuelType.value,
    amountTry: variant.activeNewPrice!.amountTry,
    priceValidFrom: variant.activeNewPrice!.validFrom,
    imageUrl: image.path,
    imageAlt: `${variant.brand} ${variant.model} ${variant.trim} araç görseli`,
    imageStatus: image.status,
  };
}

async function authorizedContext(handoff: string, now: Date) {
  const opened = isDevPaidComparisonHandoff(handoff) ? openDevPaidComparisonHandoff(handoff, now) : isPaidRecomparisonHandoff(handoff) ? await new PostgresPaidRecomparisonHandoffRepository(getPostgresDatabase()).open(handoff, now) : await openPhase2Experience(handoff, now);
  const loaded = await loadActiveCatalogSnapshot({
    repository: createProductionCatalogReleaseRepository(process.cwd()),
    now,
  });
  if (loaded.status !== "READY") throw new TypeError("PAID_COMPARISON_CATALOG_UNAVAILABLE");
  if (loaded.snapshot.authority.releaseVersion !== opened.handoff.catalogRelease
    || loaded.snapshot.authority.catalogFingerprint !== opened.handoff.catalogFingerprint) {
    throw new TypeError("PAID_COMPARISON_CATALOG_STALE");
  }
  return { opened, catalog: loaded.snapshot };
}

export async function getPaidComparisonOptions(handoff: string, now = new Date()) {
  const { opened, catalog } = await authorizedContext(handoff, now);
  const eligibleAlternatives = listPaidComparisonAlternatives({
    decisionVariantId: opened.handoff.selectedExactVariantId,
    variants: catalog.variants,
  });
  const alternatives = isDevPaidComparisonHandoff(handoff)
    ? eligibleAlternatives.filter((variant) => resolveVehicleImage({ variantId: variant.id, brand: variant.brand, model: variant.model, bodyStyle: variant.decisionFacts.bodyStyle.value, modelYear: variant.decisionFacts.modelYear.value }).status !== "PLACEHOLDER")
    : eligibleAlternatives;
  return {
    conversationId: opened.handoff.conversationId,
    decisionId: opened.handoff.offerId,
    decisionVariantId: opened.handoff.selectedExactVariantId,
    decision: (() => {
      const variant = catalog.variantById.get(opened.handoff.selectedExactVariantId)!;
      return publicVehicle(variant);
    })(),
    comparisonClass: catalog.variantById.get(opened.handoff.selectedExactVariantId)!.decisionFacts.bodyStyle.value,
    catalogReleaseVersion: catalog.authority.releaseVersion,
    catalogFingerprint: catalog.authority.catalogFingerprint,
    alternatives: alternatives.map(publicVehicle),
  };
}

export async function createAndPersistPaidComparisonQuote(input: {
  readonly handoff: string;
  readonly alternativeVariantIds: readonly [string, string];
  readonly now?: Date;
  readonly quoteId?: string;
  readonly repository?: PaidComparisonQuoteRepository;
}) {
  const now = input.now ?? new Date();
  const { opened, catalog } = await authorizedContext(input.handoff, now);
  const quote = createPaidComparisonQuote({
    quoteId: input.quoteId ?? randomUUID(),
    conversationId: opened.handoff.conversationId,
    decisionId: opened.handoff.offerId,
    approvedNeeds: opened.handoff.approvedNeeds,
    decisionVariantId: opened.handoff.selectedExactVariantId,
    alternativeVariantIds: input.alternativeVariantIds,
    variants: catalog.variants,
    catalogReleaseVersion: catalog.authority.releaseVersion,
    catalogFingerprint: catalog.authority.catalogFingerprint,
    now,
  });
  const repository = input.repository ?? (isDevPaidComparisonHandoff(input.handoff)
    ? new DevelopmentPaidComparisonQuoteRepository()
    : new PostgresPaidComparisonQuoteRepository(getPostgresDatabase()));
  await repository.createQuote(quote);
  return quote;
}
