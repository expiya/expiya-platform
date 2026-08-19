import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EQUIPMENT_FEATURE_CODES } from "@/types/equipmentEvidence";

const root = process.cwd();
const work = path.join(root, "data/production/equipment-evidence/working/EE-PILOT-002/EE-PILOT-002-BATCH-002");
const read = <T>(name: string) => JSON.parse(readFileSync(path.join(work, name), "utf8")) as T;
const sha = (file: string) => `sha256:${createHash("sha256").update(readFileSync(path.join(root, file))).digest("hex")}`;

describe("EE-PILOT-002-BATCH-002 Tonale collection", () => {
  const ledger = read<Array<{ exactVariantId: string; featureCode: string; researchStatus: string; assertionId: string | null }>>("research-ledger.json");
  const assertions = read<Array<{ assertionId: string; exactVariantId: string; featureCode: string; availabilityStatus: string; verificationState: string; locator: { recordPath: string }; source: { sourceId: string } }>>("assertions.json");
  const rows = read<{ sourceRowsById: Record<string, unknown> }>("tonale-equipment.source-rows.v1.json");
  const mappings = read<Array<{ sourceRowId: string; featureCode: string; exactTrimApplicability: string; powertrainApplicability: string }>>("semantic-mappings.json");
  const sources = read<Array<{ sourceId: string; artifactReference: string; artifactSha256: string }>>("source-inventory.json");

  it("contains exactly two unique recommendation-eligible catalog IDs", () => {
    const manifest = read<{ exactVariantIds: string[] }>("batch-manifest.json");
    expect(manifest.exactVariantIds).toEqual(["54bbe431-a3c2-56d0-8177-cefdf0330bcb", "f12f742b-111c-54de-a006-61361fb1ae04"]);
    expect(new Set(manifest.exactVariantIds).size).toBe(2);
  });

  it("has 102 unique researched ledger rows and zero NOT_RESEARCHED", () => {
    expect(ledger).toHaveLength(102);
    expect(new Set(ledger.map((item) => `${item.exactVariantId}|${item.featureCode}`)).size).toBe(102);
    expect(ledger.every((item) => item.researchStatus !== "NOT_RESEARCHED")).toBe(true);
  });

  it("links assertions only from conclusive rows and leaves inconclusive rows assertion-free", () => {
    expect(ledger.filter((item) => item.researchStatus === "RESEARCHED_CONCLUSIVE")).toHaveLength(49);
    expect(ledger.filter((item) => item.researchStatus === "RESEARCHED_INCONCLUSIVE")).toHaveLength(53);
    expect(ledger.every((item) => item.researchStatus === "RESEARCHED_CONCLUSIVE" ? Boolean(item.assertionId) : item.assertionId === null)).toBe(true);
  });

  it("never converts unknown or silent absence into NOT_AVAILABLE", () => {
    expect(assertions).toHaveLength(49);
    expect(assertions.every((item) => item.availabilityStatus === "STANDARD" && item.verificationState === "PROVISIONAL")).toBe(true);
    expect(assertions.some((item) => item.availabilityStatus === "NOT_AVAILABLE" || item.availabilityStatus === "UNKNOWN")).toBe(false);
  });

  it("keeps extraction free of controlled feature codes and mappings separate", () => {
    const raw = readFileSync(path.join(work, "tonale-equipment.source-rows.v1.json"), "utf8");
    expect(EQUIPMENT_FEATURE_CODES.some((code) => raw.includes(code))).toBe(false);
    expect(mappings).toHaveLength(50);
    expect(mappings.every((item) => Boolean(rows.sourceRowsById[item.sourceRowId]))).toBe(true);
  });

  it("resolves every assertion locator to one stable source row", () => {
    expect(assertions.every((item) => Boolean(rows.sourceRowsById[item.locator.recordPath.split(".").at(-1)!]))).toBe(true);
    expect(new Set(assertions.map((item) => `${item.exactVariantId}|${item.featureCode}`)).size).toBe(49);
  });

  it("keeps trim and powertrain mapping scopes isolated", () => {
    expect(mappings.every((item) => (item.exactTrimApplicability === "Ti" && item.powertrainApplicability === "DIESEL_130_TCT6")
      || (item.exactTrimApplicability === "Speciale" && item.powertrainApplicability === "HYBRID_175_TCT7"))).toBe(true);
    expect(read<{ tiToSpecialeInheritance: number; specialeToTiInheritance: number; dieselToHybridInheritance: number; hybridToDieselInheritance: number }>("cross-trim-powertrain-isolation.json"))
      .toMatchObject({ tiToSpecialeInheritance: 0, specialeToTiInheritance: 0, dieselToHybridInheritance: 0, hybridToDieselInheritance: 0 });
  });

  it("does not use the historical Hybrid 160 brochure as assertion authority", () => {
    expect(assertions.every((item) => item.source.sourceId === "SRC-000087")).toBe(true);
    expect(sources.map((item) => item.sourceId)).toEqual(["SRC-000087", "SRC-000088"]);
  });

  it("verifies raw artifact checksums", () => {
    expect(sources.every((source) => sha(source.artifactReference) === source.artifactSha256)).toBe(true);
  });

  it("creates collector-only review-required events", () => {
    const events = read<Array<{ actorRole: string; toState: string }>>("review-events.json");
    expect(events).toHaveLength(102);
    expect(events.every((event) => event.actorRole === "EQUIPMENT_COLLECTOR_PRIMARY")).toBe(true);
    expect(events.some((event) => event.toState === "SECOND_REVIEW_PASSED")).toBe(false);
  });

  it("records no activation in the collection phase while allowing later authorized activation", () => {
    expect(readFileSync(path.join(work, "collection-report.md"), "utf8")).toContain("SHADOW_AND_EXPLANATION_DISABLED");
  });
});
