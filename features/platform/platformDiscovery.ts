import { ACTIVE_DEPARTMENT_REGISTRY, type DepartmentRegistryEntry } from "./departmentRegistry";
import {
  SECRETARY_DAILY_LIFE_EXAMPLES,
  type SecretaryDailyLifeExampleSet,
  validateSecretaryDailyLifeExamples,
} from "./secretaryDailyLifeExamples";

export interface ActiveDiscoveryCategory { readonly id: string; readonly label: string; readonly href: string; readonly examples: SecretaryDailyLifeExampleSet }
export interface ActiveDiscoveryDepartment { readonly id: string; readonly label: string; readonly href: string; readonly categories: readonly ActiveDiscoveryCategory[] }
type SecretaryExampleCatalog = Readonly<Record<string, SecretaryDailyLifeExampleSet>>;
const categoryKey = (departmentId: string, categoryId: string) => `${departmentId}:${categoryId}`;

export function buildActivePlatformDiscovery(registry: readonly DepartmentRegistryEntry[], exampleCatalog: SecretaryExampleCatalog = SECRETARY_DAILY_LIFE_EXAMPLES): readonly ActiveDiscoveryDepartment[] {
  return Object.freeze(registry.filter(department => department.status === "ACTIVE").map(department => Object.freeze({
    id: department.departmentId, label: department.publicLabelTr, href: department.canonicalPath,
    categories: Object.freeze(Object.entries(department.capabilities).filter(([, capability]) => capability.status === "ACTIVE").map(([id, capability]) => {
      const examples = exampleCatalog[categoryKey(department.departmentId, id)];
      if (!examples) throw new TypeError(`SECRETARY_EXAMPLES_MISSING:${categoryKey(department.departmentId, id)}`);
      return Object.freeze({ id, label: capability.publicLabelTr, href: capability.destination, examples });
    })),
  })));
}
export const ACTIVE_PLATFORM_DISCOVERY = buildActivePlatformDiscovery(ACTIVE_DEPARTMENT_REGISTRY);

export interface SecretarySearchSuggestion { readonly id: string; readonly label: string }

export function buildSecretarySearchSuggestions(discovery: readonly ActiveDiscoveryDepartment[]): readonly SecretarySearchSuggestion[] {
  const byDepartment = discovery.map(department => {
    const items: SecretarySearchSuggestion[] = [];
    const exampleCount = Math.max(0, ...department.categories.map(category => category.examples.length));
    for (let exampleIndex = 0; exampleIndex < exampleCount; exampleIndex += 1) {
      for (const category of department.categories) {
        const item = category.examples[exampleIndex];
        if (item) items.push({ id: item.key, label: item.text });
      }
    }
    return items;
  });
  const suggestions: SecretarySearchSuggestion[] = [];
  for (let itemIndex = 0; itemIndex < Math.max(0, ...byDepartment.map(items => items.length)); itemIndex += 1) {
    for (const items of byDepartment) {
      const suggestion = items[itemIndex];
      if (suggestion) suggestions.push(suggestion);
    }
  }
  return Object.freeze(suggestions.map(suggestion => Object.freeze(suggestion)));
}

const activeCategoryKeys = ACTIVE_PLATFORM_DISCOVERY.flatMap(department => department.categories.map(category => categoryKey(department.id, category.id)));
const dailyLifeIssues = validateSecretaryDailyLifeExamples(activeCategoryKeys);
if (dailyLifeIssues.length) throw new TypeError(`SECRETARY_DAILY_LIFE_EXAMPLES_INVALID:${dailyLifeIssues.join(",")}`);

export const SECRETARY_SEARCH_SUGGESTIONS = buildSecretarySearchSuggestions(ACTIVE_PLATFORM_DISCOVERY);
