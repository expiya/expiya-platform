import type { AppliancesProductType } from "../contracts";
import type { AppliancesDecisionCard } from "../recommendation/publicCard";
import { APPLIANCES_STAGE_ONE_PRESENTATION } from "../presentation/stageOneAdapter";
import { resolveAppliancesCategory } from "../categoryRegistry";
import { APPLIANCES_STAGE_TWO_CONTENT } from "./categoryContent";
import type { AdvisorManualKnowledge, AppliancesStageTwoProjection, ComparisonReportEntitlement, StageTwoProduct } from "./contracts";
import { buildAppliancesSalesActions } from "./salesActions";

const unknown = "Bilinmiyor";
function product(card: AppliancesDecisionCard): StageTwoProduct {
  const publicCard = APPLIANCES_STAGE_ONE_PRESENTATION.project(card);
  return {
    id: publicCard.exactIdentity.id, brand: publicCard.exactIdentity.brand, model: publicCard.exactIdentity.model, configuration: publicCard.exactIdentity.configuration,
    media: { ...(publicCard.media.src ? { src: publicCard.media.src } : {}), alt: publicCard.media.alt, ...(publicCard.media.linkTarget ? { linkTarget: publicCard.media.linkTarget } : {}), ...(publicCard.media.disclosure ? { disclosure: publicCard.media.disclosure } : {}), ...(publicCard.media.cacheMode ? { cacheMode: publicCard.media.cacheMode } : {}) },
    facts: publicCard.technicalFacts.map((fact, index) => ({ label: fact.label, value: fact.value || unknown, ...(fact.explanation ? { dailyMeaning: fact.explanation } : {}), sourceLabel: publicCard.sources[index]?.label ?? publicCard.sources[0]?.label ?? "Kaynak bilgisi bulunmuyor", ...(publicCard.sources[index]?.href ?? publicCard.sources[0]?.href ? { sourceHref: publicCard.sources[index]?.href ?? publicCard.sources[0]?.href } : {}), ...(publicCard.sources[index]?.observedAt ?? publicCard.sources[0]?.observedAt ? { observedAt: publicCard.sources[index]?.observedAt ?? publicCard.sources[0]?.observedAt } : {}) })),
    capabilities: publicCard.capabilities.map(item => item.label), limitations: publicCard.limitations,
    price: publicCard.offers[0] ? { display: `${publicCard.offers[0].amount.toLocaleString("tr-TR")} TL`, note: `${publicCard.offers[0].merchant} · ${new Date(publicCard.offers[0].observedAt).toLocaleDateString("tr-TR")} tarihinde gözlendi` } : { display: unknown, note: publicCard.commerceNotice },
  };
}

export function buildAppliancesStageTwoProjection(input: { readonly productType: AppliancesProductType; readonly selectedCard: AppliancesDecisionCard; readonly authorizedComparisonCards?: readonly AppliancesDecisionCard[]; readonly entitlement: ComparisonReportEntitlement; readonly manualKnowledge?: AdvisorManualKnowledge }): AppliancesStageTwoProjection {
  const selected = product(input.selectedCard);
  if (selected.id !== input.selectedCard.identity.productId) throw new TypeError("STAGE_TWO_IDENTITY_MISMATCH");
  const entitledIds = input.entitlement.status === "PURCHASED" ? new Set(input.entitlement.authorizedExactProductIds) : new Set<string>();
  const cards = input.entitlement.status === "PURCHASED" ? [input.selectedCard, ...(input.authorizedComparisonCards ?? [])].filter((card, index, all) => entitledIds.has(card.identity.productId) && all.findIndex(item => item.identity.productId === card.identity.productId) === index) : [];
  const products = cards.map(product);
  const labels = [...new Set(products.flatMap(item => item.facts.map(fact => fact.label)))];
  const rows = labels.map(label => ({ label, values: products.map(item => { const fact = item.facts.find(candidate => candidate.label === label); return { productId: item.id, value: fact?.value ?? unknown, ...(fact ? { sourceLabel: fact.sourceLabel } : {}) }; }) }));
  return {
    schemaVersion: "appliances-advisor-read-projection/v1", productType: input.productType,
    categoryLabel: resolveAppliancesCategory(input.productType)?.publicLabelTr ?? "Ev ürünü", content: APPLIANCES_STAGE_TWO_CONTENT[input.productType], selected,
    manualKnowledge: input.manualKnowledge ?? { status: "NOT_AVAILABLE", entries: [] },
    authorizedExactProductIds: input.entitlement.status === "PURCHASED" ? [...entitledIds] : [selected.id],
    comparison: { access: input.entitlement.status === "PURCHASED" ? "ENTITLED" : "LOCKED", products, rows },
    comparisonOffer: input.entitlement.status === "PURCHASED" ? { label: "Karşılaştırma raporunu aç", action: "OPEN_REPORT" } : { label: "Erişim koşullarını incele", action: "EXPLAIN_ACCESS" },
    salesActions: buildAppliancesSalesActions({ exactProductId: selected.id, productType: input.productType, commerce: input.selectedCard.currentCommerce }),
    boundaries: { canChangeContext: false, canRerunDecision: false, canAddProducts: false, recommendationAuthority: false, commerceIsTechnicalTruth: false },
  };
}
