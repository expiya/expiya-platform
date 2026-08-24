import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const base = path.join(process.cwd(), "data/production/personas/evidence/expanded-regional-research/v3.9.0-2026-08-24");
const campaign = JSON.parse(readFileSync(path.join(base, "campaign-manifest.json"), "utf8")) as { scope: { familyCount: number; claimCount: number }; queue: Array<{ familyId: string; claimIds: string[]; status: string }>; activationPerformed: boolean; rankingMutationAllowed: boolean };
const waveRaw = readFileSync(path.join(base, "wave-01.json"), "utf8");
const wave = JSON.parse(waveRaw) as { families: Array<{ claims: Array<{ supportedSpan: string; ownerReviewRequired: boolean }>; regionalSource: { technicalAuthority: boolean; marketApplicability: string }; rankingMutationAllowed: boolean }>; activationPerformed: boolean };
const manifest = JSON.parse(readFileSync(path.join(base, "wave-01-manifest.json"), "utf8")) as { payloadSha256: string; researchedFamilyCount: number; researchedClaimCount: number; remainingFamilyCount: number; remainingClaimCount: number };

describe("expanded persona regional research campaign", () => {
  it("queues the complete 150-family, 353-claim scope", () => {
    expect(campaign.scope).toEqual({ familyCount: 150, claimCount: 353 });
    expect(new Set(campaign.queue.map((item) => item.familyId)).size).toBe(150);
  });

  it("starts wave 01 with 4 families and 22 sourced claim spans", () => {
    expect(wave.families).toHaveLength(4);
    expect(wave.families.flatMap((family) => family.claims)).toHaveLength(22);
    expect(wave.families.flatMap((family) => family.claims).every((claim) => claim.supportedSpan.length > 0 && claim.ownerReviewRequired)).toBe(true);
    expect(manifest.remainingFamilyCount).toBe(146);
    expect(manifest.remainingClaimCount).toBe(331);
  });

  it("keeps cross-market editorial evidence character-only and inactive", () => {
    expect(campaign.activationPerformed).toBe(false);
    expect(campaign.rankingMutationAllowed).toBe(false);
    expect(wave.activationPerformed).toBe(false);
    expect(wave.families.every((family) => !family.regionalSource.technicalAuthority && family.regionalSource.marketApplicability === "CHARACTER_ONLY_NO_EQUIPMENT_AUTHORITY" && !family.rankingMutationAllowed)).toBe(true);
  });

  it("checksum-binds wave 01", () => {
    expect(manifest.payloadSha256).toBe(`sha256:${createHash("sha256").update(waveRaw).digest("hex")}`);
    expect(manifest.researchedFamilyCount).toBe(4);
    expect(manifest.researchedClaimCount).toBe(22);
  });
});
