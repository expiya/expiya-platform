import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AppliancesAuthoritySnapshot } from "../authority/types";
import { APPLIANCES_CANDIDATE_SELECTION_RUNTIME_VERSION } from "../selection/types";
import type { WashingMachineQuestionPolicyArtifact } from "./questionPolicyAuthority";
import type { SufficiencyRecommendationPolicyArtifact } from "./sufficiencyRecommendationPolicyAuthority";
import type { WashingMachineCandidateSelectionPolicyArtifact } from "./candidateSelectionPolicyAuthority";
import { validateRecommendationConstructionPolicy, washingMachineRecommendationConstructionPolicyActivePointerSchema, type RecommendationConstructionPolicyFailure, type WashingMachineRecommendationConstructionPolicyArtifact } from "./recommendationConstructionPolicyAuthority";

const SAFE_POLICY_FILE = /^releases\/WASHING_MACHINE_RECOMMENDATION_CONSTRUCTION_POLICY-v\d+\.\d+\/policy\.json$/u;
export type RecommendationConstructionPolicyLoadFailure = "ACTIVE_POINTER_MISSING" | "ACTIVE_POINTER_INVALID" | "UNSAFE_POLICY_PATH" | "POLICY_MISSING" | "WRONG_ACTIVE_POLICY_IDENTITY" | RecommendationConstructionPolicyFailure;
export type RecommendationConstructionPolicyLoadResult = { readonly status: "READY"; readonly snapshot: Readonly<WashingMachineRecommendationConstructionPolicyArtifact> } | { readonly status: "FAILED_CLOSED"; readonly reason: RecommendationConstructionPolicyLoadFailure };
export interface RecommendationConstructionPolicyRepository { readActive(): Promise<string>; readPolicy(relativeFile: string): Promise<string> }
export function createFileSystemRecommendationConstructionPolicyRepository(repositoryRoot: string): RecommendationConstructionPolicyRepository {
  const root = path.join(repositoryRoot, "data/production/appliances/recommendation-construction-policy");
  return { readActive: () => readFile(path.join(root, "active.json"), "utf8"), readPolicy: (relativeFile) => { if (!SAFE_POLICY_FILE.test(relativeFile)) return Promise.reject(new TypeError("UNSAFE_POLICY_PATH")); const resolved = path.resolve(root, relativeFile); if (!resolved.startsWith(`${path.resolve(root, "releases")}${path.sep}`)) return Promise.reject(new TypeError("UNSAFE_POLICY_PATH")); return readFile(resolved, "utf8"); } };
}
const deepFreeze = <T>(value: T, seen = new WeakSet<object>()): T => { if (!value || typeof value !== "object" || seen.has(value as object)) return value; seen.add(value as object); for (const child of Object.values(value as object)) deepFreeze(child, seen); return Object.freeze(value); };
export async function loadActiveWashingMachineRecommendationConstructionPolicy(input: { repository: RecommendationConstructionPolicyRepository; authority: AppliancesAuthoritySnapshot; questionPolicy: WashingMachineQuestionPolicyArtifact; sufficiencyPolicy: SufficiencyRecommendationPolicyArtifact; selectionPolicy: WashingMachineCandidateSelectionPolicyArtifact }): Promise<RecommendationConstructionPolicyLoadResult> {
  let pointerRaw: string; try { pointerRaw = await input.repository.readActive(); } catch { return { status: "FAILED_CLOSED", reason: "ACTIVE_POINTER_MISSING" }; }
  let pointer; try { pointer = washingMachineRecommendationConstructionPolicyActivePointerSchema.parse(JSON.parse(pointerRaw)); } catch { return { status: "FAILED_CLOSED", reason: "ACTIVE_POINTER_INVALID" }; }
  if (!SAFE_POLICY_FILE.test(pointer.policyFile)) return { status: "FAILED_CLOSED", reason: "UNSAFE_POLICY_PATH" };
  let raw: string; try { raw = await input.repository.readPolicy(pointer.policyFile); } catch (error) { return { status: "FAILED_CLOSED", reason: error instanceof Error && error.message === "UNSAFE_POLICY_PATH" ? "UNSAFE_POLICY_PATH" : "POLICY_MISSING" }; }
  let artifact: unknown; try { artifact = JSON.parse(raw); } catch { return { status: "FAILED_CLOSED", reason: "POLICY_SCHEMA_INVALID" }; }
  const manifest = input.authority.manifest as Record<string, unknown>, catalog = input.authority.catalog as Record<string, unknown>;
  const checked = validateRecommendationConstructionPolicy({ artifact, expectedDigest: pointer.policyDigest, expected: {
    catalog: { release: input.authority.releaseVersion, releaseDigest: input.authority.catalogDigest, membershipDigest: String(catalog.membershipDigest), artifactSha256: String(manifest.catalogArtifactSha256) },
    semantic: { id: String(manifest.semanticRegistryVersion), digest: input.authority.semanticDigest }, question: { id: input.questionPolicy.payload.policyId, digest: input.questionPolicy.policyDigest }, sufficiency: { id: input.sufficiencyPolicy.payload.policyId, digest: input.sufficiencyPolicy.policyDigest }, selection: { id: input.selectionPolicy.payload.policyId, digest: input.selectionPolicy.policyDigest }, selectionRuntime: APPLIANCES_CANDIDATE_SELECTION_RUNTIME_VERSION,
  } });
  if (checked.status === "INVALID") return { status: "FAILED_CLOSED", reason: checked.reason };
  if (checked.artifact.payload.policyId !== pointer.policyId) return { status: "FAILED_CLOSED", reason: "WRONG_ACTIVE_POLICY_IDENTITY" };
  return { status: "READY", snapshot: deepFreeze(checked.artifact) };
}
