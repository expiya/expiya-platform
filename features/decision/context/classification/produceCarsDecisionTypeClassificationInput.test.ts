import { beforeEach, describe, expect, it, vi } from "vitest";

const { parseMock } = vi.hoisted(() => ({
  parseMock: vi.fn(),
}));

vi.mock("@/lib/openai", () => ({
  openai: {
    responses: {
      parse: parseMock,
    },
  },
}));

import { produceCarsDecisionTypeClassificationInput } from "./produceCarsDecisionTypeClassificationInput";

describe("produceCarsDecisionTypeClassificationInput", () => {
  beforeEach(() => {
    parseMock.mockReset();
  });

  it("classifies an explicit Turkish purchase conversation without a provider call", async () => {
    await expect(produceCarsDecisionTypeClassificationInput({
      text: [
        "Automobile decision conversation (oldest to newest):",
        "User turn 1: Araba almak istiyorum.",
        "User turn 2: İşe gidip gelmek için küçük olsun.",
      ].join("\n"),
    })).resolves.toEqual({
      status: "READY",
      candidateDecisionTypes: ["AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION"],
    });
    expect(parseMock).not.toHaveBeenCalled();
  });

  it("classifies explicit comparison intent without a provider call", async () => {
    await expect(produceCarsDecisionTypeClassificationInput({
      text: "Toyota Corolla ile Honda Civic'i karşılaştır.",
    })).resolves.toEqual({
      status: "READY",
      candidateDecisionTypes: ["AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON"],
    });
    expect(parseMock).not.toHaveBeenCalled();
  });

  it.each([
    "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
    "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
  ] as const)("produces the approved %s candidate", async (decisionType) => {
    parseMock.mockResolvedValue({
      output_parsed: { candidateDecisionTypes: [decisionType] },
    });

    await expect(
      produceCarsDecisionTypeClassificationInput({ text: "cars request" }),
    ).resolves.toEqual({
      status: "READY",
      candidateDecisionTypes: [decisionType],
    });
  });

  it("preserves genuine ambiguity for the deterministic classifier", async () => {
    parseMock.mockResolvedValue({
      output_parsed: {
        candidateDecisionTypes: [
          "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
          "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
        ],
      },
    });

    await expect(
      produceCarsDecisionTypeClassificationInput({ text: "mixed request" }),
    ).resolves.toEqual({
      status: "READY",
      candidateDecisionTypes: [
        "AUTOMOBILE_PURCHASE_OPTION_DISCOVERY_RECOMMENDATION",
        "AUTOMOBILE_PURCHASE_CANDIDATE_COMPARISON",
      ],
    });
  });

  it("preserves an unsupported request as an empty candidate set", async () => {
    parseMock.mockResolvedValue({
      output_parsed: { candidateDecisionTypes: [] },
    });

    await expect(
      produceCarsDecisionTypeClassificationInput({ text: "unrelated request" }),
    ).resolves.toEqual({
      status: "READY",
      candidateDecisionTypes: [],
    });
  });

  it.each([
    null,
    { candidateDecisionTypes: ["UNAPPROVED_TYPE"] },
  ])("fails closed for absent or invalid parsed output", async (outputParsed) => {
    parseMock.mockResolvedValue({ output_parsed: outputParsed });

    await expect(
      produceCarsDecisionTypeClassificationInput({ text: "request" }),
    ).resolves.toEqual({ status: "FAILED" });
  });

  it("fails closed when the classification dependency throws", async () => {
    parseMock.mockRejectedValue(new Error("provider unavailable"));

    await expect(
      produceCarsDecisionTypeClassificationInput({ text: "request" }),
    ).resolves.toEqual({ status: "FAILED" });
  });

  it("forbids recommendation and authorization in the model contract", async () => {
    parseMock.mockResolvedValue({
      output_parsed: { candidateDecisionTypes: [] },
    });

    await produceCarsDecisionTypeClassificationInput({ text: "request" });

    const request = parseMock.mock.calls[0][0];
    const systemMessage = request.input[0].content;

    expect(systemMessage).toContain("only the approved Cars decision types");
    expect(systemMessage).toContain(
      "Do not recommend, rank, score, evaluate, or authorize any vehicle.",
    );
  });
});
