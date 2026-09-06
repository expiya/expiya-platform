import { describe, expect, it } from "vitest";
import { loadActiveBoundedAuthority } from "./bounded/authority.server";
import { interpretBoundedCategory } from "./bounded/categoryRegistry";
import { planBoundedQuestion } from "./bounded/questionPlanner";

describe("split air conditioner exact-pair authority", () => {
  it("loads three exact paired systems across two manufacturers", async () => {
    const loaded = await loadActiveBoundedAuthority(process.cwd(), "SPLIT_AIR_CONDITIONER");
    expect(loaded.status).toBe("READY");
    if (loaded.status !== "READY") return;
    expect(loaded.snapshot.pack.products).toHaveLength(3);
    expect(new Set(loaded.snapshot.pack.products.map(product => product.brand)).size).toBe(2);
    for (const product of loaded.snapshot.pack.products) {
      expect(product.technicalFacts.indoorUnitModel).toMatch(/\S/u);
      expect(product.technicalFacts.outdoorUnitModel).toMatch(/\S/u);
      expect(product.configurationIdentity).toMatch(/indoor|iç|exact/iu);
      expect(product.configurationIdentity).toMatch(/outdoor|dış/iu);
    }
  });

  it("fails closed until the exact-pair professional site gate is explicitly satisfied", () => {
    const blocked = planBoundedQuestion({ type: "SPLIT_AIR_CONDITIONER", activeEvents: [], candidateCount: 3, unknownHardEvidence: [], askedQuestionKeys: [] });
    expect(blocked).toMatchObject({ kind: "CLARIFY", questionKey: "appliances.split-ac.site-verification" });
    expect(blocked?.message).toMatch(/ısı yükü|elektrik|soğutucu|boru|drenaj|montaj/iu);

    const vague = interpretBoundedCategory("SPLIT_AIR_CONDITIONER", "12000 BTU salonuma yeter", undefined, 0);
    expect(vague.proposals).toHaveLength(0);
    const verified = interpretBoundedCategory("SPLIT_AIR_CONDITIONER", "Yetkili iklimlendirme uzmanı exact çift için oda ısı yükünü, elektrik ve topraklamayı, soğutucu boru hattını, drenajı ve montajı doğruladı", undefined, 0);
    expect(verified.proposals).toContainEqual(expect.objectContaining({ conceptId: "PROFESSIONAL_SITE_VERIFICATION", strength: "HARD", decisionUse: "HARD_FILTER" }));
  });
});
