import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source=readFileSync("app/api/electronics/stage-two-handoff/route.ts","utf8");
describe("Electronics Stage Two handoff API boundary",()=>{
 it("requires explicit consent, exact digest identity and bounded request security",()=>{for(const term of ["explicitConsent:z.literal(true)","decisionFingerprint:z.string().regex", "verifySameOrigin", "enforceRateLimit", "readJsonWithLimit"])expect(source).toContain(term);});
 it("registers only after migration and key readiness and exposes no sales path",()=>{expect(source).toContain("registerElectronicsStageTwoAdapterIfReady({migrationReady:true,keyReady:true})");expect(source).toContain("electronicsStageTwoKeyReadiness");expect(source).not.toMatch(/stage.?3|sales|payment|order/iu);});
 it("returns only safe public handoff outcomes",()=>{expect(source).toContain("HANDOFF_ISSUED");expect(source).toContain("HANDOFF_UNAVAILABLE");expect(source).toContain("STAGE_TWO_READY");expect(source).toContain('"Cache-Control":"no-store"');});
});
