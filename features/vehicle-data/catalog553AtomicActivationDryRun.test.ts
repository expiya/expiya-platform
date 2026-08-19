/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const base = path.join(root, "data/production/catalog/release-candidates/v0.55.3/activation-dry-run");
const read = <T>(file: string) => JSON.parse(readFileSync(path.join(base, file), "utf8")) as T;
const sha = (file: string) => `sha256:${createHash("sha256").update(readFileSync(path.join(base, file))).digest("hex")}`;

describe("catalog v0.55.3 atomic activation dry-run", () => {
  it("binds four final releases to one catalog fingerprint with real proposed bytes", () => {
    const plan = read<any>("atomic-activation-plan.json");
    expect(plan.status).toBe("READY_FOR_EXPLICIT_ATOMIC_ACTIVATION_APPROVAL");
    expect(plan.catalogRecordCount).toBe(549);
    expect(plan.quarantineExactVariantIds).toHaveLength(17);
    expect(plan.unauthorizedAliasCount).toBe(0);
    expect(plan.automaticEquipmentTransferCount).toBe(0);
    for (const layer of ["catalog", "dailyLife", "persona", "equipment"]) {
      expect(sha(`proposed-pointers/${layer}.json`)).toBe(plan.proposedPointerChecksums[layer]);
      expect(sha(`proposed-generated-modules/${layer}.ts.txt`)).toBe(plan.proposedGeneratedModuleChecksums[layer]);
    }
  });

  it("proves every proposed pointer and generated module differs from current active bytes", () => {
    const matrix = read<Record<string, any>>("pointer-module-checksum-matrix.json");
    for (const item of Object.values(matrix)) {
      expect(item.pointerByteIdentical).toBe(false);
      expect(item.moduleByteIdentical).toBe(false);
      expect(item.currentPointerChecksum).not.toBe(item.proposedPointerChecksum);
      expect(item.currentGeneratedModuleChecksum).not.toBe(item.proposedGeneratedModuleChecksum);
      expect(item.compatibleCatalogRelease).toBe("v0.55.3");
    }
  });

  it("contains no quarantined equipment reference and keeps decision authority disabled", () => {
    const audit = read<any>("equipment-quarantine-reference-audit.json");
    expect(audit).toMatchObject({ quarantineCount: 17, referenceCount: 0, removedHistoricalExactIdsCorrect: true, automaticTransferCount: 0, decisionAuthority: "SHADOW_AND_EXPLANATION_DISABLED" });
  });
});
