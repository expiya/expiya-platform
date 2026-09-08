import { describe, expect, it } from "vitest";
import {
  ROOT_COMPOSER_MAX_GRAPHEMES,
  rootBudgetCorrectionMessage,
  rootBudgetWarning,
  rootChoicePayload,
  rootGraphemeCount,
  rootReplyDraft,
  safeRootQuestionCopy,
  toggleRootReply,
  validateRootComposerText,
  validateRootReplyReadiness,
} from "./rootConversationComposer";

const options = [
  { questionKey: "usage", value: "CITY", label: "Şehir içi" },
  { questionKey: "usage", value: "FAMILY", label: "Aile kullanımı" },
  { questionKey: "usage", value: "TRAVEL", label: "Uzun yol" },
] as const;

describe("root conversation composer model", () => {
  it("toggles replies without submitting and composes them in deterministic question order", () => {
    const first = toggleRootReply([], options[2], options);
    const second = toggleRootReply(first, options[0], options);
    expect(rootReplyDraft(second)).toBe("Şehir içi ve Uzun yol");
    expect(rootChoicePayload(second)).toEqual({ questionKey: "usage", values: ["CITY", "TRAVEL"] });
    expect(toggleRootReply(second, options[0], options)).toEqual([options[2]]);
  });

  it("enforces the two-line and grapheme contract with explicit feedback", () => {
    expect(validateRootComposerText("bir\niki")).toBeUndefined();
    expect(validateRootComposerText("bir\niki\nüç")).toMatch(/iki satır/u);
    expect(validateRootComposerText("x".repeat(ROOT_COMPOSER_MAX_GRAPHEMES + 1))).toMatch(/karakter/u);
    expect(rootGraphemeCount("aile 👨‍👩‍👧‍👦")).toBe(6);
  });

  it("uses an authored safe question instead of truncating over-budget copy", () => {
    const result = safeRootQuestionCopy("uzun ".repeat(100));
    expect(result).toMatch(/en önemli ihtiyacınızı/u);
    expect(result).not.toContain("…");
  });

  it("fails readiness for overflowing reply packs", () => {
    expect(validateRootReplyReadiness(options)).toBeUndefined();
    expect(validateRootReplyReadiness([...options, ...options, options[0]])).toMatch(/en fazla 6/u);
    expect(validateRootReplyReadiness([{ value: "LONG", label: "x".repeat(49) }])).toMatch(/48/u);
    expect(validateRootReplyReadiness(Array.from({length:4},(_,index)=>({value:String(index),label:"x".repeat(46)})))).toMatch(/composer/u);
  });

  it("models budget corrections and warns only from fresh governed comparable authority", () => {
    expect(rootBudgetCorrectionMessage("50.000", "60.000")).toContain("50.000 TL yerine");
    expect(rootBudgetWarning(50_000, { authority: "GOVERNED", comparable: true, freshness: "CURRENT", sourceKind: "CATALOG", minimumTry: 60_000 })).toMatch(/altında/u);
    expect(rootBudgetWarning(50_000, { authority: "GOVERNED", comparable: true, freshness: "STALE", sourceKind: "CATALOG", minimumTry: 60_000 })).toBeUndefined();
    expect(rootBudgetWarning(50_000, { authority: "GOVERNED", comparable: true, freshness: "CURRENT", sourceKind: "COMMERCE_ONLY", minimumTry: 60_000 })).toBeUndefined();
  });
});
