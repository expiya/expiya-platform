import { describe, expect, it } from "vitest";

import type { MaterialQuestion } from "../domain/decisionState";
import { materialQuestionText } from "./materialQuestionText";

function question(stableSemanticKey: string): MaterialQuestion {
  return {
    id: "question",
    stableSemanticKey,
    field: stableSemanticKey.split(".")[1] ?? "bodyStyle",
    promptIntent: "RESOLVE_CONFLICT",
    options: [],
    selectionMode: "SINGLE",
    minimumSelections: 1,
    maximumSelections: 1,
    answerCapabilities: ["ANSWER", "SKIP", "UNKNOWN", "NOT_IMPORTANT"],
    materialityReason: "test",
  };
}

describe("materialQuestionText preference relaxation", () => {
  it("frames refinement as one useful step toward the right vehicle", () => {
    expect(materialQuestionText(question("refinement.fuelType"))).toBe("Doğru aracı seçebilmem için hangi enerji türünü önceliklendirelim?");
  });
  it("names the failed body preference and asks for a guided relaxation", () => {
    expect(materialQuestionText(question("preferenceRelaxation.bodyStyle.Sedan"))).toBe(
      "Seçtiğin Sedan gövde tipi mevcut adaylarda bulunmuyor. Aşağıda gerçekten sonucu olan alternatifleri, kalan seçenek sayılarıyla gösteriyorum; hangisine geçelim?",
    );
  });

  it("uses user-facing labels for controlled fuel and transmission values", () => {
    expect(materialQuestionText(question("preferenceRelaxation.fuelType.HEV"))).toContain("tam hibrit yakıt türü");
    expect(materialQuestionText(question("preferenceRelaxation.transmission.AUTOMATIC"))).toContain("otomatik şanzıman türü");
  });
});
