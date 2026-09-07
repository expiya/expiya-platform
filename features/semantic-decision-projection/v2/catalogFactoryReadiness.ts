export const CATALOG_FACTORY_READINESS_V2 = "CatalogFactoryReadiness/v2" as const;

export const CATALOG_FACTORY_GATE_IDS = [
  "identity-exact",
  "primary-evidence-applicability",
  "decision-field-coverage",
  "semantic-causal-lineage",
  "exact-projection-materialization",
  "candidate-effect-completeness",
  "P-zero-effect-suppression",
  "unknown-conflict-neutrality",
  "no-false-single-winner",
  "price-commerce-isolation",
  "persona-or-neutral",
  "public-language",
  "runtime-fixtures",
  "pointer-manifest-approval-consistency",
  "owner-approval",
] as const;

export type CatalogFactoryGateId = (typeof CATALOG_FACTORY_GATE_IDS)[number];
export type ReadinessLevel = "INFORMATION_READY" | "P_READY" | "Y_READY";
export type GateEvidenceKind = "EXECUTABLE_TEST" | "IMMUTABLE_ARTIFACT" | "SIGNED_APPROVAL" | "DECLARATIVE_RECORD";

export interface CatalogFactoryGateEvidence {
  readonly gateId: CatalogFactoryGateId;
  readonly status: "PASS" | "FAIL" | "PENDING";
  readonly evidenceKind: GateEvidenceKind;
  readonly evidenceRefs: readonly string[];
  readonly reason: string;
}
export interface CatalogFactoryReadinessV2Report {
  readonly schemaVersion: typeof CATALOG_FACTORY_READINESS_V2;
  readonly subjectId: string;
  readonly evaluationScope: "PRODUCTION_EXACT_CATALOG" | "SYNTHETIC_CONTRACT_FIXTURES";
  readonly evaluatedGates: readonly (CatalogFactoryGateEvidence & {
    readonly effectiveStatus: "PASS" | "FAIL" | "PENDING";
    readonly requiredFor: readonly ReadinessLevel[];
  })[];
  readonly levels: Readonly<Record<ReadinessLevel, {
    readonly ready: boolean;
    readonly blockingGateIds: readonly CatalogFactoryGateId[];
  }>>;
  readonly declarativeCapabilityRecordsObserved: number;
  readonly declarativeCapabilityRecordsAcceptedAsExecutableEvidence: false;
}

const informationGates = new Set<CatalogFactoryGateId>([
  "identity-exact",
  "primary-evidence-applicability",
  "decision-field-coverage",
  "public-language",
]);

const pGates = new Set<CatalogFactoryGateId>([
  ...informationGates,
  "semantic-causal-lineage",
  "exact-projection-materialization",
  "candidate-effect-completeness",
  "P-zero-effect-suppression",
  "unknown-conflict-neutrality",
  "price-commerce-isolation",
  "persona-or-neutral",
  "runtime-fixtures",
]);

const yGates = new Set<CatalogFactoryGateId>([
  ...pGates,
  "no-false-single-winner",
  "pointer-manifest-approval-consistency",
  "owner-approval",
]);

const gatesByLevel: Readonly<Record<ReadinessLevel, ReadonlySet<CatalogFactoryGateId>>> = Object.freeze({
  INFORMATION_READY: informationGates,
  P_READY: pGates,
  Y_READY: yGates,
});

function evidenceCanPass(evidence: CatalogFactoryGateEvidence): boolean {
  if (evidence.evidenceKind === "DECLARATIVE_RECORD") return false;
  if (evidence.gateId === "owner-approval") return evidence.evidenceKind === "SIGNED_APPROVAL";
  return evidence.evidenceKind === "EXECUTABLE_TEST" || evidence.evidenceKind === "IMMUTABLE_ARTIFACT" || evidence.evidenceKind === "SIGNED_APPROVAL";
}

export function evaluateCatalogFactoryReadinessV2(input: {
  readonly subjectId: string;
  readonly evaluationScope: CatalogFactoryReadinessV2Report["evaluationScope"];
  readonly gates: readonly CatalogFactoryGateEvidence[];
  readonly declarativeCapabilityRecordsObserved?: number;
}): CatalogFactoryReadinessV2Report {
  const provided = new Map(input.gates.map((gate) => [gate.gateId, gate]));
  const evaluatedGates = CATALOG_FACTORY_GATE_IDS.map((gateId) => {
    const evidence = provided.get(gateId) ?? { gateId, status: "PENDING" as const, evidenceKind: "DECLARATIVE_RECORD" as const, evidenceRefs: Object.freeze([]), reason: "NO_EXECUTABLE_ACCEPTANCE_EVIDENCE" };
    const effectiveStatus = evidence.status === "PASS" && !evidenceCanPass(evidence) ? "FAIL" as const : evidence.status;
    const requiredFor = (["INFORMATION_READY", "P_READY", "Y_READY"] as const).filter((level) => gatesByLevel[level].has(gateId));
    return Object.freeze({ ...evidence, effectiveStatus, requiredFor: Object.freeze(requiredFor) });
  });
  const levels = Object.fromEntries((["INFORMATION_READY", "P_READY", "Y_READY"] as const).map((level) => {
    const blockingGateIds = evaluatedGates.filter((gate) => gatesByLevel[level].has(gate.gateId) && gate.effectiveStatus !== "PASS").map((gate) => gate.gateId);
    return [level, Object.freeze({ ready: blockingGateIds.length === 0, blockingGateIds: Object.freeze(blockingGateIds) })];
  })) as CatalogFactoryReadinessV2Report["levels"];
  return Object.freeze({
    schemaVersion: CATALOG_FACTORY_READINESS_V2,
    subjectId: input.subjectId,
    evaluationScope: input.evaluationScope,
    evaluatedGates: Object.freeze(evaluatedGates),
    levels: Object.freeze(levels),
    declarativeCapabilityRecordsObserved: input.declarativeCapabilityRecordsObserved ?? 0,
    declarativeCapabilityRecordsAcceptedAsExecutableEvidence: false,
  });
}
