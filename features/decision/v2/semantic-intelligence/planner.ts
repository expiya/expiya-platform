import type { CatalogCapabilityRegistry } from "./catalogCapability";

export interface SemanticDimensionStatistic { readonly fieldId: string; readonly coverageRatio: number; readonly valueCounts: Readonly<Record<string, number>> }
export function selectDiscriminatingSemanticDimension(input: { readonly registry: CatalogCapabilityRegistry; readonly universeFingerprint: string; readonly answeredFieldIds: readonly string[]; readonly statistics: readonly SemanticDimensionStatistic[] }): { readonly fieldId: string; readonly score: number; readonly universeFingerprint: string } | null {
  if (input.universeFingerprint !== input.registry.universeFingerprint) return null;
  const answered = new Set(input.answeredFieldIds); const evaluable = new Set(input.registry.entries.filter((entry) => entry.status === "EVALUABLE").map((entry) => entry.fieldId));
  const ranked = input.statistics.filter((item) => evaluable.has(item.fieldId as never) && !answered.has(item.fieldId) && item.coverageRatio >= (input.registry.entries.find((entry) => entry.fieldId === item.fieldId)?.minimumCoverageRatio ?? 1)).flatMap((item) => {
    const counts = Object.values(item.valueCounts); const total = counts.reduce((sum, count) => sum + count, 0); if (total <= 0 || counts.length < 2) return [];
    const entropy = -counts.reduce((sum, count) => { const probability = count / total; return sum + probability * Math.log2(probability); }, 0);
    return [{ fieldId: item.fieldId, score: entropy * item.coverageRatio }];
  }).sort((left, right) => right.score - left.score || left.fieldId.localeCompare(right.fieldId));
  return ranked[0] ? Object.freeze({ ...ranked[0], universeFingerprint: input.universeFingerprint }) : null;
}
