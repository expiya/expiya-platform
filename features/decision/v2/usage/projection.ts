import { createImmutableIndex } from "../catalog/familyIndex";
import type { CatalogSnapshot, CatalogVariantSnapshot, ImmutableIndex } from "../catalog/types";
import type { VehicleUsageArchitecture } from "../domain/usageCargo";
import { catalogFactReference } from "./authority";
import type { UsageArchitecturePolicy, UsageCargoPolicies } from "./policy";
import type { UsageArchitectureProjection, UsageReasonCode } from "./types";

function isUseClassConsistent(architecture: VehicleUsageArchitecture, useClass: "PASSENGER" | "LIGHT_COMMERCIAL" | "HEAVY_COMMERCIAL"): boolean {
  if (architecture === "PASSENGER_CAR") return useClass === "PASSENGER";
  if (architecture === "PASSENGER_CARRIER") return useClass === "PASSENGER" || useClass === "LIGHT_COMMERCIAL";
  if (["ENCLOSED_CARGO", "OPEN_CARGO", "CAB_CHASSIS"].includes(architecture)) return useClass !== "PASSENGER";
  return false;
}

export function projectUsageArchitecture(variant: CatalogVariantSnapshot, policy: UsageArchitecturePolicy): UsageArchitectureProjection {
  const body = variant.decisionFacts.bodyStyle;
  const useClass = variant.decisionFacts.vehicleUseClass;
  const architecture = policy.bodyStyleArchitecture[body.value] ?? "UNKNOWN";
  const diagnostics: UsageReasonCode[] = [];
  if (!useClass) diagnostics.push("USE_CLASS_MISSING");
  const conflict = useClass !== undefined && !isUseClassConsistent(architecture, useClass.value);
  if (conflict) diagnostics.push("USE_CLASS_BODY_STYLE_CONFLICT");
  const references = [catalogFactReference("bodyStyle", body), ...(useClass ? [catalogFactReference("vehicleUseClass", useClass)] : [])];
  const confidence = architecture === "UNKNOWN" || body.confidence === "LOW" || useClass?.confidence === "LOW" || conflict ? "LOW"
    : body.confidence === "HIGH" && (!useClass || useClass.confidence === "HIGH") ? "HIGH" : "MEDIUM";
  const fingerprintAligned = references.every((reference) => reference.catalogFingerprint === body.catalogFingerprint);
  return Object.freeze({
    architecture,
    derivation: architecture === "UNKNOWN" ? "INSUFFICIENT_DATA" : useClass ? "CANONICAL_USE_CLASS_AND_BODY_STYLE" : "CANONICAL_BODY_STYLE",
    sourceFactReferences: Object.freeze(references), confidence,
    hardScopeAuthority: architecture !== "UNKNOWN" && confidence !== "LOW" && fingerprintAligned && references.every((reference) => reference.provenanceCount > 0) && !conflict,
    policyId: policy.policyId, policyVersion: policy.policyVersion, catalogFingerprint: body.catalogFingerprint,
    diagnostics: Object.freeze(diagnostics),
  });
}

export type UsageArchitectureIndex = ImmutableIndex<string, UsageArchitectureProjection>;

export function projectCatalogUsageArchitectures(snapshot: CatalogSnapshot, policies: UsageCargoPolicies): UsageArchitectureIndex {
  return createImmutableIndex(snapshot.variants.map((variant) => [variant.id, projectUsageArchitecture(variant, policies.architecture)] as const));
}
