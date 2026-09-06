import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateXpyCatalogRelease, xpyCatalogReleaseDigest } from "../xpy/catalog/validation";
import type { XpyCatalogRelease } from "../xpy/catalog/contract";
import { ELECTRONICS_CATEGORY_IDS } from "./architectureBaseline";
import { validateElectronicsRichness, type ElectronicsRichnessGovernance } from "./catalogRichness";

const root = path.join(process.cwd(), "data/production/electronics/richness/releases/ELECTRONICS-CATALOG-RICHNESS-TR-v0.1");
const read = <T>(name: string) => JSON.parse(readFileSync(path.join(root, name), "utf8")) as T;
const sha = (name: string) => `sha256:${createHash("sha256").update(readFileSync(path.join(root, name))).digest("hex")}`;

describe("Electronics catalog richness candidate release", () => {
  const release = read<XpyCatalogRelease>("catalog-release.json");
  const governance = read<ElectronicsRichnessGovernance>("governance-report.json");

  it("passes the shared XPY catalog validator", () => { expect(validateXpyCatalogRelease(release)).toEqual([]); expect(release.releaseDigest).toBe(xpyCatalogReleaseDigest(release)); });
  it("keeps all 16 identities and all 24 readiness rows governed", () => expect(validateElectronicsRichness(release, governance, ELECTRONICS_CATEGORY_IDS)).toEqual([]));
  it("keeps technical, interpretation, persona, experience, manual and commerce authority isolated", () => {
    expect(release.layers.l1Facts.every(row => !release.layers.l6DailyLifeInterpretations.some(item => item.text === String(row.value)))).toBe(true);
    expect(release.layers.l5PersonaSignals.every(row => row.decisionUse === "NONE" && row.directCandidateEffect === "NONE")).toBe(true);
    expect(release.layers.l7ExperienceRules).toEqual([]);
    expect(release.layers.l9AdvisorKnowledge).toEqual([]);
    expect(governance.authority).toMatchObject({ commerceYEffect: "NONE", mediaYEffect: "NONE", manualYEffect: "NONE", activationPerformed: false });
  });
  it("binds every generated artifact to the manifest", () => {
    const manifest = read<{ artifacts: Record<string, string>; activation: { performed: boolean } }>("manifest.json");
    for (const [name, digest] of Object.entries(manifest.artifacts)) expect(sha(name)).toBe(digest);
    expect(manifest.activation.performed).toBe(false);
  });
});
