import { canonicalDigest } from "./canonical";
import { FACTORY_STAGES, type FactoryCheckpoint, type FactoryInput, type FactoryOutput, type ReadinessGate } from "./contracts";

export interface CheckpointStore { load(inputDigest: string): Promise<FactoryCheckpoint | undefined>; save(checkpoint: FactoryCheckpoint): Promise<void> }
export interface FactoryRunOptions { readonly concurrency?: number; readonly now?: string; readonly rebuildCategories?: readonly string[]; readonly checkpointStore?: CheckpointStore }
const byId = <T extends { readonly observationId: string }>(rows: readonly T[]) => new Map(rows.map(row => [row.observationId, row]));
const categoryKey = (departmentId: string, categoryId: string) => `${departmentId}/${categoryId}`;
const gate = (name: ReadinessGate["gate"], ok: boolean, reason: string): ReadinessGate => ({ gate: name, status: ok ? "PASS" : "FAIL", reason });

export async function mapBounded<T, R>(items: readonly T[], concurrency: number, work: (item: T) => Promise<R>): Promise<readonly R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) throw new TypeError("CONCURRENCY_MUST_BE_POSITIVE_INTEGER");
  const results = new Array<R>(items.length); let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, async () => { while (cursor < items.length) { const index = cursor++; results[index] = await work(items[index]); } }));
  return results;
}

export async function runCatalogFactory(input: FactoryInput, options: FactoryRunOptions = {}): Promise<FactoryOutput> {
  if (input.ingestion.status !== "READY" || input.ingestion.manifest.productionEligibilityGranted || input.ingestion.manifest.activePointersChanged) throw new Error("GOVERNED_INGESTION_FOUNDATION_REQUIRED");
  const now = options.now ?? new Date().toISOString();
  const ordered = {
    ...input,
    taxonomy: [...input.taxonomy].sort((a, b) => categoryKey(a.departmentId, a.categoryId).localeCompare(categoryKey(b.departmentId, b.categoryId))),
    observations: [...input.observations].sort((a, b) => a.observationId.localeCompare(b.observationId)), identities: [...input.identities].sort((a, b) => a.observationId.localeCompare(b.observationId)),
    evidence: [...input.evidence].sort((a, b) => `${a.exactProductId}/${a.factKey}`.localeCompare(`${b.exactProductId}/${b.factKey}`)), semantics: [...input.semantics].sort((a, b) => a.exactProductId.localeCompare(b.exactProductId)),
    personas: [...input.personas].sort((a, b) => a.exactProductId.localeCompare(b.exactProductId)), commerceMedia: [...input.commerceMedia].sort((a, b) => a.exactProductId.localeCompare(b.exactProductId)),
  };
  const inputDigest = canonicalDigest(ordered); const observations = byId(ordered.observations); const identity = byId(ordered.identities);
  if (identity.size !== observations.size || [...observations.keys()].some(id => !identity.has(id))) throw new Error("EVERY_OBSERVATION_REQUIRES_ONE_TERMINAL_RECONCILIATION");
  if (ordered.identities.some(row => row.outcome === "EXACT" ? !row.exactProductId : Boolean(row.exactProductId))) throw new Error("IDENTITY_TERMINAL_STATE_INVALID");
  if (ordered.personas.some(row => row.aggregateSoftScore < 0 || row.aggregateSoftScore > 0.75 || row.authority === "SOFT_RANKING_ONLY" && row.evidenceClasses.length === 0)) throw new Error("PERSONA_AUTHORITY_OR_CAP_INVALID");
  const exactIds = new Set(ordered.identities.flatMap(row => row.outcome === "EXACT" && row.exactProductId ? [row.exactProductId] : []));
  if (input.ingestion.candidates.filter(row => row.gate === "DECISION_READY").length < exactIds.size) throw new Error("INGESTION_DECISION_READY_COVERAGE_INSUFFICIENT");
  if (ordered.evidence.some(row => !exactIds.has(row.exactProductId) || row.authority === "PRIMARY" && row.evidenceClasses.includes("AMAZON_TR_COMMERCE"))) throw new Error("EVIDENCE_AUTHORITY_INVALID");
  if (ordered.commerceMedia.some(row => row.technicalEvidenceDigest !== null)) throw new Error("COMMERCE_MEDIA_MUST_REMAIN_VOLATILE_AND_SEPARATE");
  const selected = new Set(options.rebuildCategories ?? ordered.taxonomy.map(row => categoryKey(row.departmentId, row.categoryId)));
  const categoryDigests = Object.fromEntries(ordered.taxonomy.map(category => { const key = categoryKey(category.departmentId, category.categoryId); const observationIds = ordered.observations.filter(row => categoryKey(row.departmentId, row.categoryId) === key).map(row => row.observationId); const productIds = ordered.identities.filter(row => observationIds.includes(row.observationId)).flatMap(row => row.exactProductId ? [row.exactProductId] : []); return [key, canonicalDigest({ category, observations: ordered.observations.filter(row => observationIds.includes(row.observationId)), identities: ordered.identities.filter(row => observationIds.includes(row.observationId)), evidence: ordered.evidence.filter(row => productIds.includes(row.exactProductId)), semantics: ordered.semantics.filter(row => productIds.includes(row.exactProductId)), personas: ordered.personas.filter(row => productIds.includes(row.exactProductId)), commerceMedia: ordered.commerceMedia.filter(row => productIds.includes(row.exactProductId)) })]; }));
  const prior = await options.checkpointStore?.load(inputDigest); const completed = [...new Set([...(prior?.completedStages ?? []), ...FACTORY_STAGES])];
  const coverage = Object.fromEntries(ordered.taxonomy.map(category => { const key = categoryKey(category.departmentId, category.categoryId); const ids = ordered.observations.filter(row => categoryKey(row.departmentId, row.categoryId) === key).map(row => row.observationId); const products = new Set(ordered.identities.filter(row => ids.includes(row.observationId)).flatMap(row => row.exactProductId ? [row.exactProductId] : [])); return [key, { observations: ids.length, reconciled: ordered.identities.filter(row => ids.includes(row.observationId)).length, exactProducts: products.size, evidenceProducts: new Set(ordered.evidence.filter(row => products.has(row.exactProductId)).map(row => row.exactProductId)).size, semanticProducts: ordered.semantics.filter(row => products.has(row.exactProductId)).length, personaOrNeutralProducts: ordered.personas.filter(row => products.has(row.exactProductId)).length }]; }));
  const everyProduct = (count: (id: string) => boolean) => [...exactIds].every(count);
  const gates: ReadinessGate[] = [gate("catalog", ordered.taxonomy.length > 0, "taxonomy intake exists"), gate("identity", identity.size === observations.size, "all observations terminal"), gate("evidence", everyProduct(id => ordered.evidence.some(row => row.exactProductId === id && row.authority === "PRIMARY")), "each exact product has primary evidence"), gate("semantics", everyProduct(id => ordered.semantics.some(row => row.exactProductId === id)), "supported or neutral semantics present"), gate("persona-or-neutral", everyProduct(id => ordered.personas.some(row => row.exactProductId === id)), "bounded Persona or neutral projection present"), gate("XPY", true, "candidate declares X/P/Y and Stage gates"), gate("Secretary", true, "identity routing is manifest-only pending approval"), gate("presentation", true, "universal-card consumer declared"), gate("persistence", true, "checkpoint and canonical category digests generated"), gate("commerce-incomplete-allowed", true, "volatile commerce is optional and separate"), { gate: "owner-approval", status: "PENDING", reason: "candidate cannot self-activate" }];
  const checkpoint: FactoryCheckpoint = { inputDigest, completedStages: completed as FactoryCheckpoint["completedStages"], categoryDigests, updatedAt: now }; await options.checkpointStore?.save(checkpoint);
  const domainPackCandidates = ordered.taxonomy.filter(row => selected.has(categoryKey(row.departmentId, row.categoryId))).map(row => ({ status: "CANDIDATE_NOT_ACTIVE" as const, departmentId: row.departmentId, categories: [row.categoryId], xpy: { X: "PROPOSAL_ONLY" as const, P: "DOMAIN_QUESTIONS" as const, Y: "AUTHORIZED_DECISION_REQUIRED" as const }, stageGates: gates.map(item => item.gate), personaSelectionAuthority: "NONE" as const }));
  const base = { schemaVersion: "catalog-factory-output/v0.1" as const, inputDigest, stages: FACTORY_STAGES, coverage, gates, domainPackCandidates, integrationManifest: { status: "PENDING_OWNER_APPROVAL" as const, consumers: ["EXPİYA_NEDİR", "SECRETARY_IDENTITY_ROUTING", "UNIVERSAL_CARDS"] as const, registryMutation: "FORBIDDEN" as const, categoryDigests }, activationPlan: { immutable: true as const, status: "PLANNED_NOT_AUTHORIZED" as const, ownerApprovalRequired: true as const, activePointerWrite: false as const, databaseMigration: false as const, deployment: false as const }, checkpoint };
  return { ...base, digest: canonicalDigest(base) };
}
