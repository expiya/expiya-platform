import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const base = "data/research/electronics/stage2-signed-handoff-authority-01";
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;

describe("Electronics Stage 2 immutable owner-review package", () => {
  it("has one reproducible eligible digest and a matching aggregate approval sentence", () => {
    const packageRaw = JSON.parse(readFileSync(`${base}/owner-review-package.json`, "utf8")) as Record<string, unknown>, digest = packageRaw.packageDigest;
    delete packageRaw.packageDigest;
    const actual = `sha256:${createHash("sha256").update(JSON.stringify(canonical(packageRaw))).digest("hex")}`;
    expect(actual).toBe(digest);
    const sentence = readFileSync(`${base}/approval-sentence.txt`, "utf8");
    expect(sentence).toContain(String(digest));
    expect(sentence).toContain("24-category adapter registration");
  });

  it("contains no secret and keeps migration, registration, pointer and deployment inactive", () => {
    const text = readFileSync(`${base}/owner-review-package.json`, "utf8");
    expect(text).not.toMatch(/"secret"\s*:/u);
    expect(JSON.parse(text)).toMatchObject({ runtimeRegistered: false, secretCreated: false, databaseMigration: { neededBeforeActivation: true, applied: false }, boundaries: { activePointerChanged: false, deployed: false, stageThreeActive: false, salesActive: false, paymentActive: false } });
  });
});
