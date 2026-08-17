import type { CatalogSnapshot } from "../catalog/types";
import type { DailyLifeLayerSnapshot, LayerDiagnostic, PersonaLayerSnapshot } from "./types";

export function validateDecisionLayerCompatibility(input: { readonly snapshot: CatalogSnapshot; readonly dailyLife?: DailyLifeLayerSnapshot; readonly persona?: PersonaLayerSnapshot }): readonly LayerDiagnostic[] {
  const diagnostics: LayerDiagnostic[] = []; const ids = new Set(input.snapshot.variants.map((variant) => variant.id));
  if (input.dailyLife && (input.dailyLife.catalogFingerprint !== input.snapshot.authority.catalogFingerprint || input.dailyLife.catalogReleaseVersion !== input.snapshot.authority.releaseVersion)) diagnostics.push({ code: "DAILY_LIFE_LAYER_INCOMPATIBLE" });
  if (input.persona && (input.persona.catalogFingerprint !== input.snapshot.authority.catalogFingerprint || input.persona.catalogReleaseVersion !== input.snapshot.authority.releaseVersion)) diagnostics.push({ code: "PERSONA_LAYER_INCOMPATIBLE" });
  for (const signal of [...(input.dailyLife?.signals ?? []), ...(input.persona?.signals ?? [])]) if (!ids.has(signal.exactVariantId)) diagnostics.push({ code: "LAYER_SIGNAL_OUTSIDE_CATALOG", referenceId: signal.exactVariantId });
  return Object.freeze(diagnostics);
}
