import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MOBILITY_PRODUCTS } from "./catalog";
import { MOBILITY_AUTHORITY_DIGEST } from "./domainPack";

const manifest = JSON.parse(readFileSync("data/production/mobility/release-candidates/MOBILITY-TR-v0.1-owner-review-candidate/manifest.json", "utf8"));
const active = JSON.parse(readFileSync("data/production/mobility/active/active.json", "utf8"));
const approvals = readFileSync("data/production/mobility/approvals.jsonl", "utf8").trim().split("\n").map(line => JSON.parse(line));

describe("Mobility authority activation", () => {
  it("pins only the approved ten-product authority", () => {
    expect(manifest.authorityDigest).toBe(MOBILITY_AUTHORITY_DIGEST);
    expect(active.authorityDigest).toBe(MOBILITY_AUTHORITY_DIGEST);
    expect(active.release).toBe(manifest.release);
    expect(manifest.exactProductIds).toEqual(MOBILITY_PRODUCTS.map(product => product.exactProductId));
    expect(new Set(manifest.exactProductIds).size).toBe(10);
    expect(manifest.categoryCounts).toEqual({ ELECTRIC_SCOOTER: 3, ELECTRIC_BICYCLE: 3, BICYCLE: 4 });
    expect(manifest.reconciliation.silentDrops).toBe(0);
  });

  it("has an append-only exact owner authorization and bounded Persona state", () => {
    expect(approvals.at(-1)).toMatchObject({ release: manifest.release, authorityDigest: manifest.authorityDigest });
    expect(approvals.at(-1).authorization).toContain("non-force push");
    expect(manifest.personaBoundaryDigest).toBe("sha256:85bb241c57b995c95b7118b022c2272cf541a189c7c6f451839e7d7a7ba67610");
    expect(manifest.personaState).toBe("INTENDED_POSITIONING_SHADOW_ONLY");
  });
});
