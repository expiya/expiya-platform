import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { ACTIVE_DEPARTMENT_REGISTRY } from "@/features/platform/departmentRegistry";
import { STROLLER_PRODUCTS } from "@/features/baby/catalog";
import { MOBILITY_PRODUCTS } from "@/features/mobility/catalog";
import { CORDLESS_DRILL_PRODUCTS } from "@/features/cordless-drill/catalog";
import type { ActiveCatalogInventoryEntry } from "./domainPackAdmission";

type Json = Record<string, unknown>;
const readJson = async (file: string): Promise<Json> => JSON.parse(await readFile(file, "utf8")) as Json;
const ids = (value: unknown): string[] => Array.isArray(value) ? value.flatMap((row) => {
  if (!row || typeof row !== "object") return [];
  const item = row as Json;
  const id = item.exactProductId ?? item.exactOfferingId ?? item.productId ?? item.id;
  return typeof id === "string" ? [id] : [];
}) : [];

async function findAppliancesMembership(root: string): Promise<Map<string, string[]>> {
  const base = path.join(root, "data/production/appliances");
  const result = new Map<string, string[]>();
  for (const entry of await readdir(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const pointerFile = path.join(base, entry.name, "active.json");
    let pointer: Json;
    try { pointer = await readJson(pointerFile); } catch { continue; }
    if (pointer.lifecycle !== "ACTIVE" || typeof pointer.releaseVersion !== "string") continue;
    const releaseDir = path.join(base, entry.name, "releases", pointer.releaseVersion);
    let files: string[];
    try { files = (await readdir(releaseDir)).filter((file) => file.endsWith(".json")).sort(); } catch { continue; }
    let inferredCategoryId: string | null = null;
    let inferredProducts: string[] = [];
    for (const file of files) {
      const artifact = await readJson(path.join(releaseDir, file));
      const products = ids(artifact.products ?? artifact.offerings);
      const categoryId = typeof artifact.categoryId === "string" ? artifact.categoryId : typeof artifact.productType === "string" ? artifact.productType : null;
      if (categoryId && products.length) { result.set(categoryId, [...new Set(products)].sort()); break; }
      if (categoryId) inferredCategoryId = categoryId;
      if (products.length) inferredProducts = products;
    }
    if (inferredCategoryId && inferredProducts.length) result.set(inferredCategoryId, [...new Set(inferredProducts)].sort());
  }
  return result;
}

export async function buildActiveCatalogInventory(root: string): Promise<readonly ActiveCatalogInventoryEntry[]> {
  const [carsPointer, electronicsPointer, appliances] = await Promise.all([
    readJson(path.join(root, "data/production/catalog/active.json")),
    readJson(path.join(root, "data/production/electronics/runtime/active.json")),
    findAppliancesMembership(root),
  ]);
  const carsRelease = String(carsPointer.active_catalog_release_version);
  const cars = await readJson(path.join(root, `data/production/catalog/releases/v${carsRelease}/catalog.json`));
  const electronics = await readJson(path.join(root, String(electronicsPointer.catalogFile)));
  const electronicsCategories = new Map((electronics.categories as Json[]).map((category) => [String(category.categoryId), [...new Set((category.exactProductIds as string[]) ?? [])].sort()]));
  const mobility = new Map<string, string[]>();
  for (const product of MOBILITY_PRODUCTS) mobility.set(product.categoryId, [...(mobility.get(product.categoryId) ?? []), product.exactProductId]);
  const categoryIds = new Map<string, readonly string[]>([
    ["CARS:NEW_CAR", ((cars.records as Json[]) ?? []).flatMap((record) => {
      const variant = record.variant as Json | undefined;
      return typeof variant?.id === "string" ? [variant.id] : [];
    })],
    ["BABY_AND_CHILD:STROLLER", STROLLER_PRODUCTS.map((product) => product.exactProductId)],
    ["TOOLS:CORDLESS_DRILL", CORDLESS_DRILL_PRODUCTS.map((product) => product.exactProductId)],
    ...[...electronicsCategories].map(([categoryId, exactIds]) => [`ELECTRONICS:${categoryId}`, exactIds] as const),
    ...[...appliances].map(([categoryId, exactIds]) => [`APPLIANCES:${categoryId}`, exactIds] as const),
    ...[...mobility].map(([categoryId, exactIds]) => [`MOBILITY:${categoryId}`, exactIds] as const),
  ]);
  return Object.freeze(ACTIVE_DEPARTMENT_REGISTRY.flatMap((department) => Object.entries(department.capabilities)
    .filter(([, capability]) => capability.status === "ACTIVE")
    .map(([categoryId, capability]) => Object.freeze({
      departmentId: department.departmentId,
      categoryId,
      authorityBinding: capability.authorityBinding ?? "MISSING_AUTHORITY_BINDING",
      exactOfferingIds: Object.freeze([...(categoryIds.get(`${department.departmentId}:${categoryId}`) ?? [])].sort()),
    }))).sort((left, right) => `${left.departmentId}:${left.categoryId}`.localeCompare(`${right.departmentId}:${right.categoryId}`)));
}
