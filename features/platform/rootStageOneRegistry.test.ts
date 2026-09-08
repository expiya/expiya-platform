import { describe, expect, it } from "vitest";
import { ROOT_QUESTION_MAX_GRAPHEMES, rootGraphemeCount, safeRootQuestionCopy } from "./rootConversationComposer";
import { resolveRootStageOneAdapter, rootStageOneClientAdapters, rootStageOneCoverage } from "./rootStageOneRegistry";

describe("root Stage 1 registry", () => {
  it("automatically covers active categories in supported domain families", () => {
    const coverage = rootStageOneCoverage();
    expect(coverage).toHaveLength(54);
    expect(coverage.every(row => row.supported)).toBe(true);
  });
  it("keeps a consumer question fixture for all 54 active categories inside the Root visual copy budget", () => {
    const questions=rootStageOneClientAdapters().map(adapter=>({id:`${adapter.departmentId}/${adapter.categoryId}`,copy:safeRootQuestionCopy(`${adapter.categoryLabel} seçerken sizin için en önemli kullanım ihtiyacı hangisi?`)}));
    expect(questions).toHaveLength(54);
    expect(questions.every(row=>rootGraphemeCount(row.copy)<=ROOT_QUESTION_MAX_GRAPHEMES)).toBe(true);
    expect(new Set(questions.map(row=>row.id)).size).toBe(54);
  });
  it("binds Cars and Tools to explicit thin adapters", () => {
    expect(resolveRootStageOneAdapter("TOOLS", "CORDLESS_DRILL")?.endpoint).toBe("/api/tools/conversation");
    expect(resolveRootStageOneAdapter("CARS", "NEW_CAR")?.mode).toBe("CARS_V3");
  });
});
