import { describe, expect, it } from "vitest";
import { DEMO_ROLES } from "./access";
import { DEMO_MEDIA_JOBS } from "./media";
import { DEMO_MVP_CHECKS } from "./readiness";

describe("used-cars final synthetic readiness", () => {
  it("requires MFA and denies exports for every dealer role", () => {
    expect(DEMO_ROLES.every(role => role.mfaRequired && !role.canExport)).toBe(true);
  });
  it("never exposes rejected or quarantined media as ready", () => {
    expect(DEMO_MEDIA_JOBS.filter(job => job.state !== "READY").every(job => job.state === "REJECTED" || job.state === "QUARANTINED")).toBe(true);
  });
  it("keeps real pilot data and production launch unauthorized", () => {
    expect(DEMO_MVP_CHECKS.find(item => item.area === "Gerçek pilot veri")?.ready).toBe(false);
    expect(DEMO_MVP_CHECKS.find(item => item.area === "Production launch")?.ready).toBe(false);
  });
});
