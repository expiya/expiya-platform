import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-SCALE-WAVE-001");
const load = (name: string) => JSON.parse(fs.readFileSync(path.join(root, name), "utf8"));

describe("EE-PILOT-002-SCALE-WAVE-001 terminal collection", () => {
  const manifest = load("wave-manifest.json");
  const reservations = load("source-id-reservations.json");
  const checkpoint = load("checkpoint.json");

  it("contains exactly the 24 remaining pilot variants once", () => {
    expect(manifest.remainingVariantCount).toBe(24);
    expect(new Set(manifest.variants.map((item: { exactVariantId: string }) => item.exactVariantId)).size).toBe(24);
    expect(manifest.microBatches.flatMap((item: { exactVariantIds: string[] }) => item.exactVariantIds).sort()).toEqual(manifest.variants.map((item: { exactVariantId: string }) => item.exactVariantId).sort());
  });

  it("keeps Alpine fail-closed and allocates sources centrally without collision", () => {
    const alpine = manifest.variants.filter((item: { canonicalBrand: string }) => item.canonicalBrand === "Alpine");
    expect(alpine).toHaveLength(2);
    expect(alpine.every((item: { disposition: string }) => item.disposition === "DEFERRED_IDENTITY_AUDIT")).toBe(true);
    const ids = reservations.reservations.map((item: { sourceId: string }) => item.sourceId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("terminalizes every variant and keeps runtime decision-neutral", () => {
    const terminal = load("terminal-dispositions.json");
    const aggregation = load("wave-aggregation-report.json");
    expect(checkpoint.state).toBe("TERMINAL_COLLECTION_READY_FOR_INDEPENDENT_REVIEW");
    expect(terminal.entries).toHaveLength(24);
    expect(new Set(terminal.entries.map((item: { exactVariantId: string }) => item.exactVariantId)).size).toBe(24);
    expect(aggregation.disposition).toBe("COMPLETED_WITH_DEFERRED_AND_AUDIT_BACKLOG");
    expect(aggregation.terminalDispositionCounts).toEqual({
      COLLECTION_COMPLETED: 3,
      CATALOG_EVIDENCE_AUDIT_REQUIRED: 16,
      DEFERRED_IDENTITY_AUDIT: 2,
      SOURCE_INSUFFICIENT: 3,
      COLLECTION_FAILED_SOURCE_ACCESS: 0,
    });
    expect(checkpoint.activePointerChanged).toBe(false);
    expect(checkpoint.decisionEngineEffect).toBe("ZERO");
    expect(checkpoint.immutableArtifactChecksums).toHaveLength(9);
    expect(checkpoint.inProgressMicroBatches).toHaveLength(0);
  });

  it("creates exactly 51 researched rows per completed variant and none for backlog", () => {
    const terminal = load("terminal-dispositions.json").entries as Array<{ exactVariantId: string; microBatchId: string; disposition: string }>;
    for (const entry of terminal) {
      const batchDir = path.join(root, "micro-batches", entry.microBatchId);
      const ledgerPath = path.join(batchDir, "research-ledger.json");
      if (entry.disposition === "COLLECTION_COMPLETED") {
        const rows = JSON.parse(fs.readFileSync(ledgerPath, "utf8")).entries;
        expect(rows).toHaveLength(51);
        expect(rows.every((row: { disposition: string }) => row.disposition !== "NOT_RESEARCHED")).toBe(true);
      } else {
        expect(fs.existsSync(ledgerPath)).toBe(false);
      }
    }
  });

  it("keeps raw extraction semantic-free and provisional evidence out of production", () => {
    const review = load("wave-independent-review-index.json");
    for (const batch of review.batches as Array<{ microBatchId: string }>) {
      const batchDir = path.join(root, "micro-batches", batch.microBatchId);
      const raw = fs.readFileSync(path.join(batchDir, "raw-source-rows.json"), "utf8");
      expect(raw).not.toContain("featureCode");
      expect(raw).not.toContain("availabilityStatus");
      const assertions = JSON.parse(fs.readFileSync(path.join(batchDir, "assertions.json"), "utf8")).assertions;
      expect(assertions.every((item: { verificationState: string }) => item.verificationState === "PROVISIONAL")).toBe(true);
      const associations = JSON.parse(fs.readFileSync(path.join(batchDir, "association-observations.json"), "utf8")).observations;
      expect(associations.every((item: { provisionKnowledge: string; decisionUse: string }) => item.provisionKnowledge === "PROVISION_UNRESOLVED" && item.decisionUse === "CONFIRMATION_REQUIRED")).toBe(true);
    }
  });

  it("preserves checkpoint input and active pointer hashes", () => {
    const integrity = load("resume-integrity-report.json");
    expect(integrity.status).toBe("PASSED");
    expect(integrity.manifestCanonicalChecksum).toBe("sha256:2c0ff1240b7f6a7324b7e1499a81b446629188683d96ece0db8656e1f3df77b8");
    expect(integrity.activePointerSha256).toBe("sha256:4ba2ec5ee76a09906092c19446a2b4846015ac5fd8d08708056b413a721ec8ed");
    expect(integrity.activeGeneratedModuleSha256).toBe("sha256:9c5971b14716bc503a649f99790655bdddc02f8513a6e13b6f198749f0166fea");
  });
});
