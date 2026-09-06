import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const base = "data/research/owner-manual-evidence-v4/releases/v4.1.0-exact-tr-pilot-01";
const read = <T>(name: string): T => JSON.parse(readFileSync(`${base}/${name}`, "utf8")) as T;
const digest = (name: string): string => `sha256:${createHash("sha256").update(readFileSync(`${base}/${name}`)).digest("hex")}`;

describe("owner-manual exact-TR pilot 01 artifacts", () => {
  it("promotes only the five independently bridged DOLPHIN assertions", () => {
    const bridge = read<{ variants: Array<{ exactVariantId: string; decisions: Array<{ decision: string; authorityLevel?: string; exactVariantId: string; featureCode: string; polarity: string; manualSource?: { artifactSha256: string; locator: { physicalPdfPage: number; sectionHeading: string } }; exactApplicabilitySource?: { artifactSha256: string; locator: { row: string; column: string } }; reviewerAuthority?: { ownerActorId: string; independentReviewerActorId: string } }> }> }>("exact-tr-bridge-decisions.json");
    const exact = bridge.variants.flatMap((item) => item.decisions).filter((item) => item.decision === "EXACT_VARIANT_VERIFIED");
    expect(bridge.variants).toHaveLength(549);
    expect(exact).toHaveLength(5);
    expect(new Set(exact.map((item) => item.exactVariantId))).toEqual(new Set(["6cb56615-37ef-51a8-9202-a73e59d4e14b"]));
    expect(exact.filter((item) => item.polarity === "POSITIVE")).toHaveLength(4);
    expect(exact.filter((item) => item.polarity === "NEGATIVE")).toHaveLength(1);
    expect(exact.every((item) => item.authorityLevel === "EXACT_VARIANT_VERIFIED" && /^sha256:[a-f0-9]{64}$/u.test(item.manualSource?.artifactSha256 ?? "") && /^sha256:[a-f0-9]{64}$/u.test(item.exactApplicabilitySource?.artifactSha256 ?? "") && Boolean(item.manualSource?.locator.physicalPdfPage) && Boolean(item.manualSource?.locator.sectionHeading) && Boolean(item.exactApplicabilitySource?.locator.row) && Boolean(item.exactApplicabilitySource?.locator.column) && Boolean(item.reviewerAuthority?.ownerActorId) && Boolean(item.reviewerAuthority?.independentReviewerActorId))).toBe(true);
  });

  it("keeps all eight requested IDs auditable and exposes the invalid SEAL U EV ID", () => {
    const output = read<{ requestedTargetCount: number; dispositions: Array<{ requestedExactVariantId: string; disposition: string; closestLabelCatalogIdentity: null | { exactVariantId: string } }> }>("pilot-dispositions.json");
    expect(output.requestedTargetCount).toBe(8);
    expect(output.dispositions).toHaveLength(8);
    expect(new Set(output.dispositions.map((item) => item.requestedExactVariantId)).size).toBe(8);
    expect(output.dispositions.find((item) => item.requestedExactVariantId === "11382bb9-bf71-52bf-9de8-81b6828e13d2")).toMatchObject({ disposition: "INVALID_TARGET_ID_UNRESOLVED", closestLabelCatalogIdentity: { exactVariantId: "11382bb9-bf71-52bf-9d0b-33befe86da7e" } });
  });

  it("binds every release file by digest and regenerates byte-identically", () => {
    const manifest = read<{ files: Array<{ path: string; sha256: string }> }>("manifest.json");
    expect(manifest.files.every((item) => digest(item.path) === item.sha256)).toBe(true);
    const files = ["exact-tr-bridge-decisions.json", "pilot-dispositions.json", "coverage-report.json", "manifest.json"];
    const before = files.map(digest);
    execFileSync(process.execPath, ["--import", "tsx", "scripts/generate-owner-manual-exact-tr-pilot-01.ts"], { cwd: process.cwd() });
    expect(files.map(digest)).toEqual(before);
  });
});
