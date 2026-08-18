import type { EquipmentEvidenceAssertion, EquipmentFeatureCode, EquipmentPackageVariantLink, EquipmentTrimVariantLink, ExactVariantEquipmentProjection } from "@/types/equipmentEvidence";
import { getEquipmentDecisionUse } from "./equipmentEvidencePolicy";

export interface EquipmentProjectionVariant { readonly exactVariantId: string; readonly modelYear: number; readonly market: "TR" }

export function projectEquipmentEvidence(input: {
  variant: EquipmentProjectionVariant;
  featureCode: EquipmentFeatureCode;
  assertions: readonly EquipmentEvidenceAssertion[];
  packageLinks: readonly EquipmentPackageVariantLink[];
  trimLinks: readonly EquipmentTrimVariantLink[];
}): ExactVariantEquipmentProjection | undefined {
  const supersededAssertionIds = new Set(input.assertions.flatMap((item) => item.supersedesAssertionId ? [item.supersedesAssertionId] : []));
  const applicable = input.assertions.filter((assertion) => !supersededAssertionIds.has(assertion.assertionId) && assertion.featureCode === input.featureCode
    && assertion.conflictState !== "SUPERSEDED" && assertion.market === input.variant.market
    && (assertion.modelYearFrom === undefined || input.variant.modelYear >= assertion.modelYearFrom)
    && (assertion.modelYearTo === undefined || input.variant.modelYear <= assertion.modelYearTo));
  const exactVariant = applicable.filter((assertion) => assertion.sourceApplicability === "EXACT_VARIANT"
    && assertion.exactVariantId === input.variant.exactVariantId && assertion.availabilityStatus !== "PACKAGE_DEPENDENT");
  const exactTrim = applicable.filter((assertion) => assertion.sourceApplicability === "EXACT_TRIM" && assertion.canonicalTrimId
    && assertion.availabilityStatus !== "PACKAGE_DEPENDENT" && input.trimLinks.some((link) => link.exactVariantId === input.variant.exactVariantId
      && link.canonicalTrimId === assertion.canonicalTrimId && link.market === input.variant.market && link.verificationState === "VERIFIED"
      && input.variant.modelYear >= link.modelYearFrom && input.variant.modelYear <= link.modelYearTo && link.assertionIds.includes(assertion.assertionId)));
  const packageAssertions = applicable.filter((assertion) => assertion.availabilityStatus === "PACKAGE_DEPENDENT" && assertion.canonicalPackageId
    && input.packageLinks.some((link) => link.exactVariantId === input.variant.exactVariantId && link.canonicalPackageId === assertion.canonicalPackageId
      && link.market === input.variant.market && link.verificationState === "VERIFIED" && input.variant.modelYear >= link.modelYearFrom
      && input.variant.modelYear <= link.modelYearTo && link.assertionIds.includes(assertion.assertionId)));
  const candidates = [...exactVariant, ...exactTrim, ...packageAssertions]
    .filter((assertion) => assertion.verificationState === "VERIFIED").sort((a, b) => a.assertionId.localeCompare(b.assertionId));
  if (candidates.length === 0) return undefined;
  const conflict = candidates.some((assertion) => assertion.conflictState === "CONFLICTING")
    || new Set(candidates.map((assertion) => assertion.availabilityStatus)).size > 1;
  const assertionIds = [...new Set(candidates.map((assertion) => assertion.assertionId))].sort();
  if (conflict) return { exactVariantId: input.variant.exactVariantId, featureCode: input.featureCode, availabilityStatus: "UNKNOWN",
    provisionMode: "UNRESOLVED", decisionUse: getEquipmentDecisionUse(input.featureCode), assertionIds,
    projectionAuthority: "INSUFFICIENT", conflictState: "CONFLICTING" };
  const selected = candidates[0];
  const packageLink = packageAssertions.includes(selected);
  const mandatory = packageLink && input.packageLinks.some((link) => link.exactVariantId === input.variant.exactVariantId
    && link.canonicalPackageId === selected.canonicalPackageId && link.mandatoryInCanonicalVariant && link.verificationState === "VERIFIED"
    && link.assertionIds.includes(selected.assertionId));
  return { exactVariantId: input.variant.exactVariantId, featureCode: input.featureCode,
    availabilityStatus: mandatory ? "STANDARD" : selected.availabilityStatus,
    provisionMode: mandatory ? "INCLUDED" : selected.provisionMode, decisionUse: getEquipmentDecisionUse(input.featureCode), assertionIds,
    projectionAuthority: packageLink ? "PACKAGE_VERIFIED" : "EXACT_VERIFIED", conflictState: "CLEAR" };
}
