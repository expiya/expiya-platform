import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { XpyCatalogRelease } from "@/features/xpy/catalog/contract";
import { loadActiveRefrigeratorRichnessRelease } from "@/features/xpy/catalog/refrigeratorRichness.server";
import { decisionActivationPointerSchema, validateDecisionActivationPointer } from "../decisionAdoption/approval.server";
import { BLOCKED_TEKA_DISHWASHER_ID, isExpectedDecisionAdoptionBinding, MAJOR_APPLIANCE_DECISION_ADDITIONS, MAJOR_APPLIANCE_DECISION_RELEASES } from "../decisionAdoption/contract";

const sha = (raw: string) => createHash("sha256").update(raw).digest("hex");
const nullablePositive = z.number().positive().nullable();
const facts = z.object({
  installation: z.literal("FREESTANDING"), form: z.enum(["BOTTOM_FREEZER_COMBI", "FOUR_DOOR", "FRENCH_DOOR"]), frostTechnology: z.literal("NO_FROST"),
  widthMm: nullablePositive, heightMm: nullablePositive, depthMm: nullablePositive, doorOpenDepthMm: nullablePositive,
  requiredSideClearanceMm: nullablePositive, requiredRearClearanceMm: nullablePositive, requiredTopClearanceMm: nullablePositive,
  totalNetLitres: nullablePositive, freshFoodNetLitres: nullablePositive, chillerNetLitres: nullablePositive, freezerNetLitres: nullablePositive,
  grossLitres: nullablePositive, freezingCapacityKg24h: nullablePositive,
  energyClass: z.string().nullable(), annualEnergyKwh: nullablePositive, energyRegime: z.string().nullable(),
  noiseDbA: nullablePositive, noiseClass: z.string().nullable(), noiseRegime: z.string().nullable(),
  ambientMinC: z.number().nullable(), ambientMaxC: z.number().nullable(), dimensionConflict: z.boolean()
});
const product = z.object({
  productId: z.string().min(1), brand: z.string().min(1), model: z.string().min(1), configurationIdentity: z.string().min(1),
  marketStatus: z.enum(["CURRENT_TR", "TR_LISTED_AVAILABILITY_UNKNOWN"]), runtimeSelectable: z.boolean(), runtimeBlockers: z.array(z.string()),
  technicalFacts: facts, capabilities: z.record(z.string(), z.unknown()), claims: z.array(z.object({ statement: z.string(), authority: z.literal("MANUFACTURER_CLAIM"), outcomeGuarantee: z.literal(false) })),
  evidenceRefs: z.array(z.string()).min(1)
});
const packSchema = z.object({
  schemaVersion: z.literal("appliances-refrigerator-domain-pack/v1"), releaseVersion: z.enum(["APPLIANCES-REFRIGERATOR-TR-v0.1", "APPLIANCES-REFRIGERATOR-TR-v0.2"]),
  departmentId: z.literal("APPLIANCES"), productType: z.literal("REFRIGERATOR"), market: z.literal("TR"),
  scope: z.object({ use: z.literal("HOUSEHOLD"), installation: z.literal("FREESTANDING"), form: z.enum(["BOTTOM_FREEZER_COMBI", "MULTI_FORM_REFRIGERATOR"]), frostTechnology: z.literal("NO_FROST") }),
  governanceStatus: z.literal("APPROVED"), lifecycle: z.literal("FROZEN"), runtimeActive: z.literal(true), concepts: z.array(z.string()),
  comparability: z.object({ capacity: z.string(), energyRegime: z.string(), noiseRegime: z.string(), grossNetSubstitution: z.literal(false), unknownPolicy: z.string() }),
  selectionPolicy: z.object({ model: z.literal("HARD_COMPATIBILITY_THEN_EVIDENCE_BACKED_PARETO"), scores: z.literal(false), weights: z.literal(false), implicitTieBreak: z.literal(false) }),
  products: z.array(product).min(1), sources: z.array(z.object({ sourceId: z.string(), url: z.string().url(), accessedAt: z.string(), authority: z.string() }))
}).passthrough();
const pointerFields = { releaseVersion: z.enum(["APPLIANCES-REFRIGERATOR-TR-v0.1", "APPLIANCES-REFRIGERATOR-TR-v0.2"]), artifactSha256: z.string().regex(/^[a-f0-9]{64}$/u), lifecycle: z.literal("ACTIVE") } as const;
const richnessPointer = z.object({ releaseVersion: z.enum(["APPLIANCES-REFRIGERATOR-CATALOG-RICHNESS-TR-v0.2", "APPLIANCES-REFRIGERATOR-CATALOG-RICHNESS-TR-v0.3-candidate"]), releaseDigest: z.string(), catalogArtifactSha256: z.string(), membershipDigest: z.string(), activationManifest: z.string(), activationManifestSha256: z.string(), lifecycle: z.literal("ACTIVE_READ_ONLY") });
const pointerSchema = z.union([z.object({ schemaVersion: z.literal("appliances-refrigerator-active-pointer/v1"), ...pointerFields }), z.object({ schemaVersion: z.literal("appliances-refrigerator-active-pointer/v2"), ...pointerFields, richness: richnessPointer }), z.object({ schemaVersion: z.literal("appliances-refrigerator-active-pointer/v3"), ...pointerFields, richness: richnessPointer, decisionActivation: decisionActivationPointerSchema })]);
export type RefrigeratorDomainPack = z.infer<typeof packSchema>;
export type RefrigeratorProduct = RefrigeratorDomainPack["products"][number];
export type RefrigeratorAuthority = { pack: Readonly<RefrigeratorDomainPack>; releaseVersion: string; catalogDigest: string; semanticDigest: string; conceptIds: ReadonlySet<string>; richnessRelease?: Readonly<XpyCatalogRelease>; richnessReleaseDigest?: string };

export async function loadActiveRefrigeratorAuthority(root: string): Promise<{ status: "READY"; snapshot: RefrigeratorAuthority } | { status: "FAILED_CLOSED"; reason: string }> {
  try {
    const base = path.join(root, "data/production/appliances/refrigerators");
    const pointer = pointerSchema.parse(JSON.parse(await readFile(path.join(base, "active.json"), "utf8")));
    const file = path.resolve(base, "releases", pointer.releaseVersion, "domain-pack.json");
    if (!file.startsWith(`${path.resolve(base, "releases")}${path.sep}`)) return { status: "FAILED_CLOSED", reason: "UNSAFE_RELEASE_PATH" };
    const raw = await readFile(file, "utf8");
    if (sha(raw) !== pointer.artifactSha256) return { status: "FAILED_CLOSED", reason: "ARTIFACT_DIGEST_MISMATCH" };
    const pack = packSchema.parse(JSON.parse(raw));
    const productIds = new Set(pack.products.map(item => item.productId));
    const sourceIds = new Set(pack.sources.map(item => item.sourceId));
    const expectedCount = pack.releaseVersion === MAJOR_APPLIANCE_DECISION_RELEASES.REFRIGERATOR.successor ? MAJOR_APPLIANCE_DECISION_RELEASES.REFRIGERATOR.expectedCount : 4;
    if (productIds.size !== expectedCount || pack.products.some(item => item.evidenceRefs.some(ref => !sourceIds.has(ref)))) return { status: "FAILED_CLOSED", reason: "EVIDENCE_BINDING_MISMATCH" };
    if (pack.releaseVersion === MAJOR_APPLIANCE_DECISION_RELEASES.REFRIGERATOR.successor) {
      const adoption = (pack as Record<string, unknown>).decisionAdoption;
      if (pointer.schemaVersion !== "appliances-refrigerator-active-pointer/v3" || !await validateDecisionActivationPointer(root, pointer.decisionActivation) || !isExpectedDecisionAdoptionBinding("REFRIGERATOR", adoption)) return { status: "FAILED_CLOSED", reason: "DECISION_ADOPTION_BINDING_MISMATCH" };
      const parentRaw = await readFile(path.join(base, "releases", MAJOR_APPLIANCE_DECISION_RELEASES.REFRIGERATOR.parent, "domain-pack.json"), "utf8");
      const parentIds = (JSON.parse(parentRaw) as { products: { productId: string }[] }).products.map(item => item.productId);
      if (sha(parentRaw) !== MAJOR_APPLIANCE_DECISION_RELEASES.REFRIGERATOR.parentArtifactSha256 || [...parentIds, ...MAJOR_APPLIANCE_DECISION_ADDITIONS.REFRIGERATOR].some(id => !productIds.has(id)) || productIds.has(BLOCKED_TEKA_DISHWASHER_ID)) return { status: "FAILED_CLOSED", reason: "DECISION_MEMBERSHIP_MISMATCH" };
    }
    if (pack.products.some(item => item.runtimeSelectable && (item.technicalFacts.dimensionConflict || item.runtimeBlockers.length))) return { status: "FAILED_CLOSED", reason: "INCOMPLETE_PRODUCT_SELECTABLE" };
    if (pack.products.some(item => item.technicalFacts.grossLitres !== null && item.technicalFacts.totalNetLitres === item.technicalFacts.grossLitres)) return { status: "FAILED_CLOSED", reason: "GROSS_NET_CONFLATION" };
    if (pack.products.some(item => item.runtimeSelectable && ![null, "TR_2019_2016_AB"].includes(item.technicalFacts.energyRegime) || item.runtimeSelectable && ![null, "TR_2019_2016_AB"].includes(item.technicalFacts.noiseRegime))) return { status: "FAILED_CLOSED", reason: "NON_COMPARABLE_PERFORMANCE_PROMOTED" };
    const richness = pointer.schemaVersion !== "appliances-refrigerator-active-pointer/v1" ? await loadActiveRefrigeratorRichnessRelease(root) : undefined;
    if (richness?.status === "FAILED_CLOSED") return { status: "FAILED_CLOSED", reason: `REFRIGERATOR_RICHNESS_${richness.reason}` };
    return { status: "READY", snapshot: Object.freeze({ pack: Object.freeze(pack), releaseVersion: pack.releaseVersion, catalogDigest: pointer.artifactSha256, semanticDigest: pointer.artifactSha256, conceptIds: new Set(pack.concepts), ...(richness?.status === "READY" ? { richnessRelease: richness.release, richnessReleaseDigest: richness.release.releaseDigest } : {}) }) };
  } catch { return { status: "FAILED_CLOSED", reason: "REFRIGERATOR_AUTHORITY_INVALID" }; }
}
