import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ELECTRONICS_WAVE_3_CATEGORY_IDS, ELECTRONICS_WAVE_3_PARENT_DIGEST, validateWave3EvidenceClosure, type Wave3EvidenceRelease } from "./wave3EvidenceClosure";

const root = process.cwd(); const release = JSON.parse(readFileSync(path.join(root, "data/production/electronics/wave-3-evidence/releases/ELECTRONICS-WAVE-3-EVIDENCE-TR-v0.1/evidence-release.json"), "utf8")) as Wave3EvidenceRelease;
describe("Wave 3 evidence closure", () => {
  it("covers the exact baseline Wave 3 categories", () => { expect(ELECTRONICS_WAVE_3_CATEGORY_IDS).toEqual(["WIFI_ROUTER_MESH", "NETWORK_ATTACHED_STORAGE", "EXTERNAL_STORAGE", "PRINTER", "WEBCAM", "COMPUTER_AUDIO"]); expect(validateWave3EvidenceClosure(release)).toEqual([]); });
  it("provides exact diverse comparable candidates", () => expect(release.categoryReadiness.every(row => row.candidateCount >= 2 && row.manufacturerCount >= 2 && row.comparableFieldCount >= 4 && row.readiness === "DECISION_EVIDENCE_READY")).toBe(true));
  it("binds local manuals by checksum", () => { for (const manual of release.manuals) expect(`sha256:${createHash("sha256").update(readFileSync(path.join(root, manual.localPath))).digest("hex")}`).toBe(manual.sha256); });
  it("pins the immutable Wave 2 repair parent", () => { const raw = readFileSync(path.join(root, "data/production/electronics/wave-2-repair/releases/ELECTRONICS-WAVE-2-GAME-CONSOLE-IDENTITY-REPAIR-TR-v0.1/repair-release.json")); expect(`sha256:${createHash("sha256").update(raw).digest("hex")}`).toBe(ELECTRONICS_WAVE_3_PARENT_DIGEST); });
  it("keeps unknowns, L10, media, and activation neutral", () => { expect(release.unknownsAndConflicts.every(row => row.effect === "NEUTRAL_FAIL_CLOSED")).toBe(true); expect(release.boundaries).toMatchObject({ l7Experience: "ABSENT", mediaImported: false, l10YEffect: "NONE", amazonStatusEffect: "NONE", activationPerformed: false }); });
});
