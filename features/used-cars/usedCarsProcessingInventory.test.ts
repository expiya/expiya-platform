import { describe, expect, it } from "vitest";
import { assessProcessingInventory, usedCarsProcessingInventoryDraft } from "./privacy/processingInventory";
describe("used-cars processing inventory", () => {
  it("records ten processing purposes without silently inventing legal bases", () => { expect(usedCarsProcessingInventoryDraft).toHaveLength(10); expect(assessProcessingInventory(usedCarsProcessingInventoryDraft).missingLegalBasis).toHaveLength(10); });
  it("keeps every draft activity non-executable", () => expect(usedCarsProcessingInventoryDraft.every((activity) => activity.productionProcessingAuthorized === false)).toBe(true));
  it("requires retention decisions", () => expect(assessProcessingInventory(usedCarsProcessingInventoryDraft)).toMatchObject({ ready: false, productionProcessingAuthorized: false }));
});
