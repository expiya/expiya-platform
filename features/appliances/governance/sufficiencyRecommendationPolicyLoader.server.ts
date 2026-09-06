import { readFile } from "node:fs/promises";
import path from "node:path";
import type { AppliancesAuthoritySnapshot } from "../authority/types";
import { APPLIANCES_CANDIDATE_EVALUATION_POLICY_VERSION } from "../candidate/types";
import { APPLIANCES_QUESTION_SELECTION_POLICY_VERSION } from "../planner/types";
import type { WashingMachineQuestionPolicyArtifact } from "./questionPolicyAuthority";
import { sufficiencyRecommendationPolicyActivePointerSchema, validateSufficiencyRecommendationPolicy, type SufficiencyRecommendationPolicyArtifact, type SufficiencyRecommendationPolicyFailure } from "./sufficiencyRecommendationPolicyAuthority";

const SAFE_POLICY_FILE = /^releases\/WASHING_MACHINE_SUFFICIENCY_RECOMMENDATION_ENTRY_POLICY-v\d+\.\d+\/policy\.json$/u;
export type SufficiencyRecommendationPolicyLoadFailure = "ACTIVE_POINTER_MISSING"|"UNSAFE_POLICY_PATH"|"POLICY_MISSING"|SufficiencyRecommendationPolicyFailure;
export type SufficiencyRecommendationPolicyLoadResult = { readonly status: "READY"; readonly snapshot: Readonly<SufficiencyRecommendationPolicyArtifact> } | { readonly status: "FAILED_CLOSED"; readonly reason: SufficiencyRecommendationPolicyLoadFailure };
export interface SufficiencyRecommendationPolicyRepository { readActive(): Promise<string>; readPolicy(relativeFile: string): Promise<string> }
export function createFileSystemSufficiencyRecommendationPolicyRepository(repositoryRoot: string): SufficiencyRecommendationPolicyRepository { const root = path.join(repositoryRoot, "data/production/appliances/sufficiency-recommendation-entry"); return { readActive: () => readFile(path.join(root, "active.json"), "utf8"), readPolicy: (relativeFile) => { if (!SAFE_POLICY_FILE.test(relativeFile)) return Promise.reject(new TypeError("UNSAFE_POLICY_PATH")); const resolved = path.resolve(root, relativeFile); if (!resolved.startsWith(`${path.resolve(root, "releases")}${path.sep}`)) return Promise.reject(new TypeError("UNSAFE_POLICY_PATH")); return readFile(resolved, "utf8"); } }; }
const deepFreeze = <T>(value: T, seen = new WeakSet<object>()): T => { if (!value || typeof value !== "object" || seen.has(value as object)) return value; seen.add(value as object); for (const child of Object.values(value as object)) deepFreeze(child, seen); return Object.freeze(value); };
export async function loadActiveWashingMachineSufficiencyRecommendationPolicy(input: { repository: SufficiencyRecommendationPolicyRepository; authority: AppliancesAuthoritySnapshot; questionPolicy: WashingMachineQuestionPolicyArtifact }): Promise<SufficiencyRecommendationPolicyLoadResult> {
  let pointerRaw: string; try { pointerRaw = await input.repository.readActive(); } catch { return { status: "FAILED_CLOSED", reason: "ACTIVE_POINTER_MISSING" }; }
  let pointer; try { pointer = sufficiencyRecommendationPolicyActivePointerSchema.parse(JSON.parse(pointerRaw)); } catch { return { status: "FAILED_CLOSED", reason: "INCOMPATIBLE_AUTHORITY" }; }
  if (!SAFE_POLICY_FILE.test(pointer.policyFile)) return { status: "FAILED_CLOSED", reason: "UNSAFE_POLICY_PATH" };
  let raw: string; try { raw = await input.repository.readPolicy(pointer.policyFile); } catch (error) { return { status: "FAILED_CLOSED", reason: error instanceof Error && error.message === "UNSAFE_POLICY_PATH" ? "UNSAFE_POLICY_PATH" : "POLICY_MISSING" }; }
  let artifact: unknown; try { artifact = JSON.parse(raw); } catch { return { status: "FAILED_CLOSED", reason: "POLICY_SCHEMA_INVALID" }; }
  const manifest = input.authority.manifest as Record<string, unknown>, catalog = input.authority.catalog as Record<string, unknown>;
  const checked = validateSufficiencyRecommendationPolicy({ artifact, expectedDigest: pointer.policyDigest, catalogRelease: input.authority.releaseVersion, catalogDigest: input.authority.catalogDigest, membershipDigest: String(catalog.membershipDigest), catalogArtifactSha256: String(manifest.catalogArtifactSha256), semanticVersion: String(manifest.semanticRegistryVersion), semanticDigest: input.authority.semanticDigest, questionPolicyId: input.questionPolicy.payload.policyId, questionPolicyDigest: input.questionPolicy.policyDigest, candidatePolicy: APPLIANCES_CANDIDATE_EVALUATION_POLICY_VERSION, plannerPolicy: APPLIANCES_QUESTION_SELECTION_POLICY_VERSION });
  if (checked.status === "INVALID") return { status: "FAILED_CLOSED", reason: checked.reason }; return { status: "READY", snapshot: deepFreeze(checked.artifact) };
}
