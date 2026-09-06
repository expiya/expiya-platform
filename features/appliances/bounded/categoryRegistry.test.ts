import { describe, expect, it } from "vitest";
import { interpretBoundedCategory, validateBoundedProposals } from "./categoryRegistry";

describe("bounded category semantic registries", () => {
  it.each([
    ["DISHWASHER", "Kalabalık sofralar oluyor", "CAPACITY"],
    ["DISHWASHER", "Plastikler ıslak kalmasın", "AUTO_OPEN_DRY"],
    ["VACUUM", "Priz değiştirmek istemiyorum", "RADIUS"],
    ["VACUUM", "Alerjim var", "HEPA"],
    ["ROBOT_VACUUM", "Koltuk altına girsin", "ROBOT_HEIGHT"],
    ["ROBOT_VACUUM", "Halıda paspası kaldırsın", "MOP_LIFT"],
  ] as const)("maps %s language through its registry", (type, message, conceptId) => {
    expect(interpretBoundedCategory(type, message, undefined, 2).proposals).toEqual(
      expect.arrayContaining([expect.objectContaining({ conceptId })]),
    );
  });

  it("interprets a bare answer only in the pending question context", () => {
    expect(interpretBoundedCategory("VACUUM", "11", "appliances.vacuum.radius", 3).proposals).toEqual([
      expect.objectContaining({ conceptId: "RADIUS", value: { minimumM: 11 }, decisionUse: "HARD_FILTER" }),
    ]);
    expect(interpretBoundedCategory("VACUUM", "11", undefined, 3).proposals).toEqual([]);
  });

  it.each([
    ["küçük bir oda yaklaşık 10 m2", 10, true],
    ["Oda 10 m²", 10, false],
    ["10 metrekarelik bir alan", 10, false],
    ["yaklaşık 10,5 metre kare", 10.5, true],
  ] as const)("keeps Turkish air-purifier room area as context for %s", (message, roomAreaM2, approximate) => {
    expect(interpretBoundedCategory("AIR_PURIFIER", message, "appliances.air-purifier.room-area", 2).proposals).toEqual([
      expect.objectContaining({
        conceptId: "PM_CADR",
        decisionUse: "QUESTION_INPUT",
        value: expect.objectContaining({ roomAreaM2, approximate, selectionUse: "CONTEXT_ONLY", genericCoveragePromise: false }),
      }),
    ]);
  });

  it("does not mistake room area for filter-maintenance consent", () => {
    const proposals = interpretBoundedCategory("AIR_PURIFIER", "küçük bir oda yaklaşık 10 m2", "appliances.air-purifier.room-area", 2).proposals;
    expect(proposals.some((proposal) => proposal.conceptId === "FILTER_MAINTENANCE")).toBe(false);
  });

  it("rejects cross-category concepts before persistence", () => {
    const proposal = interpretBoundedCategory("VACUUM", "Alerjim var", undefined, 2).proposals;
    expect(validateBoundedProposals("VACUUM", new Set(["FIT"]), proposal)).toEqual({
      status: "INVALID",
      reason: "UNKNOWN_OR_CROSS_CATEGORY_CONCEPT",
    });
  });
});
