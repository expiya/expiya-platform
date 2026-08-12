import { beforeEach, describe, expect, it, vi } from "vitest";

const { parseMock } = vi.hoisted(() => ({
  parseMock: vi.fn(),
}));

vi.mock("@/lib/openai", () => ({
  getOpenAIClient: () => ({
    responses: {
      parse: parseMock,
    },
  }),
}));

import { extractExplicitUserContext } from "./extractExplicitUserContext";

describe("extractExplicitUserContext", () => {
  beforeEach(() => {
    parseMock.mockReset();
  });

  it("returns validated explicitly extracted facts", async () => {
    parseMock.mockResolvedValue({
      output_parsed: {
        facts: [
          {
            target: "userContext.constraints",
            value: "Bütçem 1.5 milyon TL.",
          },
        ],
      },
    });

    const result = await extractExplicitUserContext({
      text: "Bütçem 1.5 milyon TL.",
      sourceReferenceId: "input-1",
    });

    expect(result).toEqual({
      facts: [
        {
          target: "userContext.constraints",
          value: "Bütçem 1.5 milyon TL.",
        },
      ],
    });
  });

  it("accepts a successful zero-match extraction", async () => {
    parseMock.mockResolvedValue({
      output_parsed: {
        facts: [],
      },
    });

    const result = await extractExplicitUserContext({
      text: "Merhaba.",
      sourceReferenceId: "input-2",
    });

    expect(result).toEqual({
      facts: [],
    });
  });

  it("rejects malformed parsed output", async () => {
    parseMock.mockResolvedValue({
      output_parsed: {
        facts: [
          {
            target: "userContext.favoriteBrand",
            value: "Toyota",
          },
        ],
      },
    });

    await expect(
      extractExplicitUserContext({
        text: "Toyota hakkında ne düşünüyorsun?",
        sourceReferenceId: "input-3",
      }),
    ).rejects.toThrow();
  });

  it("rejects a response with no parsed output", async () => {
    parseMock.mockResolvedValue({
      output_parsed: null,
    });

    await expect(
      extractExplicitUserContext({
        text: "Bir araba arıyorum.",
        sourceReferenceId: "input-4",
      }),
    ).rejects.toThrow(
      "Explicit context extraction returned no parsed output.",
    );
  });

  it("instructs the model to extract explicit information only", async () => {
    parseMock.mockResolvedValue({
      output_parsed: {
        facts: [],
      },
    });

    await extractExplicitUserContext({
      text: "İki çocuğum var.",
      sourceReferenceId: "input-5",
    });

    expect(parseMock).toHaveBeenCalledOnce();

    const request = parseMock.mock.calls[0][0];
    const systemMessage = request.input[0].content;

    expect(systemMessage).toContain(
      "Extract only decision-context information explicitly stated by the user.",
    );

    expect(systemMessage).toContain(
      "Do not infer preferences, priorities, constraints, needs, criteria, options, or facts that the user did not explicitly state.",
    );

    expect(systemMessage).toContain(
      "Do not generate new user facts.",
    );
  });

  it("does not send provenance or source authority to the model", async () => {
    parseMock.mockResolvedValue({
      output_parsed: {
        facts: [],
      },
    });

    await extractExplicitUserContext({
      text: "Otomatik vites istiyorum.",
      sourceReferenceId: "input-6",
    });

    const request = JSON.stringify(parseMock.mock.calls[0][0]);

    expect(request).not.toContain("EXPLICIT_USER");
    expect(request).not.toContain("USER_INPUT");
    expect(request).not.toContain("sourceReferenceId");
    expect(request).not.toContain("candidateId");
  });
});
