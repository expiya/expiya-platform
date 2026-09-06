import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { digestElectronicsPolicy, validateElectronicsCategoryPolicy, type ElectronicsCategoryPolicyArtifact } from "./categoryPolicy";

export function loadActiveElectronicsCategoryPolicy(root = process.cwd()): ElectronicsCategoryPolicyArtifact {
  const pointerPath = path.join(root, "data/production/electronics/category-policy/active.json");
  const pointer = JSON.parse(readFileSync(pointerPath, "utf8")) as { lifecycle?: string; policyDigest?: string; policyFile?: string; artifactSha256?: string; authorityOnly?: boolean; approvalEventFile?: string; approvalEventDigest?: string; approvalArtifactSha256?: string; manifestFile?: string; manifestSha256?: string };
  if (pointer.lifecycle !== "ACTIVE" || pointer.authorityOnly !== true || typeof pointer.policyFile !== "string" || typeof pointer.policyDigest !== "string" || typeof pointer.artifactSha256 !== "string" || typeof pointer.approvalEventFile !== "string" || typeof pointer.approvalEventDigest !== "string" || typeof pointer.approvalArtifactSha256 !== "string" || typeof pointer.manifestFile !== "string" || typeof pointer.manifestSha256 !== "string") throw new Error("ELECTRONICS_POLICY_POINTER_INVALID");
  const raw = readFileSync(path.join(root, pointer.policyFile)); const fileDigest = `sha256:${createHash("sha256").update(raw).digest("hex")}`;
  if (fileDigest !== pointer.artifactSha256) throw new Error("ELECTRONICS_POLICY_ARTIFACT_CHECKSUM_MISMATCH");
  const artifact = JSON.parse(raw.toString("utf8")) as ElectronicsCategoryPolicyArtifact; const issues = validateElectronicsCategoryPolicy(artifact);
  if (issues.length || artifact.policyDigest !== pointer.policyDigest) throw new Error(`ELECTRONICS_POLICY_FAIL_CLOSED:${issues.join(",") || "POINTER_DIGEST_MISMATCH"}`);
  const approvalRaw = readFileSync(path.join(root, pointer.approvalEventFile)); if (`sha256:${createHash("sha256").update(approvalRaw).digest("hex")}` !== pointer.approvalArtifactSha256) throw new Error("ELECTRONICS_POLICY_APPROVAL_CHECKSUM_MISMATCH");
  const approval = JSON.parse(approvalRaw.toString("utf8")) as Record<string, unknown>; const { approvalEventDigest, ...approvalCore } = approval; if (approvalEventDigest !== pointer.approvalEventDigest || approvalEventDigest !== digestElectronicsPolicy(approvalCore) || approval.policyDigest !== artifact.policyDigest || approval.runtimeOrPublicActivationAuthorized !== false) throw new Error("ELECTRONICS_POLICY_APPROVAL_INVALID");
  const manifestRaw = readFileSync(path.join(root, pointer.manifestFile)); if (`sha256:${createHash("sha256").update(manifestRaw).digest("hex")}` !== pointer.manifestSha256) throw new Error("ELECTRONICS_POLICY_MANIFEST_CHECKSUM_MISMATCH");
  const manifest = JSON.parse(manifestRaw.toString("utf8")) as { policyDigest?: string }; if (manifest.policyDigest !== artifact.policyDigest) throw new Error("ELECTRONICS_POLICY_MANIFEST_INVALID");
  for (const evidence of artifact.payload.evidenceChain) { const evidenceRaw = readFileSync(path.join(root, evidence.artifactPath)); if (`sha256:${createHash("sha256").update(evidenceRaw).digest("hex")}` !== evidence.releaseDigest) throw new Error(`ELECTRONICS_POLICY_EVIDENCE_MISMATCH:${evidence.wave}`); }
  return artifact;
}
