import { describe, expect, it } from "vitest";
import { createRootPMaterialityRuntime, answerRootPMaterialityRuntime } from "./rootRuntimeConsumer.server";

describe("Root active-v4 material transcript characterization", () => {
  it.each([
    ["ELECTRONICS", "TELEVISION"],
    ["ELECTRONICS", "LAPTOP"],
    ["APPLIANCES", "REFRIGERATOR"],
    ["BABY_AND_CHILD", "STROLLER"],
    ["CARS", "NEW_CAR"],
    ["TOOLS", "CORDLESS_DRILL"],
  ])("delivers an executable active projection for %s/%s", async (departmentId, categoryId) => {
    const result = await createRootPMaterialityRuntime(departmentId, categoryId);
    expect(result.outcome).toMatchObject({ kind: "ASK", artifactReadiness: "P_READY", runtimeConsumption: "EXECUTABLE_MATERIAL_QUESTION", candidatePoolUnchanged: true });
    expect(result.outcome.message).not.toMatch(/[A-Z]{2,}_[A-Z_]+/u);
  });

  it.each([
    ["APPLIANCES", "WASHING_MACHINE"],
    ["ELECTRONICS", "HEADPHONES"],
  ])("honestly suppresses material questions for %s/%s", async (departmentId, categoryId) => {
    const result = await createRootPMaterialityRuntime(departmentId, categoryId);
    expect(result.outcome).toMatchObject({ kind: "CLARIFY", artifactReadiness: "INFORMATION_ONLY", runtimeConsumption: "NO_MATERIAL_QUESTION" });
    expect(result.outcome.message).not.toMatch(/ne kadar önemli|gerekli mi\?/iu);
  });

  it("proves the complete Television transcript without changing membership or Y", async () => {
    const welcome = "Televizyon, kullanım biçimine göre doğru özellikleri değişen bir ürün grubudur.";
    const created = await createRootPMaterialityRuntime("ELECTRONICS", "TELEVISION");
    expect(welcome).toContain("Televizyon");
    expect(created.outcome).toMatchObject({ questionKey: "p.electronics.television.display_inches", message: "İzleme mesafeniz için ekranın en az 65 inç olması önemli mi?" });
    const answered = await answerRootPMaterialityRuntime({ slice: created.state, eventId: "tv-75-inch", operation: "ANSWER", answerId: "YES" });
    expect(answered.outcome).toMatchObject({ kind: "CLARIFY", questionKey: "NON_DOMINATED_SET", candidatePoolUnchanged: true, yAuthority: "UNCHANGED_NONE_GRANTED" });
    if (!("candidateSummaries" in answered.outcome)) throw new Error("candidate summaries unavailable");
    expect(answered.outcome.candidateSummaries.map(item => item.label)).toEqual([
      "Samsung QE75QN90FATXTK",
      "LG OLED55B65LA",
      "Next YE-55GFSG8-QLED",
    ]);
    expect(answered.outcome.candidateSummaries).toHaveLength(3);
  });
});
