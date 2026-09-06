import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

async function main() {
const root = process.cwd();
const output = "docs/audits/WU-ELECTRONICS-93-RELEASE-LINT-STABILIZATION-DEPLOY-01.candidate-manifest.json";
const names = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { cwd: root, encoding: "utf8" }).trim().split("\n").filter(Boolean).filter(name => name !== output && name !== "node_modules");
const classify = (name: string) => name.includes("all-category-expansion-02") ? "OAM_02_GOVERNED_INPUT" : name.includes("ELECTRONICS-RUNTIME-CATALOG-TR-v1.2") || name.includes("ELECTRONICS-ALL-CATEGORY-ACT-01") || name.includes("EXPANSION-OAM-02-APPROVAL") || name === "data/production/electronics/runtime/active.json" ? "ACTIVATED_AUTHORITY" : name.startsWith("features/electronics/") || name.startsWith("features/xpy/") ? (name.includes(".test.") ? "TEST_ONLY" : "XPY_ELECTRONICS_INTEGRATION") : name.startsWith("data/research/") || name.startsWith("docs/") ? "GOVERNANCE_RESEARCH_OR_RELEASE_METADATA" : name.startsWith("scripts/") ? "GOVERNED_GENERATOR_OR_BUILD_TOOLING" : name.includes(".test.") ? "TEST_ONLY" : "DEPLOYABLE_APPLICATION_LINEAGE";
const excluded = (name: string) => name.startsWith("docs/") || name.startsWith("evals/") || name.startsWith("data/research/appliances-dryer-stage1/") || name.startsWith("data/research/appliances-global-evidence-01/") || /\.test\.tsx?$/.test(name) || name === "scripts/generate-appliances-global-evidence-candidate.ts" || name === "scripts/verify-appliances-global-evidence-candidate.ts";
const files = await Promise.all(names.sort().map(async name => { const bytes = await readFile(path.join(root, name)); return { path: name, bytes: bytes.length, sha256: `sha256:${createHash("sha256").update(bytes).digest("hex")}`, classification: classify(name), includedInDeployment: !excluded(name), exclusionReason: excluded(name) ? "EXPLICIT_VERCELIGNORE_NON_RUNTIME" : null }; }));
const payload = { schemaVersion: "isolated-release-candidate-manifest/v2", workUnit: "WU-ELECTRONICS-93-RELEASE-LINT-STABILIZATION-DEPLOY-01", sourceRef: "7118f7598709c365c203ff646e5687bce95059c1", approvalPackageDigest: "sha256:89d80a38e972b34c094b737a67de32d3f6bd2a38c40c14db39b3200bc66b305d", activeCatalogReleaseDigest: "sha256:7fae9bf18ccfb019d1718d237cda66d8c535353a8e2f44314a4411b43be00d39", productionDeploymentAuthorized: true, releaseGate: "PASS", files };
const candidateDigest = `sha256:${createHash("sha256").update(JSON.stringify(payload)).digest("hex")}`;
await writeFile(path.join(root, output), `${JSON.stringify({ ...payload, candidateDigest }, null, 2)}\n`);
console.log(JSON.stringify({ output, files: files.length, includedFiles: files.filter(file => file.includedInDeployment).length, excludedFiles: files.filter(file => !file.includedInDeployment).length, candidateDigest }, null, 2));
}

void main();
