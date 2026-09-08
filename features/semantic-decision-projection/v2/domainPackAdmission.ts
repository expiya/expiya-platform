import { immutableDigest } from "./canonical";
import type { CatalogFactoryReadinessV2Report } from "./catalogFactoryReadiness";
import type { SemanticDecisionProjectionV2 } from "./contract";
import { validateSemanticDecisionProjection } from "./invariants";

export const DOMAIN_PACK_P_MATERIALITY_ADMISSION_V1 = "DomainPackPMaterialityAdmission/v1" as const;

export interface ActiveCatalogInventoryEntry {
  readonly departmentId: string;
  readonly categoryId: string;
  readonly authorityBinding: string;
  readonly exactOfferingIds: readonly string[];
}

export interface DomainPackPMaterialityCandidate {
  readonly schemaVersion: typeof DOMAIN_PACK_P_MATERIALITY_ADMISSION_V1;
  readonly domainPackId: string;
  readonly departmentId: string;
  readonly categoryId: string;
  readonly exactOfferingIds: readonly string[];
  readonly projections: readonly SemanticDecisionProjectionV2[];
  readonly readiness: CatalogFactoryReadinessV2Report;
  readonly authority: {
    readonly information: string;
    readonly p: string;
    readonly y: string | null;
  };
  readonly activation: {
    readonly mode: "INACTIVE_CANDIDATE" | "SHADOW" | "ACTIVE_P";
    readonly atomicWaveId: string;
    readonly approvalDigest: `sha256:${string}` | null;
  };
}

export interface DomainPackAdmissionResult {
  readonly eligible: boolean;
  readonly reasonCodes: readonly string[];
  readonly inventoryDigest: `sha256:${string}`;
  readonly projectionDigest: `sha256:${string}`;
}

export function validateDomainPackPMaterialityAdmission(input: {
  readonly inventory: ActiveCatalogInventoryEntry;
  readonly candidate: DomainPackPMaterialityCandidate;
}): DomainPackAdmissionResult {
  const reasons: string[] = [];
  const inventoryIds = [...new Set(input.inventory.exactOfferingIds)].sort();
  const candidateIds = [...new Set(input.candidate.exactOfferingIds)].sort();
  if (input.candidate.schemaVersion !== DOMAIN_PACK_P_MATERIALITY_ADMISSION_V1) reasons.push("SCHEMA_VERSION_MISMATCH");
  if (input.inventory.departmentId !== input.candidate.departmentId || input.inventory.categoryId !== input.candidate.categoryId) reasons.push("REGISTRY_SCOPE_MISMATCH");
  if (JSON.stringify(inventoryIds) !== JSON.stringify(candidateIds)) reasons.push("EXACT_MEMBERSHIP_MISMATCH");
  if (!inventoryIds.length) reasons.push("EMPTY_ACTIVE_CATALOG");
  const projectedIds = [...new Set(input.candidate.projections.flatMap((projection) => projection.offerings.map((offering) => offering.exactOfferingId)))].sort();
  if (JSON.stringify(projectedIds) !== JSON.stringify(inventoryIds)) reasons.push("EXACT_PROJECTION_COVERAGE_INCOMPLETE");
  if (input.candidate.projections.some((projection) => projection.identity.categoryId !== input.inventory.categoryId)) reasons.push("PROJECTION_CATEGORY_MISMATCH");
  if (input.candidate.projections.flatMap(validateSemanticDecisionProjection).length) reasons.push("PROJECTION_INVARIANTS_FAILED");
  if (!input.candidate.readiness.levels.INFORMATION_READY.ready) reasons.push("INFORMATION_NOT_READY");
  if (!input.candidate.readiness.levels.P_READY.ready) reasons.push("P_NOT_READY");
  if (input.candidate.activation.mode === "ACTIVE_P" && !input.candidate.activation.approvalDigest) reasons.push("ACTIVE_WITHOUT_DIGEST_BOUND_APPROVAL");
  if (input.candidate.authority.y !== null || input.candidate.readiness.levels.Y_READY.ready) reasons.push("Y_AUTHORITY_NOT_ADMITTED_BY_P_GATE");
  return Object.freeze({
    eligible: reasons.length === 0,
    reasonCodes: Object.freeze([...new Set(reasons)].sort()),
    inventoryDigest: immutableDigest({ ...input.inventory, exactOfferingIds: inventoryIds }),
    projectionDigest: immutableDigest(input.candidate.projections),
  });
}

export function classifyQuestionAdmission(projection: SemanticDecisionProjectionV2): "ASKABLE" | "SUPPRESSED" {
  if (validateSemanticDecisionProjection(projection).length) return "SUPPRESSED";
  const ids = new Set(projection.offerings.map((offering) => offering.exactOfferingId));
  const states = new Map<string, { known: boolean; partition: string | null }>();
  for (const effects of Object.values(projection.materialQuestion.candidateEffectByAnswer)) {
    for (const effect of effects) if (ids.has(effect.exactOfferingId) && !states.has(effect.exactOfferingId)) states.set(effect.exactOfferingId, { known: effect.uncertainty === "KNOWN", partition: effect.partition });
  }
  const known = [...states.values()].filter((state) => state.known);
  const partitions = new Set(known.map((state) => state.partition).filter((value): value is string => value !== null));
  const hasEffect = Object.values(projection.materialQuestion.candidateEffectByAnswer).some((effects) => effects.some((effect) => effect.uncertainty === "KNOWN" && (effect.effect === "knownExclude" || effect.effect === "softOnly")));
  return partitions.size >= 2 && known.length >= states.size - known.length && hasEffect ? "ASKABLE" : "SUPPRESSED";
}
