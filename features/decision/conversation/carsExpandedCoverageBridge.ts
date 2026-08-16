import { pilotVehicleRecords } from "@/data/production/pilotVehicles";
import closure from "@/data/cars/vehicle_evidence/releases/v0.5.0/closure.json";
import artifact from "@/data/runtime/vehicle-evidence/v0.4.0/artifact.json";
import type { CarsEvidenceBackedDecisionResult } from "@/features/decision/runtime/runCarsEvidenceBackedDecision";
import type { CarsConversationTrace } from "@/types/carsConversation";
import type { RuntimeVehicleCandidateId } from "@/types/runtimeVehicleEvidence";

type FilterTrace = { readonly kind: string; readonly before: readonly string[]; readonly after: readonly string[] };
export interface ExpandedCoverageTrace {
  readonly candidateIdsBeforeFilters: readonly string[];
  readonly filters: readonly FilterTrace[];
  readonly discriminator?: "COMPACT_FOOTPRINT_LENGTH_THEN_WIDTH" | "MAX_CARGO";
}

interface CandidateProfile {
  readonly body: string;
  readonly transmission: string;
  readonly fuel: string;
  readonly length?: number;
  readonly width?: number;
  readonly cargo?: number;
}

const profiles = new Map<string, CandidateProfile>(pilotVehicleRecords.flatMap((record) => record.technicalVariant ? [[record.identity.id, {
  body: record.technicalVariant.bodyStyle.value.toLocaleUpperCase("tr-TR"),
  transmission: record.technicalVariant.powertrain.transmission.value,
  fuel: record.technicalVariant.powertrain.fuelType.value,
  length: record.technicalVariant.dimensions.lengthMm?.value,
  width: record.technicalVariant.dimensions.widthMm?.value,
  cargo: record.technicalVariant.dimensions.luggageLitres?.value,
}]] as const : []));
for (const configuration of closure.configurations) {
  profiles.set(configuration.vehicleVariantId, {
    body: configuration.identity.bodyFamily,
    transmission: configuration.identity.transmission,
    fuel: configuration.identity.fuel,
    length: configuration.facts.lengthMm,
    width: configuration.facts.widthMm,
    cargo: configuration.facts.cargoLitres,
  });
}

function latest(memory: CarsConversationTrace, key: string) {
  return [...memory.requirements].reverse().find((entry) => entry.key === key);
}

export function expandedCoverageIsActive(memory: CarsConversationTrace, query: string): boolean {
  return memory.requirements.some((entry) => ["PARTY_SIZE", "TRANSMISSION", "BODY_TYPE", "FUEL", "SIZE_PREFERENCE"].includes(entry.key))
    || /clio\s+(?:dışında|yerine)|bagajı küçük olmasın|bagaj.*öncel|kompakt|küçük dış ölç/iu.test(query);
}

export function applyExpandedCoverageBridge(input: {
  readonly result: CarsEvidenceBackedDecisionResult;
  readonly memory: CarsConversationTrace;
  readonly query: string;
  readonly choiceId?: "MAX_SEATS" | "MAX_CARGO";
}): { readonly result: CarsEvidenceBackedDecisionResult; readonly trace: ExpandedCoverageTrace } {
  const initial = input.result.status === "NO_ELIGIBLE_CANDIDATE" ? [] : input.result.recommendationAuthorization.authorizedCandidateIds.length
    ? [...input.result.recommendationAuthorization.authorizedCandidateIds]
    : input.result.candidateEvaluations.filter((candidate) => candidate.disposition === "ELIGIBLE").map((candidate) => candidate.runtimeVehicleCandidateId);
  let ids = initial;
  const filters: FilterTrace[] = [];
  const apply = (kind: string, predicate: (variantId: string) => boolean) => {
    const before = ids;
    ids = ids.filter((id) => {
      const candidate = input.result.candidateEvaluations.find((item) => item.runtimeVehicleCandidateId === id);
      return Boolean(candidate && predicate(candidate.vehicleVariantId));
    });
    filters.push({ kind, before, after: ids });
  };
  const transmission = latest(input.memory, "TRANSMISSION")?.value;
  if (transmission === "AUTOMATIC") apply("AUTOMATIC", (variantId) => /automatic|otomatik|cvt|edc|dct|reduction/iu.test(profiles.get(variantId)?.transmission ?? ""));
  const body = latest(input.memory, "BODY_TYPE")?.value;
  if (body === "SUV_CROSSOVER") apply("BODY_SUV_CROSSOVER", (variantId) => /suv|crossover/iu.test(profiles.get(variantId)?.body ?? ""));
  if (body === "HATCHBACK") apply("BODY_HATCHBACK", (variantId) => /hatchback/iu.test(profiles.get(variantId)?.body ?? ""));
  if (body === "SEDAN") apply("BODY_SEDAN", (variantId) => /sedan/iu.test(profiles.get(variantId)?.body ?? ""));
  const fuel = latest(input.memory, "FUEL")?.value;
  if (fuel === "GASOLINE") apply("FUEL_GASOLINE", (variantId) => /gasoline|petrol/iu.test(profiles.get(variantId)?.fuel ?? ""));
  if (fuel === "DIESEL") apply("FUEL_DIESEL", (variantId) => /diesel/iu.test(profiles.get(variantId)?.fuel ?? ""));
  if (fuel === "HYBRID") apply("FUEL_HYBRID", (variantId) => /hev|mhev|phev|hybrid/iu.test(profiles.get(variantId)?.fuel ?? ""));
  if (fuel === "ELECTRIC") apply("FUEL_ELECTRIC", (variantId) => /bev|electric/iu.test(profiles.get(variantId)?.fuel ?? ""));
  if (/clio\s+(?:dışında|yerine)|clio['’]?ya alternatif/iu.test(input.query)) apply("EXCLUDE_CLIO_ANCHOR", (variantId) => !/clio/iu.test(input.result.candidateEvaluations.find((item) => item.vehicleVariantId === variantId)?.presentationIdentity.model ?? ""));

  let discriminator: ExpandedCoverageTrace["discriminator"];
  const compact = latest(input.memory, "SIZE_PREFERENCE")?.value === "COMPACT_EXTERIOR";
  const cargo = input.choiceId === "MAX_CARGO" || /bagajı küçük olmasın|bagaj.*(?:önemli|öncel)/iu.test(input.query);
  if (ids.length >= 1 && compact) {
    discriminator = "COMPACT_FOOTPRINT_LENGTH_THEN_WIDTH";
    ids = [...ids].filter((id) => {
      const candidate = input.result.candidateEvaluations.find((item) => item.runtimeVehicleCandidateId === id);
      const profile = candidate && profiles.get(candidate.vehicleVariantId);
      return profile?.length !== undefined && profile.width !== undefined;
    }).sort((a, b) => {
      const ca = input.result.candidateEvaluations.find((item) => item.runtimeVehicleCandidateId === a)!;
      const cb = input.result.candidateEvaluations.find((item) => item.runtimeVehicleCandidateId === b)!;
      const pa = profiles.get(ca.vehicleVariantId)!; const pb = profiles.get(cb.vehicleVariantId)!;
      return pa.length! - pb.length! || pa.width! - pb.width! || a.localeCompare(b);
    }).slice(0, 1);
  } else if (ids.length >= 1 && cargo) {
    discriminator = "MAX_CARGO";
    ids = [...ids].filter((id) => {
      const candidate = input.result.candidateEvaluations.find((item) => item.runtimeVehicleCandidateId === id);
      return candidate && profiles.get(candidate.vehicleVariantId)?.cargo !== undefined;
    }).sort((a, b) => {
      const ca = input.result.candidateEvaluations.find((item) => item.runtimeVehicleCandidateId === a)!;
      const cb = input.result.candidateEvaluations.find((item) => item.runtimeVehicleCandidateId === b)!;
      return profiles.get(cb.vehicleVariantId)!.cargo! - profiles.get(ca.vehicleVariantId)!.cargo! || a.localeCompare(b);
    }).slice(0, 1);
  }
  const selected = ids.length === 1 ? input.result.candidateEvaluations.find((item) => item.runtimeVehicleCandidateId === ids[0]) : undefined;
  const selectedCargo = selected && artifact.candidates.find((item) => item.runtimeVehicleCandidateId === selected.runtimeVehicleCandidateId)?.facts.cargo_volume_l;
  const cargoText = selectedCargo && "value" in selectedCargo ? String(selectedCargo.value)
    : selectedCargo && "valueMin" in selectedCargo && "valueMax" in selectedCargo ? `${selectedCargo.valueMin}-${selectedCargo.valueMax}` : undefined;
  const selectedProfile = selected && profiles.get(selected.vehicleVariantId);
  const dimensionsText = selectedProfile?.length !== undefined && selectedProfile.width !== undefined
    ? `${selectedProfile.length}x${selectedProfile.width}` : undefined;
  const result: CarsEvidenceBackedDecisionResult = selected ? {
    ...input.result, status: "DECISION_READY", selectedRuntimeVehicleCandidateId: selected.runtimeVehicleCandidateId,
    selectedVehicle: selected.presentationIdentity, recommendationAuthorization: { authorized: true, authorizedCandidateIds: [selected.runtimeVehicleCandidateId] },
    discriminatorChoices: undefined, followUpQuestion: undefined,
    explanationInput: discriminator ? [discriminator,
      ...(cargoText && discriminator === "MAX_CARGO" ? [`CARGO_L=${cargoText}`] : []),
      ...(dimensionsText && discriminator === "COMPACT_FOOTPRINT_LENGTH_THEN_WIDTH" ? [`DIMENSIONS_MM=${dimensionsText}`] : []),
    ] : input.result.explanationInput,
    userFacingExplanation: discriminator === "COMPACT_FOOTPRINT_LENGTH_THEN_WIDTH"
      ? `${selected.presentationIdentity.brand} ${selected.presentationIdentity.model}, doğrulanmış dış uzunluk ve ardından genişlik sıralamasında en kompakt aday olduğu için seçildi.`
      : discriminator === "MAX_CARGO" ? `${selected.presentationIdentity.brand} ${selected.presentationIdentity.model}, uygun adaylar içinde doğrulanmış koltuklar açık bagaj hacmi en yüksek olduğu için seçildi.` : input.result.userFacingExplanation,
  } : {
    ...input.result, status: ids.length === 0 ? "NO_ELIGIBLE_CANDIDATE" : "NEEDS_MORE_USER_CONTEXT",
    selectedRuntimeVehicleCandidateId: undefined, selectedVehicle: undefined,
    recommendationAuthorization: { authorized: false, authorizedCandidateIds: ids as RuntimeVehicleCandidateId[] },
  };
  return { result, trace: { candidateIdsBeforeFilters: initial, filters, discriminator } };
}
