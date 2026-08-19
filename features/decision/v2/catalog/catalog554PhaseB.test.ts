import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isStrictRfc3339Timestamp } from "../schema/strictRfc3339Timestamp";

const ROOT = "data/production/catalog/governance/v0.55.4";
const read = <T>(file: string) => JSON.parse(readFileSync(file, "utf8")) as T;
const sha = (value: Buffer | string) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

describe("Catalog v0.55.4 Phase B materialization", () => {
  const staging = read<{ staging_at: string }>(`${ROOT}/phase-a/staging-event.json`);
  const approval = read<{ approval_at: string; effective_as_of: string; manifestChecksum: string }>(`${ROOT}/phase-b/owner-approval-event.json`);
  const catalogRaw = readFileSync("data/production/catalog/releases/v0.55.4/catalog.json");
  const catalog = JSON.parse(catalogRaw.toString()) as { effective_as_of: string; records: Array<{ variant: { id: string } }> };
  const result = read<{ catalogFingerprint: string; activePointerChanged: boolean; activationPerformed: boolean }>(`${ROOT}/phase-b/phase-b-result.json`);

  it("records a checksum-bound append-only owner approval at a real UTC instant", () => {
    expect(approval.manifestChecksum).toBe("sha256:91abb8b0cab5c0d5f0744540a003b3563fe8f338216ee73044a6807aea561837");
    expect(isStrictRfc3339Timestamp(approval.approval_at)).toBe(true);
    expect(approval.approval_at.endsWith("Z")).toBe(true);
    expect(Date.parse(approval.approval_at)).toBeGreaterThanOrEqual(Date.parse(staging.staging_at));
  });

  it("materializes 549 records with staging <= approval == effective", () => {
    expect(catalog.records).toHaveLength(549);
    expect(catalog.effective_as_of).toBe(approval.approval_at);
    expect(approval.effective_as_of).toBe(approval.approval_at);
    expect(result.catalogFingerprint).toBe(sha(catalogRaw));
  });

  it("prepares three fingerprint-compatible candidates without activating", () => {
    const simulation = read<{ catalogFingerprint: string; layers: Record<string, { compatible: boolean }>; activePointersChanged: boolean }>(`${ROOT}/phase-b/runtime-preactivation-simulation.json`);
    expect(simulation.catalogFingerprint).toBe(result.catalogFingerprint);
    expect(Object.values(simulation.layers).every((layer) => layer.compatible)).toBe(true);
    expect(simulation.activePointersChanged).toBe(false);
    expect(result).toMatchObject({ activePointerChanged: false, activationPerformed: false });
  });

  it("records that Phase B itself did not create activation or overwrite pointers", () => {
    expect(existsSync(`${ROOT}/phase-b/activation-event.json`)).toBe(false);
    expect(result).toMatchObject({ activePointerChanged: false, activationPerformed: false });
    expect(read<{ activePointersChanged: boolean }>(`${ROOT}/phase-b/runtime-preactivation-simulation.json`).activePointersChanged).toBe(false);
  });
});
