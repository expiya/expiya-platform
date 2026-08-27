import { getReviewedEquipmentAssociations, getVariantEquipmentFeatures, getVariantEquipmentProjection, getVerifiedEquipmentAssertions } from "../../vehicle-data/equipmentEvidenceResolver";
import { hasProvisionalOwnerManualEquipment } from "../../vehicle-data/ownerManualEvidenceProjection";
import type { CatalogVariantSnapshot } from "../v2/catalog/types";
import type { PreferenceEvent } from "./types";

export type EquipmentCardClaim = "EXACT_VARIANT_VERIFIED" | "EXACT_VARIANT_UNVERIFIED" | "UNKNOWN" | "NO_CLAIM";
export interface EquipmentCardDisclosure { readonly claim: EquipmentCardClaim; readonly badge?: "Doğrulanmış donanım"; readonly warning?: string }
export type EquipmentEvidenceDisposition = "EXACT_VARIANT_VERIFIED" | "CONDITIONAL" | "FAMILY_CAPABILITY" | "RESEARCHED_INCONCLUSIVE" | "UNKNOWN" | "SILENT_ABSENCE" | "CONFLICT" | "PILOT_OUTSIDE";

export function disclosureForEquipmentDisposition(disposition: EquipmentEvidenceDisposition): EquipmentCardDisclosure {
  if (disposition === "CONFLICT" || disposition === "PILOT_OUTSIDE") return { claim: "NO_CLAIM" };
  if (disposition === "EXACT_VARIANT_VERIFIED") return { claim: "EXACT_VARIANT_VERIFIED", badge: "Doğrulanmış donanım" };
  if (disposition === "CONDITIONAL") return { claim: "EXACT_VARIANT_UNVERIFIED", warning: "Bu donanım exact versiyonda paket veya koşula bağlı olabilir; standart olduğu doğrulanmadı." };
  if (disposition === "FAMILY_CAPABILITY" || disposition === "RESEARCHED_INCONCLUSIVE") {
    return { claim: "EXACT_VARIANT_UNVERIFIED", warning: "Bu donanım bu exact versiyon için doğrulanmadı; satın alma öncesinde doğrulanması gerekir." };
  }
  return { claim: "UNKNOWN", warning: "Bu bilgi doğrulanamadı." };
}

export function projectEquipmentCardDisclosure(input: { variant: CatalogVariantSnapshot; preference: PreferenceEvent; catalogRelease: string; catalogFingerprint: string }): EquipmentCardDisclosure {
  const featureCode = String(input.preference.normalizedValue);
  const projection = getVariantEquipmentProjection(input.variant.id, featureCode as Parameters<typeof getVariantEquipmentProjection>[1]);
  if (projection?.conflictState === "CONFLICTING") return disclosureForEquipmentDisposition("CONFLICT");
  const variantAssertions = getVerifiedEquipmentAssertions(input.variant.id);
  const variantAssociations = getReviewedEquipmentAssociations({ exactVariantId: input.variant.id });
  const pilotCovered = variantAssertions.length > 0 || variantAssociations.length > 0 || getVariantEquipmentFeatures(input.variant.id).length > 0;
  if (!pilotCovered) return disclosureForEquipmentDisposition("PILOT_OUTSIDE");
  const verified = variantAssertions.find((item) => item.featureCode === featureCode && item.verificationState === "VERIFIED");
  if (verified?.availabilityStatus === "STANDARD" && verified.standardOrOptional === "STANDARD") return disclosureForEquipmentDisposition("EXACT_VARIANT_VERIFIED");
  if (verified?.availabilityStatus === "OPTIONAL" || verified?.availabilityStatus === "PACKAGE_DEPENDENT" || verified?.standardOrOptional === "OPTIONAL" || verified?.standardOrOptional === "PACKAGE_DEPENDENT") return disclosureForEquipmentDisposition("CONDITIONAL");
  if (verified) return disclosureForEquipmentDisposition("UNKNOWN");
  const association = variantAssociations.some((item) => item.featureCode === featureCode);
  const family = hasProvisionalOwnerManualEquipment({ variant: input.variant, featureCode, catalogRelease: input.catalogRelease, catalogFingerprint: input.catalogFingerprint });
  if (association) return disclosureForEquipmentDisposition("RESEARCHED_INCONCLUSIVE");
  if (family) return disclosureForEquipmentDisposition("FAMILY_CAPABILITY");
  return disclosureForEquipmentDisposition("UNKNOWN");
}
