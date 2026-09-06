import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { createFileSystemAppliancesArtifactRepository, loadActiveAppliancesAuthority, resetAppliancesAuthorityCacheForTests } from "@/features/appliances/authority/loader.server";
import { loadActiveBoundedAuthority } from "@/features/appliances/bounded/authority.server";
import { loadActiveDryerAuthority } from "@/features/appliances/dryer/authority.server";
import { loadActiveRefrigeratorAuthority } from "@/features/appliances/refrigerator/authority.server";
import { loadActiveMajorApplianceCatalogCategory, type MajorApplianceAdoptionCategory } from "./majorApplianceCatalogActivation.server";

const root = path.resolve(process.cwd());
const categories: readonly MajorApplianceAdoptionCategory[] = ["WASHING_MACHINE", "DRYER", "DISHWASHER", "REFRIGERATOR"];
const sha256 = (raw: string) => createHash("sha256").update(raw).digest("hex");

describe("approved major-appliance catalog activation", () => {
  it("loads the four active catalog memberships with exact counts and exclusion", async () => {
    const results = await Promise.all(categories.map((category) => loadActiveMajorApplianceCatalogCategory(root, category)));
    expect(results.map((result) => result.status)).toEqual(["READY", "READY", "READY", "READY"]);
    expect(results.map((result) => result.status === "READY" ? result.release.offerings.length : 0)).toEqual([29, 7, 7, 8]);
    expect(results.flatMap((result) => result.status === "READY" ? result.release.offerings.map((item) => item.offeringId) : [])).not.toContain("appliances:dishwasher:tr:teka:dfi-46700-ttm");
    expect(results.every((result) => result.status === "READY" && result.activation.review.every((item) => item.status === "PASS"))).toBe(true);
  });

  it("promotes the approved memberships into the four native decision authorities", async () => {
    resetAppliancesAuthorityCacheForTests();
    const [washing, dryer, dishwasher, refrigerator] = await Promise.all([
      loadActiveAppliancesAuthority({ repository: createFileSystemAppliancesArtifactRepository(root) }),
      loadActiveDryerAuthority(root),
      loadActiveBoundedAuthority(root, "DISHWASHER"),
      loadActiveRefrigeratorAuthority(root),
    ]);
    expect(washing.status).toBe("READY");
    expect(dryer.status).toBe("READY");
    expect(dishwasher.status).toBe("READY");
    expect(refrigerator.status).toBe("READY");
    if (washing.status !== "READY" || dryer.status !== "READY" || dishwasher.status !== "READY" || refrigerator.status !== "READY") return;
    expect([washing.snapshot.releaseVersion, dryer.snapshot.releaseVersion, dishwasher.snapshot.releaseVersion, refrigerator.snapshot.releaseVersion]).toEqual(["APPLIANCES-WM-TR-v0.2", "APPLIANCES-DRYER-TR-v0.2", "APPLIANCES-DISHWASHER-TR-v0.2", "APPLIANCES-REFRIGERATOR-TR-v0.2"]);
    expect([washing.snapshot.productIds.size, dryer.snapshot.pack.products.length, dishwasher.snapshot.pack.products.length, refrigerator.snapshot.pack.products.length]).toEqual([29, 7, 7, 8]);
  });

  it("binds every active pointer hash to the committed receipt", async () => {
    const receiptPath = path.join(root, "data/production/appliances/decision-adoption/governance/activation-events/APPLIANCES-MAJOR-DECISION-ACT-B3CB67E1DD00-2E76D621CE55/commit-receipt.json");
    const receipt = JSON.parse(await readFile(receiptPath, "utf8")) as { pointers: readonly { path: string; afterSha256: string }[] };
    for (const pointer of receipt.pointers) expect(sha256(await readFile(path.join(root, pointer.path), "utf8"))).toBe(pointer.afterSha256);
  });
});
