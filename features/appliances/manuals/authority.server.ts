import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { AppliancesProductType } from "../contracts";
import type { AdvisorManualKnowledge } from "../stageTwo/contracts";
import { sha256, validateRelease, type GovernedManualRelease, type L9Knowledge } from "./governedManuals";

const SAFE_RELEASE_ID = /^APPLIANCES-GOVERNED-EXACT-MANUAL-L9-TR-v[0-9.]+$/u;
const activePointerSchema = z.strictObject({
  schemaVersion: z.literal("appliances-governed-manual-active/v1"),
  releaseId: z.string().regex(SAFE_RELEASE_ID),
  releaseDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/u),
  manifestSha256: z.string().regex(/^sha256:[a-f0-9]{64}$/u),
  activatedAt: z.string().min(1),
  authority: z.literal("L9_ADVISOR_ONLY"),
  next: z.string().optional(),
});
const manifestSchema = z.object({
  schemaVersion: z.enum(["appliances-governed-manual-manifest/v1", "appliances-governed-manual-manifest/v2"]),
  releaseId: z.string().regex(SAFE_RELEASE_ID),
  lifecycle: z.literal("FROZEN_READ_ONLY"),
  releaseArtifactSha256: z.string().regex(/^sha256:[a-f0-9]{64}$/u),
  manualArtifacts: z.array(z.object({ manualId: z.string().min(1), artifactSha256: z.string(), textArtifactSha256: z.string() })),
  boundaries: z.object({ candidateEligibility: z.literal("NONE"), scoring: z.literal("NONE"), sufficiency: z.literal("NONE"), recommendation: z.literal("NONE"), y: z.literal("NONE"), absenceTreatment: z.literal("NEUTRAL"), crossProductPromotion: z.literal("FORBIDDEN") }).optional(),
}).passthrough();

export type GovernedManualAuthority = { readonly release: Readonly<GovernedManualRelease>; readonly activeReleaseId: string };
export type AuthorizedL9Projection = Readonly<{
  readOnly: true;
  authority: "EXPLAIN_ONLY";
  productId: string;
  categoryId: AppliancesProductType;
  catalogRelease: string;
  status: "AVAILABLE" | "MISSING" | "REJECTED";
  reason?: "PRODUCT_NOT_IN_RELEASE" | "CATEGORY_MISMATCH" | "CATALOG_RELEASE_MISMATCH" | "CONFIGURATION_MISMATCH";
  knowledge: readonly L9Knowledge[];
  forbidden: readonly string[];
}>;

export async function loadGovernedManualAuthority(root = process.cwd()): Promise<{ status: "READY"; authority: GovernedManualAuthority } | { status: "FAILED_CLOSED"; reason: string }> {
  try {
    const base = path.resolve(root, "data/production/appliances/manuals");
    const active = activePointerSchema.parse(JSON.parse(await readFile(path.join(base, "active.json"), "utf8")));
    const releaseDirectory = path.resolve(base, "releases", active.releaseId);
    if (!releaseDirectory.startsWith(`${path.resolve(base, "releases")}${path.sep}`)) throw new Error("UNSAFE_MANUAL_RELEASE_PATH");

    const manifestRaw = await readFile(path.join(releaseDirectory, "manifest.json"), "utf8");
    if (sha256(manifestRaw) !== active.manifestSha256) throw new Error("MANUAL_MANIFEST_DIGEST_MISMATCH");
    const manifest = manifestSchema.parse(JSON.parse(manifestRaw));
    if (manifest.releaseId !== active.releaseId) throw new Error("MANUAL_MANIFEST_RELEASE_MISMATCH");

    const releaseRaw = await readFile(path.join(releaseDirectory, "release.json"), "utf8");
    if (sha256(releaseRaw) !== manifest.releaseArtifactSha256) throw new Error("MANUAL_RELEASE_ARTIFACT_DIGEST_MISMATCH");
    const release = JSON.parse(releaseRaw) as GovernedManualRelease;
    if (release.releaseId !== active.releaseId || release.releaseDigest !== active.releaseDigest || release.lifecycle !== "FROZEN_READ_ONLY" || release.authority !== "L9_ADVISOR_ONLY") throw new Error("MANUAL_ACTIVE_RELEASE_BINDING_MISMATCH");

    const manifestManuals = new Map(manifest.manualArtifacts.map(item => [item.manualId, item] as const));
    if (manifestManuals.size !== release.manuals.length || release.manuals.some(manual => {
      const item = manifestManuals.get(manual.manualId);
      return !item || item.artifactSha256 !== manual.artifactSha256 || item.textArtifactSha256 !== manual.textArtifactSha256;
    })) throw new Error("MANUAL_ARTIFACT_MANIFEST_MISMATCH");

    const bytes = new Map<string, Uint8Array>();
    const texts = new Map<string, string>();
    for (const manual of release.manuals) {
      const bytesPath = path.resolve(releaseDirectory, manual.immutableBytesPath);
      const textPath = path.resolve(releaseDirectory, manual.immutableTextPath);
      if (!bytesPath.startsWith(`${releaseDirectory}${path.sep}`) || !textPath.startsWith(`${releaseDirectory}${path.sep}`)) throw new Error("UNSAFE_MANUAL_ARTIFACT_PATH");
      bytes.set(manual.immutableBytesPath, new Uint8Array(await readFile(bytesPath)));
      texts.set(manual.immutableTextPath, await readFile(textPath, "utf8"));
    }
    const issues = validateRelease(release, bytes, texts);
    if (issues.length) throw new Error(issues.join(","));
    return { status: "READY", authority: Object.freeze({ release: Object.freeze(release), activeReleaseId: active.releaseId }) };
  } catch (error) {
    return { status: "FAILED_CLOSED", reason: error instanceof Error ? error.message : "MANUAL_AUTHORITY_INVALID" };
  }
}

const forbidden = Object.freeze(["SELECT_CANDIDATES", "FILTER", "SCORE", "CHANGE_QUESTION", "CHANGE_SUFFICIENCY", "CHANGE_RECOMMENDATION", "CHANGE_Y", "CHANGE_COMPARISON", "CHANGE_PRICE", "CLAIM_OFFER", "AUTHORIZE_ACTION", "CROSS_PRODUCT_READ"]);

export function projectAuthorizedL9Knowledge(input: { readonly release: Readonly<GovernedManualRelease>; readonly authorizedProductId: string; readonly categoryId: AppliancesProductType; readonly catalogRelease: string; readonly configurationIdentity: string }): AuthorizedL9Projection {
  const base = { readOnly: true as const, authority: "EXPLAIN_ONLY" as const, productId: input.authorizedProductId, categoryId: input.categoryId, catalogRelease: input.catalogRelease, forbidden };
  const member = input.release.members.find(item => item.productId === input.authorizedProductId);
  if (!member) return Object.freeze({ ...base, status: "REJECTED" as const, reason: "PRODUCT_NOT_IN_RELEASE" as const, knowledge: Object.freeze([]) });
  if (member.categoryId !== input.categoryId) return Object.freeze({ ...base, status: "REJECTED" as const, reason: "CATEGORY_MISMATCH" as const, knowledge: Object.freeze([]) });
  if (member.parentRelease !== input.catalogRelease) return Object.freeze({ ...base, status: "REJECTED" as const, reason: "CATALOG_RELEASE_MISMATCH" as const, knowledge: Object.freeze([]) });
  if (member.configurationIdentity !== input.configurationIdentity) return Object.freeze({ ...base, status: "REJECTED" as const, reason: "CONFIGURATION_MISMATCH" as const, knowledge: Object.freeze([]) });
  const knowledge = Object.freeze(input.release.l9AdvisorKnowledge.filter(item => item.productId === input.authorizedProductId && item.categoryId === input.categoryId));
  return Object.freeze({ ...base, status: knowledge.length ? "AVAILABLE" as const : "MISSING" as const, knowledge });
}

const topicLabel: Readonly<Record<L9Knowledge["knowledgeKind"], string>> = Object.freeze({ SAFETY: "Güvenli kullanım", INSTALLATION: "Kurulum", MAINTENANCE: "Bakım ve temizlik", USAGE: "Kullanım", LIMITATION: "Kullanım sınırı" });

/** Public Advisor data intentionally omits release IDs, digests, manual IDs and internal authority labels. */
export function projectPublicAdvisorManualKnowledge(projection: AuthorizedL9Projection | undefined): AdvisorManualKnowledge {
  if (!projection || projection.status !== "AVAILABLE") return Object.freeze({ status: "NOT_AVAILABLE", entries: Object.freeze([]) });
  return Object.freeze({ status: "AVAILABLE", entries: Object.freeze(projection.knowledge.map(item => Object.freeze({ topic: topicLabel[item.knowledgeKind], statement: item.statement, sourceLabel: item.publicSourceDisclosure, pageNumber: item.locator.page, sectionLabel: item.locator.section, professionalInstallationRequired: item.professionalInstallationRequired }))) });
}
