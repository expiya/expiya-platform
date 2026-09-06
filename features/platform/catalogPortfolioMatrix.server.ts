import portfolio from "@/data/governance/catalog-portfolio/releases/CATALOG-PORTFOLIO-TAXONOMY-MATRIX-TR-v0.1/portfolio.json";
import sources from "@/data/governance/catalog-portfolio/releases/CATALOG-PORTFOLIO-TAXONOMY-MATRIX-TR-v0.1/source-register.json";
import { ACTIVE_DEPARTMENT_REGISTRY } from "./departmentRegistry";

const EXPECTED_AREAS = [
  "Garden", "Baby Products", "Computers", "Electronics", "Home", "Pet Supplies", "Grocery", "Gift Cards", "Beauty", "Books",
  "Apparel", "Kitchen", "Musical Instruments", "Office Products", "Automotive", "Toys", "Health & Personal Care", "Sporting Goods", "Video Games", "Home Improvement",
] as const;

export function validateCatalogPortfolioMatrix(): readonly string[] {
  const issues: string[] = [];
  const areas = portfolio.areas;
  const categories = portfolio.canonicalCategories;
  const areaNames = areas.map(area => area.amazonArea);
  const categoryIds = categories.map(category => category.categoryId);
  const categoryById = new Map(categories.map(category => [category.categoryId, category] as const));
  const activeDepartmentIds = new Set(ACTIVE_DEPARTMENT_REGISTRY.map(department => department.departmentId));

  if (portfolio.lifecycle !== "PROPOSAL_ONLY" || portfolio.runtimeActive !== false) issues.push("ACTIVATION_BOUNDARY_BROKEN");
  if (areaNames.length !== EXPECTED_AREAS.length || new Set(areaNames).size !== areaNames.length || EXPECTED_AREAS.some(area => !areaNames.includes(area))) issues.push("AREA_COVERAGE_MISMATCH");
  if (new Set(categoryIds).size !== categoryIds.length) issues.push("DUPLICATE_CANONICAL_CATEGORY");
  if (areas.some(area => area.mgc.some(categoryId => !categoryById.has(categoryId)))) issues.push("UNKNOWN_MGC_CATEGORY");
  if (areas.some(area => area.disposition.startsWith("POOR_FIT") ? area.mgc.length !== 0 || area.targetDepartmentId !== null : area.mgc.length < 3 || area.mgc.length > 5 || !area.targetDepartmentId)) issues.push("MGC_SIZE_OR_FIT_MISMATCH");
  if (categories.some(category => category.status === "ACTIVE_REUSE" && !activeDepartmentIds.has(category.ownerDepartmentId))) issues.push("ACTIVE_REUSE_OWNER_NOT_ACTIVE");
  if (areas.some(area => area.overlapAliases.some(alias => !area.mgc.includes(alias.canonicalCategoryId) || !categoryById.has(alias.canonicalCategoryId)))) issues.push("INVALID_OVERLAP_ALIAS");
  if (sources.sources.some(source => source.kind === "EXTERNAL_DISCOVERY" && source.role !== "DISCOVERY_AND_RETAIL_TAXONOMY_ONLY")) issues.push("EXTERNAL_SOURCE_AUTHORITY_LEAKAGE");
  if (!portfolio.authorityConflicts.some(conflict => conflict.id === "CONFLICT-ELECTRONICS-VERSION-NAME")) issues.push("ELECTRONICS_VERSION_CONFLICT_NOT_RECORDED");
  return Object.freeze(issues);
}

export const CATALOG_PORTFOLIO_MATRIX = portfolio;
