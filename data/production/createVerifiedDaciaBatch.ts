/* eslint-disable @typescript-eslint/no-unused-vars */
import { createBrandBatch, type BrandCandidate } from "@/data/production/createBrandBatch";
import type { PilotVehicleRecord } from "@/data/production/pilotVehicles";

export type DaciaConfigurationValidationCode =
  | "EXACT_CONFIGURATION_SOURCE_REQUIRED"
  | "SHARED_POWERTRAIN_APPLICABILITY_UNPROVEN"
  | "SEAT_COUNT_DERIVED_FROM_LABEL"
  | "PRICE_AUTHORITY_USED_AS_IDENTITY_AUTHORITY"
  | "MODEL_FAMILY_SOURCE_USED_FOR_EXACT_VARIANT";

export interface VerifiedDaciaConfiguration extends BrandCandidate {
  readonly configurationCode?: string;
  readonly configurationSourceId: `SRC-${string}`;
  readonly configurationArtifact: string;
  readonly configurationSha256: `sha256:${string}`;
  readonly configurationLocator: string;
  readonly sourceApplicability: "EXACT_CONFIGURATION";
  readonly seatCountEvidence: "EXPLICIT";
  readonly identityAuthorityIndependentOfPrice: true;
}

export function validateVerifiedDaciaConfiguration(input: VerifiedDaciaConfiguration): readonly DaciaConfigurationValidationCode[] {
  const errors: DaciaConfigurationValidationCode[] = [];
  if (!input.configurationSourceId || !input.configurationArtifact || !input.configurationLocator) errors.push("EXACT_CONFIGURATION_SOURCE_REQUIRED");
  if (input.sourceApplicability !== "EXACT_CONFIGURATION") errors.push("SHARED_POWERTRAIN_APPLICABILITY_UNPROVEN");
  if (input.seatCountEvidence !== "EXPLICIT") errors.push("SEAT_COUNT_DERIVED_FROM_LABEL");
  if (!input.identityAuthorityIndependentOfPrice) errors.push("PRICE_AUTHORITY_USED_AS_IDENTITY_AUTHORITY");
  if (/\/modeller\/[^/]+\.html$/u.test(input.url)) errors.push("MODEL_FAMILY_SOURCE_USED_FOR_EXACT_VARIANT");
  return errors;
}

export function createVerifiedDaciaBatch(input: readonly VerifiedDaciaConfiguration[], at: string, priceUrl: string): readonly PilotVehicleRecord[] {
  const errors = input.flatMap(validateVerifiedDaciaConfiguration);
  if (errors.length) throw new Error(`DACIA_CONFIGURATION_INVALID:${[...new Set(errors)].join(",")}`);
  const candidates: BrandCandidate[] = input.map(({ configurationCode: _configurationCode, configurationSourceId: _configurationSourceId, configurationArtifact: _configurationArtifact, configurationSha256: _configurationSha256, configurationLocator: _configurationLocator, sourceApplicability: _sourceApplicability, seatCountEvidence: _seatCountEvidence, identityAuthorityIndependentOfPrice: _identityAuthorityIndependentOfPrice, ...candidate }) => candidate);
  return createBrandBatch("Dacia", "dacia-tr", at, priceUrl, candidates);
}
