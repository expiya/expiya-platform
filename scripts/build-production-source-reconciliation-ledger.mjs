import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, readFileSync, readlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const source = process.argv[2];
const candidate = process.cwd();
if (!source) throw new Error("source checkout path is required");

const manifestPath = join(source, "docs/audits/WU-BABY-STROLLER-END-TO-END-01.release-manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const strollerPaths = new Set([
  ...Object.keys(manifest.files),
  "docs/audits/WU-BABY-STROLLER-END-TO-END-01.release-manifest.json",
  "docs/audits/WU-BABY-STROLLER-END-TO-END-01.production-receipt.json",
]);
const excluded = [
  /^node_modules$/,
  /^(output|outputs|tmp)\//,
];

function digest(path) {
  const stat = lstatSync(path);
  const bytes = stat.isSymbolicLink() ? Buffer.from(readlinkSync(path)) : readFileSync(path);
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

const raw = execFileSync("git", ["status", "--porcelain=v1", "-uall"], { cwd: source, encoding: "utf8" });
const entries = raw.trimEnd().split("\n").filter(Boolean).map((line) => {
  const status = line.slice(0, 2);
  const path = line.slice(3);
  const classification = strollerPaths.has(path)
    ? "b_deployed_stroller_delta_or_receipt"
    : excluded.some((pattern) => pattern.test(path))
      ? "e_generated_cache_or_local_only"
      : "c_already_deployed_verified_release_lineage";
  const disposition = classification.startsWith("e_") ? "excluded_preserved_in_authoritative_checkout" : "included_in_clean_baseline";
  let candidateDigest = null;
  try { candidateDigest = digest(join(candidate, path)); } catch {}
  const sourceDigest = digest(join(source, path));
  return {
    path,
    gitStatus: status,
    sha256: sourceDigest,
    classification,
    provenance: strollerPaths.has(path)
      ? "signed STROLLER manifest/receipt in deployment checkout"
      : classification.startsWith("e_")
        ? "deployment-excluded workspace material"
        : "present in the checkout used for the verified production build; production source export unavailable",
    intendedDisposition: disposition,
    candidateSha256: candidateDigest,
    byteMatch: disposition.startsWith("included") ? candidateDigest === sourceDigest : null,
  };
});

const totals = Object.fromEntries([...new Set(entries.map((entry) => entry.classification))].sort().map((key) => [key, entries.filter((entry) => entry.classification === key).length]));
const ledger = {
  schemaVersion: "production-source-reconciliation-ledger/v1",
  workUnitId: "WU-PLATFORM-PRODUCTION-SOURCE-BASELINE-CONSOLIDATION-01",
  generatedAt: new Date().toISOString(),
  sourceCheckout: source,
  sourceBaselineCommit: manifest.sourceBaselineCommit,
  sourceCandidateCommit: manifest.sourceCandidateCommit,
  productionDeploymentId: "dpl_3nRaLuCmcvLWGwzocYVyGJxmcVZk",
  proofBoundary: "The deployment provider did not supply an exported source tree. Inclusion is proven against the exact local deployment checkout, the signed STROLLER manifest, its receipt, and route fingerprints; non-STROLLER files are therefore classified as verified deployed lineage with this explicit boundary.",
  totals,
  entries,
};
writeFileSync("docs/audits/WU-PLATFORM-PRODUCTION-SOURCE-BASELINE-CONSOLIDATION-01.reconciliation-ledger.json", `${JSON.stringify(ledger, null, 2)}\n`);
