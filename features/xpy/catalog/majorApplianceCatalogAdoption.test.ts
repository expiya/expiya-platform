import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { MAJOR_APPLIANCE_ADOPTION_ROOT, loadMajorApplianceCatalogAdoptionCandidate } from "./majorApplianceCatalogAdoption.server";

describe("major appliance catalog adoption candidate", () => {
  it("refuses to reuse the pre-activation package after governed pointer activation", async () => {
    const loaded = await loadMajorApplianceCatalogAdoptionCandidate(path.resolve(process.cwd()));
    expect(loaded).toEqual({ status: "FAILED_CLOSED", reason: "ACTIVE_OR_CANDIDATE_DIGEST_MISMATCH" });
  });

  it("fails closed when a checksum-bound approval artifact is altered", async () => {
    const sourceRoot = path.resolve(process.cwd());
    const tempRoot = await mkdtemp(path.join(tmpdir(), "xpy-major-appliance-adoption-"));
    try {
      const batchRelativePath = path.join(MAJOR_APPLIANCE_ADOPTION_ROOT, "batch-manifest.json");
      const batchRaw = await readFile(path.join(sourceRoot, batchRelativePath), "utf8");
      const batch = JSON.parse(batchRaw) as { aggregateArtifacts: Record<string, { path: string }> };
      const pathsToCopy = [batchRelativePath, ...Object.values(batch.aggregateArtifacts).map((item) => item.path)];
      for (const relativePath of pathsToCopy) {
        const destination = path.join(tempRoot, relativePath);
        await mkdir(path.dirname(destination), { recursive: true });
        await writeFile(destination, await readFile(path.join(sourceRoot, relativePath), "utf8"), "utf8");
      }
      const approvalPath = path.join(tempRoot, batch.aggregateArtifacts.approvalPackage.path);
      await writeFile(approvalPath, `${await readFile(approvalPath, "utf8")}\n`, "utf8");

      await expect(loadMajorApplianceCatalogAdoptionCandidate(tempRoot)).resolves.toEqual({
        status: "FAILED_CLOSED",
        reason: "AGGREGATE_ARTIFACT_DIGEST_MISMATCH",
      });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
