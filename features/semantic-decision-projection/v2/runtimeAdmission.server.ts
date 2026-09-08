import { loadActivePMaterialityWave } from "./activeWaveLoader.server";
import { classifyQuestionAdmission } from "./domainPackAdmission";
import type { SemanticDecisionProjectionV2 } from "./contract";

export interface ActiveCategoryPMateriality {
  readonly releaseId: string;
  readonly releaseDigest: `sha256:${string}`;
  readonly categoryId: string;
  readonly readiness: "P_READY" | "INFORMATION_ONLY";
  readonly questionAdmission: "ASKABLE" | "SUPPRESSED";
  readonly projections: readonly SemanticDecisionProjectionV2[];
  readonly exactOfferingIds: readonly string[];
}

export async function requireActivePMaterialityWave(root = process.cwd()) {
  const loaded = await loadActivePMaterialityWave(root);
  if (loaded.status !== "READY") throw new Error(`P_MATERIALITY_${loaded.reason}`);
  return loaded.wave;
}

/** Fail-closed bridge used by every active Stage-1 conversation runtime. */
export async function requireActiveCategoryPMateriality(
  categoryId: string,
  root = process.cwd(),
): Promise<ActiveCategoryPMateriality> {
  const wave = await requireActivePMaterialityWave(root);
  const projections = wave.projections.filter((projection) => projection.identity.categoryId === categoryId);
  if (!projections.length) throw new Error(`P_MATERIALITY_CATEGORY_NOT_ACTIVE:${categoryId}`);
  const exactOfferingIds = [...new Set(projections.flatMap((projection) => projection.offerings.map((offering) => offering.exactOfferingId)))].sort();
  if (!exactOfferingIds.length) throw new Error(`P_MATERIALITY_EXACT_COVERAGE_EMPTY:${categoryId}`);
  const declaredP = new Set(wave.pCategories ?? wave.categories);
  const declaredInformation = new Set(wave.informationOnlyCategories ?? []);
  const readiness = declaredP.has(categoryId) ? "P_READY" as const : declaredInformation.has(categoryId) ? "INFORMATION_ONLY" as const : undefined;
  if (!readiness) throw new Error(`P_MATERIALITY_READINESS_UNDECLARED:${categoryId}`);
  const questionAdmission = projections.some((projection) => classifyQuestionAdmission(projection) === "ASKABLE") ? "ASKABLE" as const : "SUPPRESSED" as const;
  if (readiness === "INFORMATION_ONLY" && questionAdmission !== "SUPPRESSED") throw new Error(`P_MATERIALITY_INFORMATION_ONLY_ASKABLE:${categoryId}`);
  return Object.freeze({ releaseId: wave.releaseId, releaseDigest: wave.releaseDigest, categoryId, readiness, questionAdmission, projections: Object.freeze(projections), exactOfferingIds: Object.freeze(exactOfferingIds) });
}
