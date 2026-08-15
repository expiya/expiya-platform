import catalogPayload from "@/data/production/catalog/releases/v0.5.0/catalog.json";
import artifactPayload from "@/data/runtime/vehicle-evidence/v0.4.0/artifact.json";
import { populateDecisionContext } from "@/features/decision/context/population/populateDecisionContext";
import { assessLimitedSupport } from "@/features/decision/context/sufficiency/assessLimitedSupport";
import { candidateComparisonPolicy } from "@/features/decision/context/sufficiency/carsSufficiencyPolicies";
import { evaluateCarsDomainFactRequirement } from "@/features/decision/context/sufficiency/evaluateCarsDomainFactRequirement";
import { orchestrateCarsDecision } from "@/features/decision/orchestration/orchestrateCarsDecision";
import type { ContextCandidate } from "@/types/contextCandidate";
import type { DecisionContext } from "@/types/decisionContext";
import type { CarsDomainFactRequirement, CarsDomainFactRequirementResolutionResult } from "@/types/carsDomainFactRequirement";
import type { CarsDomainEvidenceAssertion } from "@/types/carsDomainEvidence";
import type { RuntimeVehicleCandidateId, VehicleEvidenceFactResolution, VehicleEvidenceReadPort } from "@/types/runtimeVehicleEvidence";
import type { CarsFinalDiscriminatorChoice, CarsFinalDiscriminatorChoiceId } from "@/types/carsConversation";
import { buildCarsRuntimeEvidenceDependencies } from "./buildCarsRuntimeEvidenceDependencies";

const AUTHORITY = Object.freeze({
  artifactVersion: "0.4.0", artifactHash: "1a6ad63598db04076fc3c871dff31acd1da3f3301edff5cf0c3230b8df495bad",
  catalogReleaseVersion: "0.2.0", catalogPayloadHash: "393b548307e9e117415a4c54bf0d3d8c3f734f33518ed5bd5cd37be5158c18ba",
  datasetVersion: "0.5.0", datasetReleaseHash: "435c8a7fbe4f67c8c43665afc314803607e8deb1d7a968fc92506239a06ba7f1",
  mappingVersion: "0.3.0", mappingHash: "468d1728c4aabd94c6faa7a202b2e7ac4ae4c7bda0198f5b74788c8121f5c0ed",
  dictionaryRevision: "vehicle-evidence-0.4.1:data_dictionary.csv+compact-family-closure:1", dictionaryHash: "7aa8579ccd0a118c0bf98075f62ac7e62ee8297f44422125f40be956db676a95",
});

export interface CarsEvidenceBackedRequirement {
  readonly factKey: "seats" | "cargo_volume_l";
  readonly predicate: "AT_LEAST";
  readonly value: number;
  readonly materiality: "HARD_CONSTRAINT";
  readonly sourceText: string;
}

export interface CarsEvidenceBackedRequirementBridgeResult {
  readonly requirements: readonly CarsEvidenceBackedRequirement[];
  readonly materialPreferencesWithoutThreshold: readonly ("seats" | "cargo_volume_l")[];
  readonly partySize?: number;
}

export function deriveCarsEvidenceBackedRequirements(context: DecisionContext): CarsEvidenceBackedRequirementBridgeResult {
  const texts = [context.decisionNeed, ...context.userContext.needs, ...context.userContext.priorities,
    ...context.userContext.preferences, ...context.userContext.constraints, ...context.userContext.usageConditions,
    ...context.evaluationContext.decisionCriteria];
  const requirements = new Map<CarsEvidenceBackedRequirement["factKey"], CarsEvidenceBackedRequirement>();
  let partySize: number | undefined;
  let cargoMaterial = false;
  let seatsMaterial = false;
  for (const sourceText of texts) {
    const normalized = sourceText.toLocaleLowerCase("tr-TR");
    const seatMatches = [...normalized.matchAll(/(?:(?:en az|minimum|at least)\s+(\d{1,2})\s*(?:koltuk|koltuklu|kişilik|seats?)|(?:^|[\s,:;.!?])\s*(\d{1,2})\s*(?:koltuk|koltuklu|seats?)\s*(?:lazım|gerekli|istiyorum|isterim|olsun|yeter|olur|required|needed|is enough))/giu)];
    const cargoMatches = [
      ...normalized.matchAll(/(?:en az|minimum|at least)\s+(?:yaklaşık|around)?\s*(\d{2,4})\s*(?:litre|liter|litres|liters|l)\b(?:[^.\n]*(?:bagaj|boot|cargo))?/giu),
      ...normalized.matchAll(/(?:bagaj|boot|cargo)[^.\n]*?(?:en az|minimum|at least)\s*(?:yaklaşık|around)?\s*(\d{2,4})\s*(?:litre|liter|litres|liters|l)\b/giu),
      ...normalized.matchAll(/(\d{2,4})\s*(?:litre|liter|litres|liters|l)\s*(?:bagaj|boot|cargo)[^.\n]*?(?:istiyorum|isterim|olsun|lazım|gerekli|required|needed)/giu),
    ].sort((left, right) => (left.index ?? 0) - (right.index ?? 0));
    const seats = seatMatches.at(-1);
    const cargo = cargoMatches.at(-1);
    const party = normalized.match(/(?:^|\s)(\d{1,2})\s*(?:kişiyiz|kişilik(?:\s+(?:aileyiz|ail(?:e|eyiz)))?|people|person family)(?:\s|[,.!?]|$)/i);
    if (seats) requirements.set("seats", { factKey: "seats", predicate: "AT_LEAST", value: Number(seats[1] ?? seats[2]), materiality: "HARD_CONSTRAINT", sourceText });
    if (cargo) requirements.set("cargo_volume_l", { factKey: "cargo_volume_l", predicate: "AT_LEAST", value: Number(cargo[1]), materiality: "HARD_CONSTRAINT", sourceText });
    if (party) partySize = Number(party[1]);
    cargoMaterial ||= /(bagaj|boot|cargo)/i.test(normalized) && /(önemli|important|priority|öncelik)/i.test(normalized);
    seatsMaterial ||= /(koltuk|seat)/i.test(normalized) && /(önemli|important|priority|öncelik)/i.test(normalized);
  }
  if (partySize !== undefined && !requirements.has("seats")) {
    requirements.set("seats", { factKey: "seats", predicate: "AT_LEAST", value: partySize, materiality: "HARD_CONSTRAINT", sourceText: `${partySize} kişilik aile` });
  }
  return {
    requirements: [...requirements.values()], partySize,
    materialPreferencesWithoutThreshold: [
      ...(seatsMaterial && !requirements.has("seats") ? ["seats" as const] : []),
      ...(cargoMaterial && !requirements.has("cargo_volume_l") ? ["cargo_volume_l" as const] : []),
    ],
  };
}

export function deriveCarsEvidenceBackedRequirementsFromQuery(query: string): CarsEvidenceBackedRequirementBridgeResult {
  return deriveCarsEvidenceBackedRequirements(contextFromQuery(query).context);
}

function contextFromQuery(query: string): { context: DecisionContext; candidates: readonly ContextCandidate[] } {
  const candidate: ContextCandidate<"decisionNeed"> = {
    id: "cars-evidence-mvp:decision-need", target: "decisionNeed", value: query, provenance: "EXPLICIT_USER",
    source: { kind: "USER_INPUT", referenceId: "cars-evidence-mvp:user-input" },
  };
  const population = populateDecisionContext({ current: null, candidates: [candidate] });
  if (!population.ok) throw new Error("DECISION_CONTEXT_POPULATION_FAILED");
  return { context: population.context, candidates: population.appliedCandidates };
}

function requirement(optionId: string, item: CarsEvidenceBackedRequirement): CarsDomainFactRequirement {
  return {
    id: `cars-dfr:v1:evidence-mvp:${item.factKey}:${item.value}:${optionId}`,
    identity: { version: "cars-dfr:v1", policyId: candidateComparisonPolicy.policyId, policyVersion: candidateComparisonPolicy.version,
      parentPolicyRequirementId: "material-constraints", contextLineage: [], optionIds: [optionId], category: item.factKey,
      predicate: { relation: "ORDERED_NUMERIC_COMPARISON", direction: "AT_LEAST", operand: item.value } },
    bindingSourceOccurrence: 0, relationSourceOccurrence: 0,
  };
}

function resolution(requirements: readonly CarsDomainFactRequirement[]): CarsDomainFactRequirementResolutionResult {
  return { status: "RESOLVED", resolutions: [{ parentPolicyRequirementId: "material-constraints", status: "RESOLVED", requirements }],
    requirements, limitations: [], errors: [] };
}

function authorityMatches(port: VehicleEvidenceReadPort): boolean {
  const actual = port.getArtifactIdentity();
  return Object.entries(AUTHORITY).every(([key, value]) => actual[key as keyof typeof actual] === value);
}

type RequirementResult = "SATISFIED" | "DOES_NOT_SATISFY" | "NOT_EVALUABLE";
export interface CarsEvidenceBackedCandidateEvaluation {
  readonly runtimeVehicleCandidateId: RuntimeVehicleCandidateId;
  readonly vehicleVariantId: string;
  readonly configurationId: string;
  readonly presentationIdentity: { readonly brand: string; readonly model: string; readonly trim: string };
  readonly requirements: readonly { readonly requirement: CarsEvidenceBackedRequirement; readonly result: RequirementResult; readonly fact?: VehicleEvidenceFactResolution }[];
  readonly disposition: "ELIGIBLE" | "ELIMINATED_BY_MATERIAL_CONSTRAINT" | "NOT_EVALUABLE";
  readonly recommendationAuthorized: boolean;
  readonly eliminationReasons: readonly string[];
  readonly insufficientEvidenceReasons: readonly string[];
}

export type CarsEvidenceBackedDecisionStatus = "DECISION_READY" | "NEEDS_MORE_USER_CONTEXT" | "INSUFFICIENT_VEHICLE_EVIDENCE" | "NO_ELIGIBLE_CANDIDATE";
export interface CarsEvidenceBackedDecisionResult {
  readonly status: CarsEvidenceBackedDecisionStatus;
  readonly selectedRuntimeVehicleCandidateId?: RuntimeVehicleCandidateId;
  readonly selectedVehicle?: CarsEvidenceBackedCandidateEvaluation["presentationIdentity"];
  readonly materialRequirements: readonly CarsEvidenceBackedRequirement[];
  readonly candidateEvaluations: readonly CarsEvidenceBackedCandidateEvaluation[];
  readonly recommendationAuthorization: { readonly authorized: boolean; readonly authorizedCandidateIds: readonly RuntimeVehicleCandidateId[] };
  readonly evidenceTrace: { readonly authority: typeof AUTHORITY; readonly candidateIds: readonly RuntimeVehicleCandidateId[] };
  readonly explanationInput: readonly string[];
  readonly userFacingExplanation?: string;
  readonly followUpQuestion?: string;
  readonly discriminatorChoices?: readonly CarsFinalDiscriminatorChoice[];
}

function availableBounds(fact: VehicleEvidenceFactResolution | undefined): { min: number; max: number } | undefined {
  if (!fact || fact.status !== "AVAILABLE") return undefined;
  if (fact.value !== undefined) return { min: fact.value, max: fact.value };
  if (fact.valueMin !== undefined && fact.valueMax !== undefined) return { min: fact.valueMin, max: fact.valueMax };
  return undefined;
}

function discriminatorWinner(
  candidates: readonly CarsEvidenceBackedCandidateEvaluation[],
  factKey: CarsEvidenceBackedRequirement["factKey"],
): CarsEvidenceBackedCandidateEvaluation | undefined {
  const values = candidates.map((candidate) => ({
    candidate,
    bounds: availableBounds(candidate.requirements.find((item) => item.requirement.factKey === factKey)?.fact),
  }));
  if (values.some((item) => !item.bounds)) return undefined;
  return values.find((item) => values.every((other) => (
    other === item || item.bounds!.min > other.bounds!.max
  )))?.candidate;
}

function finalDiscriminatorChoices(candidates: readonly CarsEvidenceBackedCandidateEvaluation[]): readonly CarsFinalDiscriminatorChoice[] {
  return [
    ...(discriminatorWinner(candidates, "seats") ? [{ id: "MAX_SEATS" as const, label: "Daha fazla koltuk" }] : []),
    ...(discriminatorWinner(candidates, "cargo_volume_l") ? [{ id: "MAX_CARGO" as const, label: "Daha fazla bagaj alanı" }] : []),
  ];
}

function presentation(vehicleVariantId: string) {
  const record = catalogPayload.records.find((item) => item.variant.id === vehicleVariantId);
  if (!record) throw new Error("CONTROLLED_CANDIDATE_NOT_IN_PINNED_CATALOG");
  return { brand: record.variant.brand.value, model: record.variant.model.value, trim: record.variant.trim.value };
}

function assertionFromFact(requirementId: string, fact: VehicleEvidenceFactResolution): CarsDomainEvidenceAssertion {
  return { evidenceId: `${requirementId}:evidence`, optionId: fact.runtimeVehicleCandidateId, category: fact.factKey,
    availability: fact.status === "AVAILABLE" ? "AVAILABLE" : fact.status === "MISSING" ? "MISSING" : "UNRESOLVED",
    ...(fact.status === "AVAILABLE" ? { assertion: fact.value === undefined ? { valueMin: fact.valueMin, valueMax: fact.valueMax, rangeSemantics: fact.rangeSemantics } : fact.value,
      source: { sourceId: fact.sourceIds.join(","), reference: `${fact.artifactVersion}#${fact.assertionIds.join(",")}` }, provenance: "AUTHORITATIVE_SOURCE" as const } : {}),
    limitations: [...fact.limitations], conflictReferences: [] };
}

/** Governed evidence-backed Cars MVP decision entry point. */
export function runCarsEvidenceBackedDecision(input: { readonly query: string; readonly vehicleEvidenceReadPort?: VehicleEvidenceReadPort; readonly discriminatorChoiceId?: CarsFinalDiscriminatorChoiceId }): CarsEvidenceBackedDecisionResult {
  const { context } = contextFromQuery(input.query);
  const bridge = deriveCarsEvidenceBackedRequirements(context);
  const baseTrace = { authority: AUTHORITY, candidateIds: artifactPayload.candidates.map((item) => item.runtimeVehicleCandidateId as RuntimeVehicleCandidateId) };
  if (bridge.requirements.length === 0) {
    const question = bridge.materialPreferencesWithoutThreshold.includes("cargo_volume_l")
      ? "Bagaj sizin için önemli. Minimum bir bagaj hacmi beklentiniz var mı?"
      : bridge.partySize !== undefined ? "En az kaç kişilik koltuk kapasitesine ihtiyacınız var?" : "En az kaç koltuk veya minimum kaç litre bagaj hacmi sizin için zorunlu?";
    return { status: "NEEDS_MORE_USER_CONTEXT", materialRequirements: [], candidateEvaluations: [], recommendationAuthorization: { authorized: false, authorizedCandidateIds: [] }, evidenceTrace: baseTrace, explanationInput: [], followUpQuestion: question };
  }
  const port = input.vehicleEvidenceReadPort;
  if (!port || !authorityMatches(port)) {
    return { status: "INSUFFICIENT_VEHICLE_EVIDENCE", materialRequirements: bridge.requirements, candidateEvaluations: [], recommendationAuthorization: { authorized: false, authorizedCandidateIds: [] }, evidenceTrace: baseTrace, explanationInput: [], followUpQuestion: "Doğrulanmış araç kanıtı şu anda kullanılamıyor; güvenilir bir seçim yapamıyorum." };
  }

  const evaluations = artifactPayload.candidates.map((candidate): CarsEvidenceBackedCandidateEvaluation => {
    const candidateRequirements = bridge.requirements.map((item) => requirement(candidate.runtimeVehicleCandidateId, item));
    const domainResolution = resolution(candidateRequirements);
    const evidence = buildCarsRuntimeEvidenceDependencies({ decisionType: candidateComparisonPolicy.decisionType, policy: candidateComparisonPolicy,
      requirementResolution: domainResolution, vehicleEvidenceReadPort: port,
      typeBProduction: { candidate: { id: `mvp:${candidate.runtimeVehicleCandidateId}`, target: "evaluationContext.decisionOptions", value: [{ optionId: candidate.runtimeVehicleCandidateId }], provenance: "DOMAIN_SUPPLIED", source: { kind: "DOMAIN_SOURCE", referenceId: `runtime-vehicle-candidate:${candidate.runtimeVehicleCandidateId}` } },
        selectionTrace: [{ inputIndex: 0, optionId: candidate.runtimeVehicleCandidateId, userConfirmationReferenceId: "controlled-mvp", domainSourceReferenceId: `runtime-vehicle-candidate:${candidate.runtimeVehicleCandidateId}` }] },
      catalog: { cars: [], sourceId: "pinned-catalog:0.2.0", revision: AUTHORITY.catalogPayloadHash, limitations: [] } });
    const results = candidateRequirements.map((domainRequirement, index) => {
      const fact = port.readFact(candidate.runtimeVehicleCandidateId as RuntimeVehicleCandidateId, bridge.requirements[index].factKey);
      if (fact.status !== "AVAILABLE") return { requirement: bridge.requirements[index], result: "NOT_EVALUABLE" as const, fact };
      const evaluated = evaluateCarsDomainFactRequirement(domainRequirement, assertionFromFact(domainRequirement.id, fact));
      return { requirement: bridge.requirements[index], result: evaluated.status === "SATISFIED" ? "SATISFIED" as const : evaluated.status === "NEGATIVE" ? "DOES_NOT_SATISFY" as const : "NOT_EVALUABLE" as const, fact };
    });
    const disposition = results.some((item) => item.result === "DOES_NOT_SATISFY") ? "ELIMINATED_BY_MATERIAL_CONSTRAINT" as const
      : results.some((item) => item.result === "NOT_EVALUABLE") ? "NOT_EVALUABLE" as const : "ELIGIBLE" as const;
    const orchestration = orchestrateCarsDecision({ requestId: `mvp:${candidate.runtimeVehicleCandidateId}`, contextReference: "cars-evidence-mvp", dependencies: {
      classification: { status: "CLASSIFIED", decisionType: candidateComparisonPolicy.decisionType }, typeBIdentity: { status: "RESOLVED" },
      materialityAssessments: [{ requirementId: "material-constraints", outcome: "MATERIAL", supportingCandidateIds: [], limitations: [] }], rejectionAssessments: [],
      limitedSupportAssessment: assessLimitedSupport({ outcome: "NOT_PERMITTED", limitations: [] }), domainFactResolution: domainResolution,
      evidence: evidence.evidence, domainAssessment: "domainAssessment" in evidence ? evidence.domainAssessment : undefined,
    } });
    return { runtimeVehicleCandidateId: candidate.runtimeVehicleCandidateId as RuntimeVehicleCandidateId, vehicleVariantId: candidate.vehicleVariantId,
      configurationId: candidate.configurationId, presentationIdentity: presentation(candidate.vehicleVariantId), requirements: results, disposition,
      recommendationAuthorized: disposition === "ELIGIBLE" && orchestration.status === "AUTHORIZED",
      eliminationReasons: results.filter((item) => item.result === "DOES_NOT_SATISFY").map((item) => `${item.requirement.factKey} >= ${item.requirement.value}`),
      insufficientEvidenceReasons: results.filter((item) => item.result === "NOT_EVALUABLE").flatMap((item) => item.fact?.limitations ?? ["INSUFFICIENT_VEHICLE_EVIDENCE"]) };
  });
  const authorized = evaluations.filter((item) => item.recommendationAuthorized);
  if (authorized.length === 1) {
    const selected = authorized[0];
    const facts = selected.requirements.map((item) => `${item.requirement.factKey}=${item.fact?.value ?? `${item.fact?.valueMin}-${item.fact?.valueMax}`}`);
    const explanation = `${selected.presentationIdentity.brand} ${selected.presentationIdentity.model} seçildi: ${selected.requirements.map((item) => item.requirement.factKey === "seats" ? `${item.fact?.value} koltuk, ${item.requirement.value} minimumunu karşılıyor` : `${item.fact?.value ?? `${item.fact?.valueMin}-${item.fact?.valueMax}`} L bagaj, ${item.requirement.value} L minimumunu karşılıyor`).join("; ")}.`;
    return { status: "DECISION_READY", selectedRuntimeVehicleCandidateId: selected.runtimeVehicleCandidateId, selectedVehicle: selected.presentationIdentity,
      materialRequirements: bridge.requirements, candidateEvaluations: evaluations, recommendationAuthorization: { authorized: true, authorizedCandidateIds: [selected.runtimeVehicleCandidateId] },
      evidenceTrace: baseTrace, explanationInput: facts, userFacingExplanation: explanation };
  }
  if (authorized.length > 1) {
    const choices = finalDiscriminatorChoices(authorized);
    if (input.discriminatorChoiceId && choices.some((choice) => choice.id === input.discriminatorChoiceId)) {
      const selected = input.discriminatorChoiceId === "MAX_SEATS"
        ? discriminatorWinner(authorized, "seats")
        : discriminatorWinner(authorized, "cargo_volume_l");
      if (selected) return {
        status: "DECISION_READY", selectedRuntimeVehicleCandidateId: selected.runtimeVehicleCandidateId, selectedVehicle: selected.presentationIdentity,
        materialRequirements: bridge.requirements, candidateEvaluations: evaluations,
        recommendationAuthorization: { authorized: true, authorizedCandidateIds: [selected.runtimeVehicleCandidateId] }, evidenceTrace: baseTrace,
        explanationInput: [input.discriminatorChoiceId],
        userFacingExplanation: `${selected.presentationIdentity.brand} ${selected.presentationIdentity.model}, seçtiğiniz ${input.discriminatorChoiceId === "MAX_SEATS" ? "daha fazla koltuk" : "daha fazla bagaj alanı"} kriteriyle ayrıştığı için seçildi.`,
      };
    }
    return { status: "NEEDS_MORE_USER_CONTEXT", materialRequirements: bridge.requirements, candidateEvaluations: evaluations,
      recommendationAuthorization: { authorized: false, authorizedCandidateIds: authorized.map((item) => item.runtimeVehicleCandidateId) }, evidenceTrace: baseTrace, explanationInput: [],
      discriminatorChoices: choices,
      followUpQuestion: "Birden fazla araç tüm zorunlu şartlarınızı karşılıyor; ayırt edici ve kararı değiştirecek seçeneği seçin." };
  }
  const hasUnknown = evaluations.some((item) => item.disposition === "NOT_EVALUABLE");
  return { status: hasUnknown ? "INSUFFICIENT_VEHICLE_EVIDENCE" : "NO_ELIGIBLE_CANDIDATE", materialRequirements: bridge.requirements, candidateEvaluations: evaluations,
    recommendationAuthorization: { authorized: false, authorizedCandidateIds: [] }, evidenceTrace: baseTrace, explanationInput: [],
    followUpQuestion: hasUnknown ? "Mevcut doğrulanmış araç kanıtlarıyla güvenilir bir aday seçilemiyor." : "Kontrollü aday evreninde zorunlu şartlarınızı karşılayan araç yok." };
}
