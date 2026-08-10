import { describe, expect, it } from "vitest";

import {
  assessLimitedSupport,
  type LimitedSupportDetermination,
} from "./assessLimitedSupport";

describe("assessLimitedSupport", () => {
  it("produces PERMITTED without changing limitations", () => {
    expect(
      assessLimitedSupport({
        outcome: "PERMITTED",
        limitations: [
          "Only bounded support is permitted.",
        ],
      }),
    ).toEqual({
      outcome: "PERMITTED",
      limitations: [
        "Only bounded support is permitted.",
      ],
    });
  });

  it("produces NOT_PERMITTED without fabricating limitations", () => {
    expect(
      assessLimitedSupport({
        outcome: "NOT_PERMITTED",
        limitations: [],
      }),
    ).toEqual({
      outcome: "NOT_PERMITTED",
      limitations: [],
    });
  });

  it("preserves UNRESOLVED and its limitations", () => {
    expect(
      assessLimitedSupport({
        outcome: "UNRESOLVED",
        limitations: [
          "Limited-support eligibility could not be established.",
        ],
      }),
    ).toEqual({
      outcome: "UNRESOLVED",
      limitations: [
        "Limited-support eligibility could not be established.",
      ],
    });
  });

  it("preserves multiple limitations in input order", () => {
    const result = assessLimitedSupport({
      outcome: "UNRESOLVED",
      limitations: [
        "First limitation.",
        "Second limitation.",
      ],
    });

    expect(result.limitations).toEqual([
      "First limitation.",
      "Second limitation.",
    ]);
  });

  it("does not infer permission from the presence of limitations", () => {
    const result = assessLimitedSupport({
      outcome: "UNRESOLVED",
      limitations: [
        "Some support might be possible.",
      ],
    });

    expect(result.outcome).toBe("UNRESOLVED");
  });

  it("does not infer NOT_PERMITTED from an empty limitation set", () => {
    const result = assessLimitedSupport({
      outcome: "UNRESOLVED",
      limitations: [],
    });

    expect(result.outcome).toBe("UNRESOLVED");
  });

  it("does not mutate the bounded determination input", () => {
    const input: LimitedSupportDetermination = {
      outcome: "PERMITTED",
      limitations: [
        "Original limitation.",
      ],
    };

    const before = structuredClone(input);

    assessLimitedSupport(input);

    expect(input).toEqual(before);
  });

  it("does not return mutable array references owned by the caller", () => {
    const input: LimitedSupportDetermination = {
      outcome: "PERMITTED",
      limitations: [
        "Original limitation.",
      ],
    };

    const result = assessLimitedSupport(input);

    input.limitations.push("Later mutation.");

    expect(result.limitations).toEqual([
      "Original limitation.",
    ]);
  });

  it("produces deterministic output for equivalent bounded inputs", () => {
    const input: LimitedSupportDetermination = {
      outcome: "UNRESOLVED",
      limitations: [
        "Insufficient bounded support evidence.",
      ],
    };

    expect(
      assessLimitedSupport(input),
    ).toEqual(
      assessLimitedSupport(
        structuredClone(input),
      ),
    );
  });
});
