import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "@/data/production/equipment-public-explanation-integration/releases/v0.1.0-catalog-v0.55.4-2026-08-20/manifest.json";
import policy from "@/data/production/equipment-public-explanation-integration/releases/v0.1.0-catalog-v0.55.4-2026-08-20/policy.json";
import event from "@/data/production/equipment-public-explanation-integration/releases/v0.1.0-catalog-v0.55.4-2026-08-20/materialization-event.json";
import authorization from "@/data/production/equipment-public-explanation-integration/authorization-events/EPEI-MATAUTH-7F0477181DFAEDFE91E5.json";

const root = process.cwd(); const shaFile = (relative: string) => `sha256:${createHash("sha256").update(readFileSync(`${root}/${relative}`)).digest("hex")}`;
describe("immutable Equipment integration materialization", () => {
  it("binds candidate, owner authorization, production manifest and materialization event", () => {
    expect(shaFile("data/production/equipment-public-explanation-integration/release-candidates/v0.1.0-catalog-v0.55.4-2026-08-20-candidate/policy.json")).toBe("sha256:5967f73efb1e86bb61d27919b07ad6506d6525136baa56983ca8b1f4c4caaedc");
    expect(shaFile("data/production/equipment-public-explanation-integration/releases/v0.1.0-catalog-v0.55.4-2026-08-20/policy.json")).toBe("sha256:7fb57a834501114eafe16f6ea601aceea8e5cc4a51994129ff0161f1867ad1e5");
    expect(shaFile("data/production/equipment-public-explanation-integration/releases/v0.1.0-catalog-v0.55.4-2026-08-20/manifest.json")).toBe("sha256:b563f9b2577a2f5fe3ffcd34637aa7ae6fbada913ed63cd8b6f3f5abefdb33ff");
    expect(manifest.materializationAuthorizationEventId).toBe(authorization.authorizationEventId); expect(event.authorizationEventChecksum).toBe(`sha256:${createHash("sha256").update(JSON.stringify(authorization, null, 2) + "\n").digest("hex")}`);
  });
  it("remains materialized-not-active with zero decision effect", () => {
    expect(policy).toMatchObject({ state: "MATERIALIZED_NOT_ACTIVE", publicEffect: "DISABLED_NOT_ACTIVE", decisionEngineEffect: "ZERO" });
    expect(manifest).toMatchObject({ state: "MATERIALIZED_NOT_ACTIVE", activationPerformed: false, publicEffect: "DISABLED_NOT_ACTIVE" });
    expect(event).toMatchObject({ activationPerformed: false, publicEffect: "DISABLED_NOT_ACTIVE" });
  });
});
