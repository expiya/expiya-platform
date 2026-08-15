import catalogPayload from "@/data/production/catalog/releases/v0.2.0/catalog.json";
import artifactPayload from "@/data/runtime/vehicle-evidence/v0.3.0/artifact.json";
import type { PublishedCatalog } from "@/features/vehicle-data/buildPublishedCatalog";
import type { PriceObservation } from "@/types/productionVehicle";
import type {
  CarsCandidatePriceEvaluation,
  CarsCampaignApplicability,
  CarsNoAffordableMatchStatus,
  CarsPriceValidityStatus,
} from "@/types/carsConversation";

const publishedRecords = catalogPayload.records as unknown as PublishedCatalog["records"];

export interface CarsPriceAuthorityInput {
  readonly runtimeVehicleCandidateId: string;
  readonly vehicleVariantId?: string;
  readonly budgetTry?: number;
  readonly at?: Date;
  readonly observations?: readonly PriceObservation[];
}

export interface CarsHardBudgetFilterInput {
  readonly eligibleCandidateIds: readonly string[];
  readonly candidateVariantIds: Readonly<Record<string, string>>;
  readonly budgetTry: number;
  readonly at?: Date;
  readonly observationsByVariantId?: Readonly<Record<string, readonly PriceObservation[]>>;
}

export interface CarsHardBudgetFilterResult {
  readonly evaluations: readonly CarsCandidatePriceEvaluation[];
  readonly passingCandidateIds: readonly string[];
  readonly failedCandidateIds: readonly string[];
  readonly unknownCandidateIds: readonly string[];
  readonly noAffordableMatchStatus?: CarsNoAffordableMatchStatus;
  readonly nearestCandidateId?: string;
  readonly nearestGapTry?: number;
  readonly nearestGapPercent?: number;
}

function catalogRecord(variantId: string) {
  return publishedRecords.find((record) => record.variant.id === variantId);
}

function mappingFor(candidateId: string) {
  return artifactPayload.candidates.find((item) => item.runtimeVehicleCandidateId === candidateId);
}

function isExactMapping(candidateId: string, variantId: string): boolean {
  const mapping = mappingFor(candidateId);
  if (!mapping) return false;
  if (mapping.vehicleVariantId !== variantId) return false;
  return mapping.mappingStatus === "VERIFIED_ONE_TO_ONE";
}

function validityStatus(price: PriceObservation | undefined, at: Date): CarsPriceValidityStatus {
  if (!price) return "ABSENT";
  const from = new Date(price.validFrom).getTime();
  const until = price.validUntil ? new Date(price.validUntil).getTime() : Number.POSITIVE_INFINITY;
  const now = at.getTime();
  if (now < from) return "NOT_YET_VALID";
  if (now > until) return "EXPIRED";
  return "CURRENT";
}

function campaignApplicability(price: PriceObservation): CarsCampaignApplicability {
  if (price.priceType !== "CAMPAIGN") return "NOT_CAMPAIGN";
  const limitations = price.provenance.flatMap((item) => item.limitations ?? []).join(" ").toLocaleLowerCase("tr-TR");
  if (/(?:stock-limited|stok|participating-dealer|yetkili satıcı|kampanya|campaign|dealer dependent)/iu.test(limitations)) {
    return "UNKNOWN";
  }
  return "CONDITIONAL";
}

function parsedExcludedFeePercent(price: PriceObservation): number | undefined {
  const limitations = price.provenance.flatMap((item) => item.limitations ?? []);
  for (const limitation of limitations) {
    if (!/(?:excluded|hariç|kayıt|registration charge)/iu.test(limitation)) continue;
    const match = limitation.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (match) return Number(match[1].replace(",", ".")) / 100;
    return undefined;
  }
  return undefined;
}

function mentionsUnquantifiedFee(price: PriceObservation): boolean {
  const limitations = price.provenance.flatMap((item) => item.limitations ?? []);
  return limitations.some((limitation) => (
    /(?:excluded|hariç|kayıt|registration charge|mandatory fee)/iu.test(limitation)
    && !/(\d+(?:[.,]\d+)?)\s*%/.test(limitation)
  ));
}

function sourceAuthoritative(price: PriceObservation): boolean {
  if (price.confidence !== "HIGH") return false;
  if (price.market !== "TR") return false;
  if (price.condition !== "NEW") return false;
  return price.provenance.length > 0;
}

function currentNewObservations(observations: readonly PriceObservation[], at: Date): PriceObservation[] {
  return observations.filter((price) => (
    price.condition === "NEW"
    && price.market === "TR"
    && validityStatus(price, at) === "CURRENT"
  ));
}

function preferGuaranteedPrice(current: readonly PriceObservation[]): PriceObservation | undefined {
  const lists = current.filter((price) => price.priceType === "LIST");
  if (lists.length === 1) return lists[0];
  if (lists.length > 1) return undefined;
  const campaigns = current.filter((price) => price.priceType === "CAMPAIGN");
  if (campaigns.length === 1) return campaigns[0];
  return current[0];
}

export function publishedNewPriceObservations(variantId: string): readonly PriceObservation[] {
  const record = catalogRecord(variantId);
  return record ? [record.activeNewPrice] : [];
}

export function resolveCatalogVariantId(runtimeVehicleCandidateId: string, fallback?: string): string | undefined {
  return mappingFor(runtimeVehicleCandidateId)?.vehicleVariantId ?? fallback;
}

function evaluation(partial: Omit<CarsCandidatePriceEvaluation, "sourceAuthorityResult"> & {
  readonly sourceAuthorityResult?: CarsCandidatePriceEvaluation["sourceAuthorityResult"];
}): CarsCandidatePriceEvaluation {
  return {
    sourceAuthorityResult: partial.sourceAuthorityResult ?? "INSUFFICIENT",
    ...partial,
  };
}

export function evaluateNewVehiclePrice(input: CarsPriceAuthorityInput): CarsCandidatePriceEvaluation {
  const at = input.at ?? new Date();
  const variantId = input.vehicleVariantId ?? resolveCatalogVariantId(input.runtimeVehicleCandidateId);
  const candidateId = input.runtimeVehicleCandidateId;
  if (!variantId || !isExactMapping(candidateId, variantId)) {
    return evaluation({
      candidateId,
      catalogVariantId: variantId ?? "",
      validityStatus: "NOT_EVALUATED",
      campaignApplicabilityResult: "UNKNOWN",
      feeInclusionUncertainty: false,
      budgetCeilingTry: input.budgetTry,
      result: input.budgetTry === undefined ? "NOT_REQUESTED" : "UNKNOWN",
      reasonCode: variantId ? "IDENTITY_NOT_EXACT" : "EXACT_MAPPING_MISSING",
    });
  }

  const record = catalogRecord(variantId);
  if (record && record.variant.lifecycleStatus && record.variant.lifecycleStatus !== "ON_SALE") {
    return evaluation({
      candidateId,
      catalogVariantId: variantId,
      validityStatus: "NOT_EVALUATED",
      campaignApplicabilityResult: "UNKNOWN",
      feeInclusionUncertainty: false,
      budgetCeilingTry: input.budgetTry,
      result: input.budgetTry === undefined ? "NOT_REQUESTED" : "UNKNOWN",
      reasonCode: "NOT_CURRENT_SALE",
    });
  }

  const observations = input.observations ?? publishedNewPriceObservations(variantId);
  const budgetTry = input.budgetTry;
  if (budgetTry === undefined) {
    const current = currentNewObservations(observations, at);
    const selected = preferGuaranteedPrice(current);
    return evaluation({
      candidateId,
      catalogVariantId: variantId,
      priceObservationId: selected?.id,
      amountTry: selected?.amountTry,
      priceType: selected?.priceType,
      validityStatus: selected ? "CURRENT" : observations.length ? validityStatus(observations[0], at) : "ABSENT",
      sourceAuthorityResult: selected && sourceAuthoritative(selected) ? "AUTHORITATIVE" : "INSUFFICIENT",
      campaignApplicabilityResult: selected ? campaignApplicability(selected) : "UNKNOWN",
      feeInclusionUncertainty: selected ? parsedExcludedFeePercent(selected) === undefined && mentionsUnquantifiedFee(selected) : false,
      result: "NOT_REQUESTED",
      reasonCode: "NO_BUDGET",
    });
  }

  if (observations.length === 0) {
    return evaluation({
      candidateId,
      catalogVariantId: variantId,
      validityStatus: "ABSENT",
      campaignApplicabilityResult: "UNKNOWN",
      feeInclusionUncertainty: false,
      budgetCeilingTry: input.budgetTry,
      result: "UNKNOWN",
      reasonCode: "PRICE_ABSENT",
    });
  }

  const usedOrAsking = observations.filter((price) => price.condition !== "NEW" || price.priceType === "ASKING" || price.priceType === "TRANSACTION");
  if (usedOrAsking.length && usedOrAsking.length === observations.length) {
    return evaluation({
      candidateId,
      catalogVariantId: variantId,
      priceObservationId: observations[0]?.id,
      amountTry: observations[0]?.amountTry,
      priceType: observations[0]?.priceType,
      validityStatus: validityStatus(observations[0], at),
      campaignApplicabilityResult: "UNKNOWN",
      feeInclusionUncertainty: false,
      budgetCeilingTry: input.budgetTry,
      result: "UNKNOWN",
      reasonCode: "CONDITION_NOT_NEW",
    });
  }

  const current = currentNewObservations(observations, at);
  if (current.length === 0) {
    return evaluation({
      candidateId,
      catalogVariantId: variantId,
      priceObservationId: observations[0]?.id,
      amountTry: observations[0]?.amountTry,
      priceType: observations[0]?.priceType,
      validityStatus: validityStatus(observations[0], at),
      campaignApplicabilityResult: observations[0] ? campaignApplicability(observations[0]) : "UNKNOWN",
      feeInclusionUncertainty: false,
      budgetCeilingTry: input.budgetTry,
      result: "UNKNOWN",
      reasonCode: "PRICE_STALE_OR_EXPIRED",
    });
  }

  const lists = current.filter((price) => price.priceType === "LIST");
  if (lists.some((price) => price.market !== "TR")) {
    return evaluation({
      candidateId,
      catalogVariantId: variantId,
      validityStatus: "CURRENT",
      campaignApplicabilityResult: "NOT_CAMPAIGN",
      feeInclusionUncertainty: false,
      budgetCeilingTry: input.budgetTry,
      result: "UNKNOWN",
      reasonCode: "MARKET_NOT_TR",
    });
  }
  if (new Set(lists.map((price) => price.amountTry)).size > 1) {
    return evaluation({
      candidateId,
      catalogVariantId: variantId,
      validityStatus: "CURRENT",
      campaignApplicabilityResult: "NOT_CAMPAIGN",
      feeInclusionUncertainty: false,
      budgetCeilingTry: input.budgetTry,
      result: "UNKNOWN",
      reasonCode: "PRICE_CONFLICT",
    });
  }

  const above = current.filter((price) => price.amountTry > budgetTry);
  if (above.length > 0) {
    const selected = preferGuaranteedPrice(above) ?? above[0];
    return evaluation({
      candidateId,
      catalogVariantId: variantId,
      priceObservationId: selected.id,
      amountTry: selected.amountTry,
      priceType: selected.priceType,
      validityStatus: "CURRENT",
      sourceAuthorityResult: sourceAuthoritative(selected) ? "AUTHORITATIVE" : "INSUFFICIENT",
      campaignApplicabilityResult: campaignApplicability(selected),
      feeInclusionUncertainty: false,
      budgetCeilingTry: input.budgetTry,
      result: "FAIL",
      reasonCode: "AMOUNT_ABOVE_CEILING",
    });
  }

  const selected = preferGuaranteedPrice(current);
  if (!selected || !sourceAuthoritative(selected)) {
    return evaluation({
      candidateId,
      catalogVariantId: variantId,
      priceObservationId: selected?.id,
      amountTry: selected?.amountTry,
      priceType: selected?.priceType,
      validityStatus: "CURRENT",
      campaignApplicabilityResult: selected ? campaignApplicability(selected) : "UNKNOWN",
      feeInclusionUncertainty: false,
      budgetCeilingTry: input.budgetTry,
      result: "UNKNOWN",
      reasonCode: "SOURCE_INSUFFICIENT",
    });
  }

  if (selected.priceType === "CAMPAIGN") {
    const applicability = campaignApplicability(selected);
    if (applicability !== "GENERALLY_APPLICABLE") {
      return evaluation({
        candidateId,
        catalogVariantId: variantId,
        priceObservationId: selected.id,
        amountTry: selected.amountTry,
        priceType: selected.priceType,
        validityStatus: "CURRENT",
        sourceAuthorityResult: "AUTHORITATIVE",
        campaignApplicabilityResult: applicability,
        feeInclusionUncertainty: false,
        budgetCeilingTry: input.budgetTry,
        result: "UNKNOWN",
        reasonCode: "CAMPAIGN_ELIGIBILITY_UNKNOWN",
      });
    }
  }

  const feePercent = parsedExcludedFeePercent(selected);
  if (mentionsUnquantifiedFee(selected) && feePercent === undefined) {
    return evaluation({
      candidateId,
      catalogVariantId: variantId,
      priceObservationId: selected.id,
      amountTry: selected.amountTry,
      priceType: selected.priceType,
      validityStatus: "CURRENT",
      sourceAuthorityResult: "AUTHORITATIVE",
      campaignApplicabilityResult: campaignApplicability(selected),
      feeInclusionUncertainty: true,
      budgetCeilingTry: input.budgetTry,
      result: "UNKNOWN",
      reasonCode: "MANDATORY_FEE_UNCERTAINTY",
    });
  }
  const comparable = feePercent ? selected.amountTry * (1 + feePercent) : selected.amountTry;
  if (comparable > budgetTry) {
    return evaluation({
      candidateId,
      catalogVariantId: variantId,
      priceObservationId: selected.id,
      amountTry: selected.amountTry,
      priceType: selected.priceType,
      validityStatus: "CURRENT",
      sourceAuthorityResult: "AUTHORITATIVE",
      campaignApplicabilityResult: campaignApplicability(selected),
      feeInclusionUncertainty: true,
      budgetCeilingTry: input.budgetTry,
      result: "UNKNOWN",
      reasonCode: "MANDATORY_FEE_UNCERTAINTY",
    });
  }

  return evaluation({
    candidateId,
    catalogVariantId: variantId,
    priceObservationId: selected.id,
    amountTry: selected.amountTry,
    priceType: selected.priceType,
    validityStatus: "CURRENT",
    sourceAuthorityResult: "AUTHORITATIVE",
    campaignApplicabilityResult: campaignApplicability(selected),
    feeInclusionUncertainty: false,
    budgetCeilingTry: input.budgetTry,
    result: "PASS",
    reasonCode: "AMOUNT_WITHIN_CEILING",
  });
}

export function filterEligibleCandidatesByHardBudget(input: CarsHardBudgetFilterInput): CarsHardBudgetFilterResult {
  const evaluations = input.eligibleCandidateIds.map((candidateId) => {
    const variantId = input.candidateVariantIds[candidateId] ?? resolveCatalogVariantId(candidateId);
    return evaluateNewVehiclePrice({
      runtimeVehicleCandidateId: candidateId,
      vehicleVariantId: variantId,
      budgetTry: input.budgetTry,
      at: input.at,
      observations: variantId ? input.observationsByVariantId?.[variantId] : undefined,
    });
  });
  const passingCandidateIds = evaluations.filter((item) => item.result === "PASS").map((item) => item.candidateId);
  const failedCandidateIds = evaluations.filter((item) => item.result === "FAIL").map((item) => item.candidateId);
  const unknownCandidateIds = evaluations.filter((item) => item.result === "UNKNOWN").map((item) => item.candidateId);

  if (passingCandidateIds.length > 0) {
    return { evaluations, passingCandidateIds, failedCandidateIds, unknownCandidateIds };
  }

  const nearest = evaluations
    .filter((item) => item.result === "FAIL" && item.amountTry !== undefined && item.budgetCeilingTry !== undefined)
    .map((item) => ({
      candidateId: item.candidateId,
      gapTry: (item.amountTry ?? 0) - (item.budgetCeilingTry ?? 0),
    }))
    .filter((item) => item.gapTry > 0)
    .sort((left, right) => left.gapTry - right.gapTry)[0];

  const unknownOnly = failedCandidateIds.length === 0 && unknownCandidateIds.length > 0;
  const noAffordableMatchStatus: CarsNoAffordableMatchStatus = unknownOnly
    ? "PRICE_UNKNOWN_FOR_TECHNICAL_MATCH"
    : nearest
      ? "NEAREST_OVER_BUDGET_AVAILABLE"
      : "NO_AFFORDABLE_EXACT_MATCH";

  return {
    evaluations,
    passingCandidateIds,
    failedCandidateIds,
    unknownCandidateIds,
    noAffordableMatchStatus,
    nearestCandidateId: nearest?.candidateId,
    nearestGapTry: nearest?.gapTry,
    nearestGapPercent: nearest ? (nearest.gapTry / input.budgetTry) * 100 : undefined,
  };
}

export function formatTryConsumer(amountTry: number): string {
  if (amountTry >= 1_000_000) {
    const millions = amountTry / 1_000_000;
    return `${millions.toLocaleString("tr-TR", { minimumFractionDigits: millions % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })} milyon TL`;
  }
  return `${amountTry.toLocaleString("tr-TR")} TL`;
}

export function formatGapPercentConsumer(gapPercent: number): string {
  const rounded = Math.round(gapPercent * 10) / 10;
  return `%${rounded.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
}

export function priceTypeLabel(priceType: PriceObservation["priceType"] | undefined): string {
  return priceType === "CAMPAIGN" ? "kampanya" : "liste";
}

export function informationalPriceCaveat(evaluation: CarsCandidatePriceEvaluation): string | undefined {
  if (evaluation.priceType === "CAMPAIGN") {
    return "Kampanya stok ve yetkili satıcıya göre değişebilir.";
  }
  return undefined;
}
