import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadActiveAppliancesAuthority, createFileSystemAppliancesArtifactRepository } from "@/features/appliances/authority/loader.server";
import { BOUNDED_TYPES, loadActiveBoundedAuthority } from "@/features/appliances/bounded/authority.server";
import { loadActiveDryerAuthority } from "@/features/appliances/dryer/authority.server";
import { loadActiveRefrigeratorAuthority } from "@/features/appliances/refrigerator/authority.server";
import { STROLLER_CATALOG_RELEASE, STROLLER_PRODUCTS } from "@/features/baby/catalog";
import { CORDLESS_DRILL_PACKAGE_DIGEST, CORDLESS_DRILL_PRODUCTS, CORDLESS_DRILL_RELEASE } from "@/features/cordless-drill/catalog";
import { createProductionCatalogReleaseRepository } from "@/features/decision/v2/catalog/fileSystemRepository.server";
import { loadActiveCatalogSnapshot } from "@/features/decision/v2/catalog/snapshot";
import { loadActiveElectronicsRuntimeAuthority } from "@/features/electronics/runtimeAuthority.server";
import { MOBILITY_PRODUCTS } from "@/features/mobility/catalog";
import { MOBILITY_AUTHORITY_DIGEST } from "@/features/mobility/domainPack";
import { ACTIVE_DEPARTMENT_REGISTRY, type DepartmentRegistryEntry } from "./departmentRegistry";

export interface CatalogDirectoryVariant { readonly label: string }
export interface CatalogDirectoryCategory { readonly id: string; readonly label: string; readonly href: string; readonly variants: readonly CatalogDirectoryVariant[] }
export interface CatalogDirectoryDepartment { readonly id: string; readonly label: string; readonly href: string; readonly categories: readonly CatalogDirectoryCategory[] }

type ProductRow = { readonly categoryId: string; readonly identity: string; readonly label: string };
const tr = (a: string, b: string) => a.localeCompare(b, "tr-TR");
const variant = (label: string): CatalogDirectoryVariant => Object.freeze({ label });
const brandLabel = (value: string) => value.split(/([ -])/u).map(part => /^[a-zçğıöşü]/u.test(part) ? `${part[0]!.toLocaleUpperCase("tr-TR")}${part.slice(1)}` : part).join("");

export function buildCatalogDirectory(registry: readonly DepartmentRegistryEntry[], rows: ReadonlyMap<string, readonly ProductRow[]>): readonly CatalogDirectoryDepartment[] {
  return Object.freeze(registry.filter(department => department.status === "ACTIVE").map(department => Object.freeze({
    id: department.departmentId, label: department.publicLabelTr, href: department.canonicalPath,
    categories: Object.freeze(Object.entries(department.capabilities).filter(([, capability]) => capability.status === "ACTIVE").map(([id, capability]) => Object.freeze({
      id, label: capability.publicLabelTr, href: capability.destination,
      variants: Object.freeze((rows.get(department.departmentId) ?? []).filter(row => row.categoryId === id).map(row => variant(row.label)).sort((a, b) => tr(a.label, b.label))),
    }))),
  })));
}

const parse = async <T>(root: string, relative: string): Promise<T> => JSON.parse(await readFile(path.join(root, relative), "utf8")) as T;
const assertUnique = (department: string, products: readonly ProductRow[]) => { if (new Set(products.map(row => row.identity)).size !== products.length) throw new Error(`${department}_DUPLICATE_ACTIVE_IDENTITY`); return products; };

async function applianceRows(root: string): Promise<readonly ProductRow[]> {
  const repository = createFileSystemAppliancesArtifactRepository(root);
  const washing = await loadActiveAppliancesAuthority({ repository });
  if (washing.status !== "READY") throw new Error(washing.reason);
  const rows: ProductRow[] = (washing.snapshot.catalog.products as readonly { productId: string; brandId: string; manufacturerModelIdentifier: string; productType: string; lifecycleState: string }[])
    .filter(product => product.lifecycleState === "CURRENT").map(product => ({ categoryId: product.productType, identity: product.productId, label: `${brandLabel(product.brandId)} ${product.manufacturerModelIdentifier}` }));
  const [dryer, refrigerator, ...bounded] = await Promise.all([loadActiveDryerAuthority(root), loadActiveRefrigeratorAuthority(root), ...BOUNDED_TYPES.map(type => loadActiveBoundedAuthority(root, type))]);
  for (const loaded of [dryer, refrigerator, ...bounded]) { if (loaded.status !== "READY") throw new Error(loaded.reason); rows.push(...loaded.snapshot.pack.products.map(product => ({ categoryId: loaded.snapshot.pack.productType, identity: product.productId, label: `${product.brand} ${product.model}` }))); }
  return assertUnique("APPLIANCES", rows);
}

export async function loadActiveCatalogDirectory(root = process.cwd()): Promise<readonly CatalogDirectoryDepartment[]> {
  const cars = await loadActiveCatalogSnapshot({ repository: createProductionCatalogReleaseRepository(root), now: new Date() });
  if (cars.status !== "READY") throw new Error(`CARS_${cars.reason}`);
  const electronics = loadActiveElectronicsRuntimeAuthority(root).catalog.products.map(product => ({ categoryId: product.categoryId, identity: product.exactProductId, label: `${product.manufacturer} ${product.modelCode}` }));
  const [babyPointer, mobilityPointer, toolsPointer, appliances] = await Promise.all([
    parse<{ release: string; activeCapabilities: string[] }>(root, "data/production/baby/strollers/active.json"),
    parse<{ release: string; authorityDigest: string; productCount: number; categories: string[] }>(root, "data/production/mobility/active/active.json"),
    parse<{ release: string; packageDigest: string }>(root, "data/production/cordless-drill/active.json"), applianceRows(root),
  ]);
  if (babyPointer.release !== STROLLER_CATALOG_RELEASE || !babyPointer.activeCapabilities.includes("STROLLER")) throw new Error("BABY_ACTIVE_POINTER_MISMATCH");
  if (mobilityPointer.authorityDigest !== MOBILITY_AUTHORITY_DIGEST || mobilityPointer.productCount !== MOBILITY_PRODUCTS.length || new Set(mobilityPointer.categories).size !== 3) throw new Error("MOBILITY_ACTIVE_POINTER_MISMATCH");
  if (toolsPointer.release !== CORDLESS_DRILL_RELEASE || toolsPointer.packageDigest !== CORDLESS_DRILL_PACKAGE_DIGEST) throw new Error("TOOLS_ACTIVE_POINTER_MISMATCH");
  const rows = new Map<string, readonly ProductRow[]>([
    ["CARS", assertUnique("CARS", cars.snapshot.variants.map(product => ({ categoryId: "NEW_CAR", identity: product.id, label: `${product.brand} ${product.model} ${product.trim}` })))],
    ["APPLIANCES", appliances], ["ELECTRONICS", assertUnique("ELECTRONICS", electronics)],
    ["BABY_AND_CHILD", assertUnique("BABY_AND_CHILD", STROLLER_PRODUCTS.map(product => ({ categoryId: "STROLLER", identity: product.exactProductId, label: `${product.manufacturer} ${product.model}` })))],
    ["MOBILITY", assertUnique("MOBILITY", MOBILITY_PRODUCTS.map(product => ({ categoryId: product.categoryId, identity: product.exactProductId, label: `${product.brand} ${product.model}` })))],
    ["TOOLS", assertUnique("TOOLS", CORDLESS_DRILL_PRODUCTS.map(product => ({ categoryId: "CORDLESS_DRILL", identity: product.exactProductId, label: `${product.brand} ${product.model}` })))],
  ]);
  return buildCatalogDirectory(ACTIVE_DEPARTMENT_REGISTRY, rows);
}
