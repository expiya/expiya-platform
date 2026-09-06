import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { XpyCatalogRelease } from "@/features/xpy/catalog/contract";
import { loadActiveDryerRichnessRelease } from "@/features/xpy/catalog/dryerRichness.server";
import { decisionActivationPointerSchema, validateDecisionActivationPointer } from "../decisionAdoption/approval.server";
import { BLOCKED_TEKA_DISHWASHER_ID, isExpectedDecisionAdoptionBinding, MAJOR_APPLIANCE_DECISION_ADDITIONS, MAJOR_APPLIANCE_DECISION_RELEASES } from "../decisionAdoption/contract";

const sha = (raw: string) => createHash("sha256").update(raw).digest("hex");
const fact = z.object({ technology: z.literal("HEAT_PUMP"), function: z.literal("DRYING_ONLY"), installation: z.literal("FREESTANDING"), capacityKg: z.number().positive(), capacityContext: z.string(), widthMm: z.number().positive().nullable(), heightMm: z.number().positive().nullable(), depthMm: z.number().positive().nullable(), doorOpenDepthMm: z.number().positive().nullable(), noiseDbA: z.number().positive().nullable(), noiseContext: z.string().nullable(), noiseRegime: z.string().nullable() }).passthrough();
const product = z.object({ productId: z.string().min(1), brand: z.string().min(1), model: z.string().min(1), configurationIdentity: z.string().min(1), marketStatus: z.literal("CURRENT_TR"), technicalFacts: fact, capabilities: z.record(z.string(), z.unknown()), evidenceRefs: z.array(z.string()).min(1) });
const packSchema = z.object({ schemaVersion: z.literal("appliances-dryer-domain-pack/v1"), releaseVersion: z.enum(["APPLIANCES-DRYER-TR-v0.1", "APPLIANCES-DRYER-TR-v0.2"]), departmentId: z.literal("APPLIANCES"), productType: z.literal("DRYER"), market: z.literal("TR"), scope: z.object({ use: z.literal("HOUSEHOLD"), installation: z.literal("FREESTANDING"), technology: z.literal("HEAT_PUMP"), function: z.literal("DRYING_ONLY") }), governanceStatus: z.literal("APPROVED"), lifecycle: z.literal("FROZEN"), runtimeActive: z.literal(true), concepts: z.array(z.string()), selectionPolicy: z.object({ model: z.literal("HARD_COMPATIBILITY_THEN_EVIDENCE_BACKED_PARETO"), scores: z.literal(false), weights: z.literal(false), implicitTieBreak: z.literal(false) }).passthrough(), products: z.array(product).min(1), sources: z.array(z.object({ sourceId: z.string(), url: z.string().url(), accessedAt: z.string(), authority: z.string() }).passthrough()) }).passthrough();
const decisionPointerFields = { releaseVersion: z.enum(["APPLIANCES-DRYER-TR-v0.1", "APPLIANCES-DRYER-TR-v0.2"]), artifactSha256: z.string().regex(/^[a-f0-9]{64}$/u), lifecycle: z.literal("ACTIVE") } as const;
const pointerSchema = z.union([
  z.object({ schemaVersion: z.literal("appliances-dryer-active-pointer/v1"), ...decisionPointerFields }),
  z.object({ schemaVersion: z.literal("appliances-dryer-active-pointer/v2"), ...decisionPointerFields, richness: z.object({ releaseVersion: z.enum(["APPLIANCES-DRYER-CATALOG-RICHNESS-TR-v0.2", "APPLIANCES-DRYER-CATALOG-RICHNESS-TR-v0.3-candidate"]), releaseDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/u), catalogArtifactSha256: z.string().regex(/^[a-f0-9]{64}$/u), membershipDigest: z.string().regex(/^[a-f0-9]{64}$/u), activationManifest: z.string().min(1), activationManifestSha256: z.string().regex(/^[a-f0-9]{64}$/u), lifecycle: z.literal("ACTIVE_READ_ONLY") }) }),
  z.object({ schemaVersion: z.literal("appliances-dryer-active-pointer/v3"), ...decisionPointerFields, richness: z.object({ releaseVersion: z.literal("APPLIANCES-DRYER-CATALOG-RICHNESS-TR-v0.3-candidate"), releaseDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/u), catalogArtifactSha256: z.string().regex(/^[a-f0-9]{64}$/u), membershipDigest: z.string().regex(/^[a-f0-9]{64}$/u), activationManifest: z.string().min(1), activationManifestSha256: z.string().regex(/^[a-f0-9]{64}$/u), lifecycle: z.literal("ACTIVE_READ_ONLY") }), decisionActivation: decisionActivationPointerSchema }),
]);
export type DryerDomainPack = z.infer<typeof packSchema>;
export type DryerAuthority = { pack: Readonly<DryerDomainPack>; releaseVersion: string; catalogDigest: string; semanticDigest: string; conceptIds: ReadonlySet<string>; richnessRelease?: Readonly<XpyCatalogRelease>; richnessReleaseDigest?: string };

export async function loadActiveDryerAuthority(root: string): Promise<{ status: "READY"; snapshot: DryerAuthority } | { status: "FAILED_CLOSED"; reason: string }> {
  try {
    const base = path.join(root, "data/production/appliances/dryers");
    const pointer = pointerSchema.parse(JSON.parse(await readFile(path.join(base, "active.json"), "utf8")));
    const file = path.resolve(base, "releases", pointer.releaseVersion, "domain-pack.json");
    if (!file.startsWith(`${path.resolve(base, "releases")}${path.sep}`)) return { status: "FAILED_CLOSED", reason: "UNSAFE_RELEASE_PATH" };
    const raw = await readFile(file, "utf8");
    if (sha(raw) !== pointer.artifactSha256) return { status: "FAILED_CLOSED", reason: "ARTIFACT_DIGEST_MISMATCH" };
    const pack = packSchema.parse(JSON.parse(raw));
    const productIds = new Set(pack.products.map(item => item.productId));
    const sourceIds = new Set(pack.sources.map(item => item.sourceId));
    const expectedCount = pack.releaseVersion === MAJOR_APPLIANCE_DECISION_RELEASES.DRYER.successor ? MAJOR_APPLIANCE_DECISION_RELEASES.DRYER.expectedCount : 3;
    if (productIds.size !== expectedCount || pack.products.some(item => item.evidenceRefs.some(ref => !sourceIds.has(ref)))) return { status: "FAILED_CLOSED", reason: "EVIDENCE_BINDING_MISMATCH" };
    if (pack.releaseVersion === MAJOR_APPLIANCE_DECISION_RELEASES.DRYER.successor) {
      const adoption = (pack as Record<string, unknown>).decisionAdoption;
      if (pointer.schemaVersion !== "appliances-dryer-active-pointer/v3" || !await validateDecisionActivationPointer(root, pointer.decisionActivation) || !isExpectedDecisionAdoptionBinding("DRYER", adoption)) return { status: "FAILED_CLOSED", reason: "DECISION_ADOPTION_BINDING_MISMATCH" };
      const parentRaw = await readFile(path.join(base, "releases", MAJOR_APPLIANCE_DECISION_RELEASES.DRYER.parent, "domain-pack.json"), "utf8");
      const parentIds = (JSON.parse(parentRaw) as { products: { productId: string }[] }).products.map(item => item.productId);
      if (sha(parentRaw) !== MAJOR_APPLIANCE_DECISION_RELEASES.DRYER.parentArtifactSha256 || [...parentIds, ...MAJOR_APPLIANCE_DECISION_ADDITIONS.DRYER].some(id => !productIds.has(id)) || productIds.has(BLOCKED_TEKA_DISHWASHER_ID)) return { status: "FAILED_CLOSED", reason: "DECISION_MEMBERSHIP_MISMATCH" };
    }
    if (pack.products.some(item => item.technicalFacts.noiseDbA !== null && (item.technicalFacts.noiseContext !== "ACOUSTIC_AIRBORNE_NOISE" || item.technicalFacts.noiseRegime !== null))) return { status: "FAILED_CLOSED", reason: "NON_COMPARABLE_NOISE_PROMOTED" };
    const richness = pointer.schemaVersion !== "appliances-dryer-active-pointer/v1" ? await loadActiveDryerRichnessRelease(root) : undefined;
    if (richness?.status === "FAILED_CLOSED") return { status: "FAILED_CLOSED", reason: `DRYER_RICHNESS_${richness.reason}` };
    return { status: "READY", snapshot: Object.freeze({ pack: Object.freeze(pack), releaseVersion: pack.releaseVersion, catalogDigest: pointer.artifactSha256, semanticDigest: pointer.artifactSha256, conceptIds: new Set(pack.concepts), ...(richness?.status === "READY" ? { richnessRelease: richness.release, richnessReleaseDigest: richness.release.releaseDigest } : {}) }) };
  } catch { return { status: "FAILED_CLOSED", reason: "DRYER_AUTHORITY_INVALID" }; }
}
