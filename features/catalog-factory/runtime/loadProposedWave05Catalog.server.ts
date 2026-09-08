import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const PREFLIGHT_ROOT = "outputs/catalog-factory-wave05-exact3-108-activation-readiness-01";
const ACTIVE_POINTER = "data/production/catalog-factory/active.json";
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)])) : value;
const sha = (value: unknown) => createHash("sha256").update(Buffer.isBuffer(value) || typeof value === "string" ? value : JSON.stringify(canonical(value))).digest("hex");
const read = (root: string, file: string) => JSON.parse(readFileSync(path.join(root, file), "utf8"));

/** Candidate-only adapter. It is intentionally not imported by the active runtime. */
export function loadProposedWave05CatalogFactoryView(root = process.cwd()) {
  const pointerBytes = readFileSync(path.join(root, ACTIVE_POINTER));
  const preflight = read(root, `${PREFLIGHT_ROOT}/PREFLIGHT.json`);
  const release = read(root, `${PREFLIGHT_ROOT}/IMMUTABLE_RELEASE.json`);
  const overlay = read(root, `${PREFLIGHT_ROOT}/PROPOSED_OVERLAY.json`);
  const releaseCore = { ...release }; delete releaseCore.releaseDigest;
  const overlayCore = { ...overlay }; delete overlayCore.overlayDigest;
  if (preflight.status !== "PASS_PREPARED_NOT_AUTHORIZED_NOT_EXECUTED" || sha(pointerBytes) !== preflight.bindings.currentPointerSha256 || sha(releaseCore) !== release.releaseDigest || sha(overlayCore) !== overlay.overlayDigest) throw new Error("WAVE05_CANDIDATE_DIGEST_CHAIN_INVALID");
  if (overlay.totals.active !== 111 || overlay.totals.additions !== 31 || release.products.length !== 3 || overlay.readiness.P_READY || overlay.readiness.Y_READY) throw new Error("WAVE05_CANDIDATE_BOUNDARY_INVALID");
  const products = overlay.categories.flatMap((category: Record<string, unknown>) => (category.additions as Record<string, unknown>[]).map(product => Object.freeze({ ...product, categoryId: category.categoryId, departmentId: "ELECTRONICS" })));
  if (products.length !== 31 || new Set(products.map((product: Record<string, unknown>) => product.exactProductId)).size !== 31) throw new Error("WAVE05_CANDIDATE_MEMBERSHIP_INVALID");
  return Object.freeze({ releaseId: release.releaseId, state: "CANDIDATE_ONLY_NOT_RUNTIME_BOUND" as const, totals: Object.freeze({ before: 80, additions: 31, active: 111 }), products: Object.freeze(products), readiness: Object.freeze({ P_READY: false, Y_READY: false }) });
}
