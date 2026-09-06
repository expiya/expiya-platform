import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ELECTRONICS_WAVE_4_RELEASE_DIGEST, validateWave4SmartHomeHubRepair, type Wave4SmartHomeHubRepairRelease } from "./wave4SmartHomeHubRepair";
const root = process.cwd(); const release = JSON.parse(readFileSync(path.join(root, "data/production/electronics/wave-4-repair/releases/ELECTRONICS-WAVE-4-SMART-HOME-HUB-REPAIR-TR-v0.1/repair-release.json"), "utf8")) as Wave4SmartHomeHubRepairRelease;
describe("Wave 4 smart-home-hub evidence repair", () => {
  it("validates and makes every Wave 4 category ready", () => { expect(validateWave4SmartHomeHubRepair(release)).toEqual([]); expect(release.categoryReadiness).toHaveLength(6); expect(release.categoryReadiness.every(row => row.readiness === "DECISION_EVIDENCE_READY")).toBe(true); });
  it("pins the immutable Wave 4 parent", () => { const raw = readFileSync(path.join(root, "data/production/electronics/wave-4-evidence/releases/ELECTRONICS-WAVE-4-EVIDENCE-TR-v0.1/evidence-release.json")); expect(`sha256:${createHash("sha256").update(raw).digest("hex")}`).toBe(ELECTRONICS_WAVE_4_RELEASE_DIGEST); });
  it("adds an independently applicable exact standalone hub", () => { const hubs = release.products.filter(row => row.categoryId === "SMART_HOME_HUB"); expect(hubs).toHaveLength(2); expect(new Set(hubs.map(row => row.manufacturer)).size).toBe(2); expect(hubs).toContainEqual(expect.objectContaining({ modelCode: "EAN 8719514342620 / 12NC 929001180642" })); });
  it("binds protocol, capacity, dependency, privacy, subscription, components and safety", () => { const keys = release.comparativeFacts.filter(row => row.exactProductId === release.hubRepair.addedExactProductId).map(row => row.key); expect(keys).toEqual(expect.arrayContaining(["product_type", "protocols", "device_capacity", "account_cloud_local_dependency", "subscription", "privacy_data", "power_safety", "included_components"])); });
  it("checksum-binds the official manual", () => { const manual = release.manuals.find(row => row.exactProductId === release.hubRepair.addedExactProductId)!; expect(`sha256:${createHash("sha256").update(readFileSync(path.join(root, manual.localPath))).digest("hex")}`).toBe(manual.sha256); });
  it("proves non-hub records unchanged and keeps all effects non-active", () => { expect(release.unchangedProof.parentSubsetDigest).toBe(release.unchangedProof.childSubsetDigest); expect(release.boundaries).toMatchObject({ activationPerformed: false, registryChanged: false, runtimeChanged: false, databaseChanged: false, pointerChanged: false, deploymentPerformed: false }); });
});
