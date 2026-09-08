import "server-only";

import { evaluateV3Catalog } from "@/features/decision/v3/catalogAdapter.server";
import { buildVariantContentArtifact } from "./artifact.server";
import { answerSalesAdvisor, type AdvisorReply } from "./advisor";
import { openPhase2Experience } from "./handoff.server";
import { SALES_ADVISOR_VERSION, VARIANT_CONTENT_SCHEMA_VERSION, type Phase2HandoffPayload, type PublicVariantFact, type VariantContentArtifact } from "./types";
import { PostgresComparisonEntitlementRepository } from "@/features/comparison-entitlements/postgresRepository.server";
import { evidenceSetFingerprint, resolvePersistedComparisonEntitlement } from "@/features/comparison-entitlements/service.server";
import { getPostgresPool, requirePostgresConnectionString } from "@/lib/server/postgres";
import { guardStageTwoAdvisorQuestion } from "@/features/xpy/stageTwo/advisor";
import { XPY_STAGE_TWO_PROTOCOL_VERSION, validateXpyStageTwoEntry, type StageTwoEvidenceState, type XpyStageTwoComparisonEntitlement, type XpyStageTwoDomainAdapter, type XpyStageTwoProjection } from "@/features/xpy/stageTwo/contracts";
import { registerXpyStageTwoAdapter } from "@/features/xpy/stageTwo/registry";
import type { SalesSemanticInterpretation } from "./semantic.server";

export interface CarsStageTwoOpened {
  readonly handoff: Phase2HandoffPayload;
  readonly artifact: VariantContentArtifact;
  readonly comparisonArtifacts?: readonly VariantContentArtifact[];
}

const configurationIdentity = (artifact: VariantContentArtifact) => `${artifact.identity.brand}|${artifact.identity.model}|${artifact.identity.trim}|${artifact.identity.modelYear}|TR`;
const evidenceState = (fact: PublicVariantFact): StageTwoEvidenceState => fact.disposition === "VERIFIED" ? "VERIFIED" : fact.disposition === "NO_CLAIM" ? "UNKNOWN" : fact.disposition === "REPRESENTATIVE" ? "REPRESENTATIVE" : "SCOPED";
const facts = (artifact: VariantContentArtifact) => [...artifact.facts, ...artifact.equipment].map(fact => ({ key: fact.key, label: fact.label, value: fact.value, evidenceState: evidenceState(fact), ...(fact.dailyMeaning ? { dailyMeaning: fact.dailyMeaning } : {}), ...(fact.scopeNote ? { limitation: fact.scopeNote } : {}), ...(fact.source ? { sourceLabel: fact.source.label } : {}) }));
const product = (artifact: VariantContentArtifact) => ({
  exactProductId: artifact.exactVariantId,
  configurationIdentity: configurationIdentity(artifact),
  title: artifact.title,
  media: artifact.media[0] ? { state: "VERIFIED" as const, src: artifact.media[0].url, alt: artifact.media[0].alt, disclosure: artifact.media[0].attribution ?? "Exact varyanta bağlı doğrulanmış medya." } : { state: "UNAVAILABLE" as const, alt: "", disclosure: "Bu exact varyanta bağlı yayınlanabilir medya bulunmuyor." },
  facts: facts(artifact),
  capabilities: artifact.equipment.filter(item => item.disposition === "VERIFIED").map(item => item.value),
  limitations: [...new Set([...artifact.facts, ...artifact.equipment, ...artifact.colors].flatMap(item => item.scopeNote ? [item.scopeNote] : []))],
  price: { state: artifact.price.status === "VERIFIED" ? "VERIFIED" as const : artifact.price.status === "ESTIMATED" ? "OBSERVED" as const : "UNAVAILABLE" as const, display: artifact.price.display, note: artifact.price.note },
});

const COMPARISON_KEYS = ["price", "power", "seats", "luggage", "consumption"] as const;
function comparisonRows(artifacts: readonly VariantContentArtifact[]) {
  return COMPARISON_KEYS.map(key => ({ key, label: key === "price" ? "Fiyat durumu" : artifacts.flatMap(item => item.facts).find(fact => fact.key === key)?.label ?? key, values: artifacts.map(artifact => {
    if (key === "price") return { exactProductId: artifact.exactVariantId, value: artifact.price.display, evidenceState: artifact.price.status === "VERIFIED" ? "VERIFIED" as const : "UNKNOWN" as const };
    const fact = artifact.facts.find(item => item.key === key);
    return { exactProductId: artifact.exactVariantId, value: fact?.value ?? "Bilinmiyor", evidenceState: fact ? evidenceState(fact) : "UNKNOWN" as const };
  }) }));
}

export function projectCarsStageTwo(opened: CarsStageTwoOpened, entitlement: XpyStageTwoComparisonEntitlement): XpyStageTwoProjection {
  const identity = configurationIdentity(opened.artifact);
  if (opened.artifact.exactVariantId !== opened.handoff.selectedExactVariantId || opened.artifact.catalogRelease !== opened.handoff.catalogRelease || opened.artifact.catalogFingerprint !== opened.handoff.catalogFingerprint) throw new TypeError("CARS_STAGE_TWO_ARTIFACT_BINDING_MISMATCH");
  const authority = { protocolVersion: XPY_STAGE_TWO_PROTOCOL_VERSION, handoffAuthorityVersion: opened.handoff.version, departmentId: "CARS", categoryId: "NEW_CAR", conversationId: opened.handoff.conversationId, decisionRevision: opened.handoff.decisionRevision, decisionFingerprint: opened.handoff.decisionFingerprint, exactProductId: opened.handoff.selectedExactVariantId, configurationIdentity: identity, evidence: { release: opened.handoff.catalogRelease, fingerprint: opened.handoff.catalogFingerprint }, issuedAt: opened.handoff.issuedAt, expiresAt: opened.handoff.expiresAt, replayPolicy: "REVISION_BOUND_REUSABLE_UNTIL_EXPIRY" as const };
  const current = { departmentId: "CARS", categoryId: "NEW_CAR", conversationId: opened.handoff.conversationId, decisionRevision: opened.handoff.decisionRevision, decisionFingerprint: opened.handoff.decisionFingerprint, exactProductId: opened.artifact.exactVariantId, configurationIdentity: identity, evidence: { release: opened.artifact.catalogRelease, fingerprint: opened.artifact.catalogFingerprint } };
  if (validateXpyStageTwoEntry(authority, current).status !== "AUTHORIZED") throw new TypeError("CARS_STAGE_TWO_AUTHORITY_MISMATCH");
  const allowed = entitlement.status === "PURCHASED" ? new Set(entitlement.authorizedExactProductIds) : new Set<string>();
  if (entitlement.status === "PURCHASED" && (!allowed.has(opened.artifact.exactVariantId) || !entitlement.evidenceSetFingerprint)) throw new TypeError("CARS_COMPARISON_ENTITLEMENT_MISMATCH");
  const comparisonArtifacts = entitlement.status === "PURCHASED" ? [opened.artifact, ...(opened.comparisonArtifacts ?? [])].filter((artifact, index, all) => allowed.has(artifact.exactVariantId) && all.findIndex(item => item.exactVariantId === artifact.exactVariantId) === index) : [];
  return { schemaVersion: "xpy-stage2-projection/v1", authority, selected: product(opened.artifact), comparison: { access: entitlement.status === "PURCHASED" ? "ENTITLED" : "LOCKED", offerPlacement: "AFTER_SELECTED_PRODUCT_BEFORE_ADVISOR", products: comparisonArtifacts.map(product), rows: entitlement.status === "PURCHASED" ? comparisonRows(comparisonArtifacts) : [] }, boundaries: { canReopenStageOneSelection: false, canAddUnentitledProducts: false, salesActionsActive: false, stageThreeActive: false } };
}

export async function resolveCarsComparison(opened: Pick<CarsStageTwoOpened, "handoff">): Promise<{ readonly entitlement: XpyStageTwoComparisonEntitlement; readonly comparisonArtifacts: readonly VariantContentArtifact[] }> {
  if (!process.env.DATABASE_URL?.trim()) return { entitlement: { status: "NOT_PURCHASED" }, comparisonArtifacts: [] };
  try {
    const catalog = await evaluateV3Catalog([]);
    const pool = getPostgresPool({ DATABASE_URL: requirePostgresConnectionString({ DATABASE_URL: process.env.DATABASE_URL, DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX }), DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX });
    const resolved = await resolvePersistedComparisonEntitlement({ repository: new PostgresComparisonEntitlementRepository(pool), subject: { type: "SESSION", id: opened.handoff.conversationId }, departmentId: "CARS", category: "NEW_CAR", conversationId: opened.handoff.conversationId, decisionRevision: opened.handoff.decisionRevision, decisionFingerprint: opened.handoff.decisionFingerprint, exactEvidenceIds: catalog.variants.map(item => item.id) });
    if (resolved.status !== "PURCHASED" || !resolved.authorizedExactProductIds.includes(opened.handoff.selectedExactVariantId)) return { entitlement: { status: "NOT_PURCHASED" }, comparisonArtifacts: [] };
    const authorized = new Set(resolved.authorizedExactProductIds);
    return { entitlement: { ...resolved, evidenceSetFingerprint: evidenceSetFingerprint(resolved.authorizedExactProductIds) }, comparisonArtifacts: catalog.variants.filter(item => authorized.has(item.id)).map(variant => buildVariantContentArtifact({ variant, catalogRelease: opened.handoff.catalogRelease, catalogFingerprint: opened.handoff.catalogFingerprint })) };
  } catch { return { entitlement: { status: "NOT_PURCHASED" }, comparisonArtifacts: [] }; }
}

export function answerCarsStageTwo(input: CarsStageTwoOpened & { readonly projection: XpyStageTwoProjection; readonly question: string; readonly semantic?: SalesSemanticInterpretation }): AdvisorReply {
  const guard = guardStageTwoAdvisorQuestion(input.projection, input.question);
  if (guard) return { messages: [guard.message] };
  return answerSalesAdvisor({ question: input.question, artifact: input.artifact, handoff: input.handoff, comparisonArtifacts: input.comparisonArtifacts, ...(input.semantic ? { semantic: input.semantic } : {}) });
}

export const CARS_XPY_STAGE_TWO_ADAPTER: XpyStageTwoDomainAdapter<CarsStageTwoOpened> = Object.freeze({ adapterVersion: "cars-xpy-stage2-adapter/v1", departmentId: "CARS", categories: ["NEW_CAR"], handoffAuthorityVersions: [SALES_ADVISOR_VERSION], projectionSchemaVersions: [VARIANT_CONTENT_SCHEMA_VERSION], comparisonRowsOwnedBy: "CATEGORY_DOMAIN_PACK", openSignedHandoff: openPhase2Experience, project: projectCarsStageTwo, answer: (projection: XpyStageTwoProjection, question: string) => guardStageTwoAdvisorQuestion(projection, question) ?? { status: "UNKNOWN", message: "Cars Advisor yanıtı yalnız doğrulanmış Cars artifact bağlamında hazırlanabilir." } });

registerXpyStageTwoAdapter(CARS_XPY_STAGE_TWO_ADAPTER);
