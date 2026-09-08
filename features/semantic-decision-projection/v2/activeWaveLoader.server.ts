import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SemanticDecisionProjectionV2 } from "./contract";
import { validateSemanticDecisionProjection } from "./invariants";

const sha = (raw: string) => `sha256:${createHash("sha256").update(raw).digest("hex")}` as const;
const safe = /^data\/production\/semantic-decision-projection\/releases\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+\.json$/u;
export interface ActivePMaterialityWave {
  readonly releaseId: string;
  readonly releaseDigest: `sha256:${string}`;
  readonly projections: readonly SemanticDecisionProjectionV2[];
  readonly categories: readonly string[];
  readonly yAuthority: "UNCHANGED_NONE_GRANTED";
}
export type ActiveWaveLoadResult = { readonly status: "READY"; readonly wave: ActivePMaterialityWave } | { readonly status: "FAILED_CLOSED"; readonly reason: string };

export async function loadActivePMaterialityWave(root: string): Promise<ActiveWaveLoadResult> {
  try {
    const pointerRaw = await readFile(path.join(root, "data/production/semantic-decision-projection/active.json"), "utf8");
    const pointer = JSON.parse(pointerRaw) as { state?: string; releaseId?: string; releaseFile?: string; releaseSha256?: string; approvalDigest?: string; yAuthority?: string };
    if (pointer.state !== "ACTIVE_P" || !pointer.releaseId || !pointer.releaseFile || !safe.test(pointer.releaseFile) || !pointer.approvalDigest || pointer.yAuthority !== "UNCHANGED_NONE_GRANTED") return { status: "FAILED_CLOSED", reason: "ACTIVE_POINTER_INVALID" };
    const releaseRaw = await readFile(path.join(root, pointer.releaseFile), "utf8");
    if (sha(releaseRaw) !== pointer.releaseSha256) return { status: "FAILED_CLOSED", reason: "RELEASE_DIGEST_MISMATCH" };
    const release = JSON.parse(releaseRaw) as ActivePMaterialityWave;
    if (release.releaseId !== pointer.releaseId || !/^sha256:[a-f0-9]{64}$/u.test(release.releaseDigest) || release.yAuthority !== "UNCHANGED_NONE_GRANTED") return { status: "FAILED_CLOSED", reason: "RELEASE_IDENTITY_MISMATCH" };
    if (!Array.isArray(release.projections) || release.projections.flatMap(validateSemanticDecisionProjection).length) return { status: "FAILED_CLOSED", reason: "PROJECTION_INVARIANTS_FAILED" };
    const categories = [...new Set(release.projections.map((projection) => projection.identity.categoryId))].sort();
    if (JSON.stringify(categories) !== JSON.stringify(release.categories)) return { status: "FAILED_CLOSED", reason: "CATEGORY_MANIFEST_MISMATCH" };
    return { status: "READY", wave: Object.freeze(release) };
  } catch { return { status: "FAILED_CLOSED", reason: "ACTIVE_WAVE_UNAVAILABLE" }; }
}
