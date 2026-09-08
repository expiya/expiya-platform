import "server-only";

import { PostgresComparisonEntitlementRepository } from "@/features/comparison-entitlements/postgresRepository.server";
import { evidenceSetFingerprint } from "@/features/comparison-entitlements/service.server";
import { guardStageTwoAdvisorQuestion } from "@/features/xpy/stageTwo/advisor";
import { XPY_STAGE_TWO_PROTOCOL_VERSION, validateXpyStageTwoEntry, type XpyStageTwoComparisonEntitlement, type XpyStageTwoDomainAdapter, type XpyStageTwoProjection } from "@/features/xpy/stageTwo/contracts";
import { registerXpyStageTwoAdapter } from "@/features/xpy/stageTwo/registry";
import { APPLIANCES_PRODUCT_TYPES, type AppliancesProductType } from "../contracts";
import { loadGovernedManualAuthority, projectAuthorizedL9Knowledge, projectPublicAdvisorManualKnowledge } from "../manuals/authority.server";
import { initializeAppliancesStore } from "../persistence/initialize.server";
import { PostgresAppliancesConversationStore } from "../persistence/postgresStore.server";
import type { AppliancesDecisionCard } from "../recommendation/publicCard";
import { answerAppliancesAdvisor } from "./advisor";
import type { AdvisorManualKnowledge, ComparisonReportEntitlement } from "./contracts";
import { loadAppliancesStageTwoHandoffService, readAppliancesStageTwoHandoff, type AppliancesStageTwoHandoffClaims } from "./handoff.server";
import { buildAppliancesStageTwoProjection } from "./projection";

export const APPLIANCES_STAGE_TWO_READINESS = Object.freeze(APPLIANCES_PRODUCT_TYPES.map(categoryId => Object.freeze({ categoryId, readiness: "AUTHORIZED_EXISTING_RUNTIME" as const, failClosedReason: null })));

export interface AppliancesStageTwoOpened {
  readonly claims: AppliancesStageTwoHandoffClaims;
  readonly productType: AppliancesProductType;
  readonly revision: number;
  readonly catalogRelease: string;
  readonly selectedCard: AppliancesDecisionCard;
  readonly comparisonEntitlement: ComparisonReportEntitlement;
  readonly manualKnowledge: AdvisorManualKnowledge;
  readonly authorizedComparisonCards?: readonly AppliancesDecisionCard[];
}

export async function openAppliancesStageTwo(handoff: string): Promise<AppliancesStageTwoOpened> {
  const service = loadAppliancesStageTwoHandoffService();
  if (!service) throw new TypeError("APPLIANCES_STAGE_TWO_HANDOFF_UNAVAILABLE");
  const database = await initializeAppliancesStore({ DATABASE_URL: process.env.DATABASE_URL, DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX });
  if (database.status !== "READY") throw new TypeError("APPLIANCES_STAGE_TWO_AUTHORITY_UNAVAILABLE");
  const result = await readAppliancesStageTwoHandoff({ store: new PostgresAppliancesConversationStore(database.pool), service, handoff, entitlementRepository: new PostgresComparisonEntitlementRepository(database.pool) });
  if (result.status !== "READY") throw new TypeError(`APPLIANCES_STAGE_TWO_${result.reason}`);
  const manualAuthority = await loadGovernedManualAuthority();
  const l9 = manualAuthority.status === "READY" ? projectAuthorizedL9Knowledge({ release: manualAuthority.authority.release, authorizedProductId: result.selectedCard.identity.productId, categoryId: result.productType, catalogRelease: result.catalogRelease, configurationIdentity: result.selectedCard.identity.configurationIdentity }) : undefined;
  return { ...result, manualKnowledge: projectPublicAdvisorManualKnowledge(l9) };
}

export function toXpyAppliancesEntitlement(entitlement: ComparisonReportEntitlement): XpyStageTwoComparisonEntitlement {
  return entitlement.status === "PURCHASED" ? { ...entitlement, evidenceSetFingerprint: evidenceSetFingerprint(entitlement.authorizedExactProductIds) } : { status: "NOT_PURCHASED" };
}

export function projectAppliancesXpyStageTwo(opened: AppliancesStageTwoOpened, entitlement: XpyStageTwoComparisonEntitlement): XpyStageTwoProjection {
  const legacyEntitlement: ComparisonReportEntitlement = entitlement.status === "PURCHASED" ? { status: "PURCHASED", entitlementId: entitlement.entitlementId, authorizedExactProductIds: entitlement.authorizedExactProductIds } : { status: "NOT_PURCHASED" };
  const domain = buildAppliancesStageTwoProjection({ productType: opened.productType, selectedCard: opened.selectedCard, entitlement: legacyEntitlement, manualKnowledge: opened.manualKnowledge, authorizedComparisonCards: opened.authorizedComparisonCards });
  const selected = domain.selected;
  const authority = { protocolVersion: XPY_STAGE_TWO_PROTOCOL_VERSION, handoffAuthorityVersion: opened.claims.version, departmentId: "APPLIANCES", categoryId: opened.claims.category, conversationId: opened.claims.conversationId, decisionRevision: opened.claims.revision, decisionFingerprint: opened.claims.decisionFingerprint, exactProductId: opened.claims.exactProductId, configurationIdentity: opened.claims.configurationIdentity, evidence: { release: opened.claims.catalogRelease, fingerprint: opened.claims.catalogDigest }, issuedAt: new Date(opened.claims.issuedAt * 1000).toISOString(), expiresAt: new Date(opened.claims.expiresAt * 1000).toISOString(), replayPolicy: opened.claims.replayPolicy };
  const currentCatalogFingerprint = typeof opened.selectedCard.provenance.catalog.digest === "string" ? opened.selectedCard.provenance.catalog.digest : "";
  const current = { departmentId: "APPLIANCES", categoryId: opened.productType, conversationId: opened.claims.conversationId, decisionRevision: opened.revision, decisionFingerprint: opened.claims.decisionFingerprint, exactProductId: opened.selectedCard.identity.productId, configurationIdentity: opened.selectedCard.identity.configurationIdentity, evidence: { release: opened.catalogRelease, fingerprint: currentCatalogFingerprint } };
  if (validateXpyStageTwoEntry(authority, current).status !== "AUTHORIZED") throw new TypeError("APPLIANCES_STAGE_TWO_AUTHORITY_MISMATCH");
  if (entitlement.status === "PURCHASED" && (!entitlement.authorizedExactProductIds.includes(selected.id) || !entitlement.evidenceSetFingerprint)) throw new TypeError("APPLIANCES_COMPARISON_ENTITLEMENT_MISMATCH");
  const mapProduct = (item: typeof selected) => { const source = item.id === opened.selectedCard.identity.productId ? opened.selectedCard : opened.authorizedComparisonCards?.find(card => card.identity.productId === item.id); if (!source) throw new TypeError("APPLIANCES_STAGE_TWO_PRODUCT_BINDING_MISSING"); return { exactProductId: item.id, configurationIdentity: source.identity.configurationIdentity, title: `${item.brand} ${item.model}`, media: item.media.src ? { state: "VERIFIED" as const, src: item.media.src, alt: item.media.alt, disclosure: item.media.disclosure ?? "Yönetilen kategori medya kaydı." } : { state: "UNAVAILABLE" as const, alt: item.media.alt, disclosure: item.media.disclosure ?? "Bu exact ürüne bağlı yayınlanabilir medya bulunmuyor." }, facts: item.facts.map((fact, index) => ({ key: `${index}:${fact.label}`, label: fact.label, value: fact.value, evidenceState: fact.sourceLabel === "Kaynak bilgisi bulunmuyor" ? "UNKNOWN" as const : "VERIFIED" as const, ...(fact.dailyMeaning ? { dailyMeaning: fact.dailyMeaning } : {}), sourceLabel: fact.sourceLabel })), capabilities: item.capabilities, limitations: item.limitations, price: { state: item.price.display === "Bilinmiyor" ? "UNAVAILABLE" as const : "OBSERVED" as const, display: item.price.display, note: item.price.note } }; };
  const products = entitlement.status === "PURCHASED" ? domain.comparison.products.map(mapProduct) : [];
  return { schemaVersion: "xpy-stage2-projection/v1", authority, selected: mapProduct(selected), comparison: { access: entitlement.status === "PURCHASED" ? "ENTITLED" : "LOCKED", offerPlacement: "AFTER_SELECTED_PRODUCT_BEFORE_ADVISOR", products, rows: entitlement.status === "PURCHASED" ? domain.comparison.rows.map((row, index) => ({ key: `${index}:${row.label}`, label: row.label, values: row.values.map(value => ({ exactProductId: value.productId, value: value.value, evidenceState: value.sourceLabel ? "VERIFIED" as const : "UNKNOWN" as const })) })) : [] }, boundaries: { canReopenStageOneSelection: false, canAddUnentitledProducts: false, salesActionsActive: false, stageThreeActive: false } };
}

export function answerAppliancesXpyStageTwo(opened: AppliancesStageTwoOpened, projection: XpyStageTwoProjection, question: string) {
  const guard = guardStageTwoAdvisorQuestion(projection, question);
  if (guard) return guard;
  const domain = buildAppliancesStageTwoProjection({ productType: opened.productType, selectedCard: opened.selectedCard, entitlement: opened.comparisonEntitlement, manualKnowledge: opened.manualKnowledge, authorizedComparisonCards: opened.authorizedComparisonCards });
  return answerAppliancesAdvisor(domain, question);
}

export const APPLIANCES_XPY_STAGE_TWO_ADAPTER: XpyStageTwoDomainAdapter<AppliancesStageTwoOpened> = Object.freeze({ adapterVersion: "appliances-xpy-stage2-adapter/v1", departmentId: "APPLIANCES", categories: APPLIANCES_PRODUCT_TYPES, handoffAuthorityVersions: ["appliances-stage2-handoff/v2"], projectionSchemaVersions: ["appliances-advisor-read-projection/v1"], comparisonRowsOwnedBy: "CATEGORY_DOMAIN_PACK", openSignedHandoff: openAppliancesStageTwo, project: projectAppliancesXpyStageTwo, answer: (projection: XpyStageTwoProjection, question: string) => guardStageTwoAdvisorQuestion(projection, question) ?? { status: "UNKNOWN", message: "Appliances Advisor yanıtı yalnız doğrulanmış Appliances karar bağlamında hazırlanabilir." } });

registerXpyStageTwoAdapter(APPLIANCES_XPY_STAGE_TWO_ADAPTER);
