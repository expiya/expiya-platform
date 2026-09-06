import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const BASE = "data/production/equipment-daily-life/releases/v1.1.0-high-materiality-exact-applications-catalog-v0.55.4-2026-09-04";
const file = (relative: string) => path.join(ROOT, relative);
const raw = (relative: string) => readFileSync(file(relative));
const read = <T>(relative: string): T => JSON.parse(raw(relative).toString("utf8")) as T;
const sha = (value: Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

describe("high-materiality equipment daily-life immutable artifacts", () => {
  it("binds every release file to its manifest and checksum inventory", () => {
    const manifest = read<{ payloadSha256: string; definitionCount: number; exactApplicationCount: number; activationPerformed: boolean; activePointerUpdated: boolean; decisionEngineEffect: string; files: Array<{ path: string; sha256: string }> }>(`${BASE}/manifest.json`);
    const checksums = read<Record<string, string>>(`${BASE}/checksums.json`);
    expect(manifest).toMatchObject({ definitionCount: 6, exactApplicationCount: 20, activationPerformed: false, activePointerUpdated: false, decisionEngineEffect: "ZERO" });
    for (const item of manifest.files) expect(sha(raw(`${BASE}/${item.path}`))).toBe(item.sha256);
    for (const [name, digest] of Object.entries(checksums)) expect(sha(raw(`${BASE}/${name}`))).toBe(digest);
    expect(manifest.payloadSha256).toBe(checksums["equipment-daily-life-exact-applications.json"]);
  });

  it("preserves parent releases byte-for-byte and leaves active pointers unchanged", () => {
    expect(sha(raw("data/production/equipment-daily-life/releases/v1.0.1-catalog-v0.55.4-2026-08-20/equipment-daily-life.json"))).toBe("sha256:c2f60f9534d9695c36d9f7075cd288eb52a5050d5a43629081a30a38ac937233");
    expect(sha(raw("data/production/equipment-evidence/releases/v1.6.0-owner-reviewed-manual-bridges-catalog-v0.55.4-2026-09-04/equipment-evidence.json"))).toBe("sha256:a251a2cdd92d4af1b62ca71bf3cb608f0ae47bce1faf7fe3503922a04ab1b533");
    expect(sha(raw("data/research/owner-manual-evidence-v4/releases/v4.3.0-equipment-owner-review-01/exact-tr-bridge-decisions.json"))).toBe("sha256:128de70455ce3584bf39ce5a05d34959e2ac712814b22518d860df5c93159f2a");
    const active = read<{ activeEquipmentDailyLifeRelease: string; compatibleEquipmentRelease: string }>("data/production/equipment-daily-life/active.json");
    expect(active).toMatchObject({ activeEquipmentDailyLifeRelease: "v1.0.1-catalog-v0.55.4-2026-08-20", compatibleEquipmentRelease: "v1.5.5-catalog-v0.55.4-2026-08-20" });
  });

  it("records measured coverage, exact negative neutrality, Hilux exclusion, and zero Y influence", () => {
    const coverage = read<{ counts: Record<string, number>; perVariant: Array<{ exactVariantId: string; mappedAfter: number; unresolvedSupportedAfter: number; exactManualSupportedApplications: number; advisor: { after: { status: string } }; comparison: { after: { status: string } } }> }>(`${BASE}/coverage-report.json`);
    const neutrality = read<{ decisionUse: string; directCandidateEffect: string; yEffects: Record<string, string>; runtimeFilesChanged: string[]; activePointersChanged: string[] }>(`${BASE}/decision-neutrality.json`);
    expect(coverage.counts).toMatchObject({ exactApplicationsBefore: 0, exactApplicationsAfter: 20, positiveApplications: 19, negativeApplications: 1, exactManualSupportedApplications: 15, exactEquipmentOnlyApplications: 5, neutralUnknownPriorityCells: 10, globalTechnicalToDailyLifeGapAssignmentsBefore: 8646, globalTechnicalToDailyLifeGapAssignmentsAfter: 8646, advisorReadyVariantsBefore: 0, advisorReadyVariantsAfter: 0, comparisonReadyVariantsBefore: 0, comparisonReadyVariantsAfter: 0 });
    expect(coverage.perVariant.every((item) => item.mappedAfter > 0 && item.unresolvedSupportedAfter === 0 && item.advisor.after.status === "PARTIAL" && item.comparison.after.status === "PARTIAL")).toBe(true);
    expect(coverage.perVariant.find((item) => item.exactVariantId === "cf63bfb6-d503-5669-9799-6593f4b3f96b")?.exactManualSupportedApplications).toBe(0);
    expect(neutrality).toMatchObject({ decisionUse: "NONE", directCandidateEffect: "NONE", runtimeFilesChanged: [], activePointersChanged: [], yEffects: { eligibility: "ZERO", filtering: "ZERO", ranking: "ZERO", sufficiency: "ZERO", selection: "ZERO", authorization: "ZERO", decisionFingerprint: "UNCHANGED" } });
  });

  it("replays deterministically", () => {
    const names = ["equipment-daily-life-exact-applications.json", "read-projection.json", "coverage-report.json", "review-binding.json", "decision-neutrality.json", "manifest.json", "checksums.json"];
    const before = new Map(names.map((name) => [name, sha(raw(`${BASE}/${name}`))]));
    execFileSync(process.execPath, ["--import", "tsx", "scripts/generate-high-materiality-equipment-daily-life-01.ts"], { cwd: ROOT, stdio: "pipe" });
    for (const name of names) expect(sha(raw(`${BASE}/${name}`))).toBe(before.get(name));
  });
});

