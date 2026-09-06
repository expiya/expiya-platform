import { describe, expect, it } from "vitest";

import {
  rankWithActiveUniversalPersona,
  resolveActivePersonaPreference,
  universalPersonaCategorySoftRanking,
} from "./activeProjection";

describe("active universal Persona projection", () => {
  it("activates only the four evidence-qualified category bindings", () => {
    expect(universalPersonaCategorySoftRanking("MANUAL_ESPRESSO_MACHINE").status).toBe("ACTIVE");
    expect(universalPersonaCategorySoftRanking("HEADPHONES").status).toBe("ACTIVE");
    expect(universalPersonaCategorySoftRanking("PROJECTOR").status).toBe("ACTIVE");
    expect(universalPersonaCategorySoftRanking("STROLLER").status).toBe("ACTIVE");
    expect(universalPersonaCategorySoftRanking("LAPTOP").status).toBe("FAILED_CLOSED");
  });

  it("maps only approved Turkish expressions in categories with evidence", () => {
    expect(resolveActivePersonaPreference("HEADPHONES", "tasarım odaklı")).toBe("DESIGN_LED");
    expect(resolveActivePersonaPreference("PROJECTOR", "eğlenceli")).toBe("PLAYFUL");
    expect(resolveActivePersonaPreference("LAPTOP", "tasarım odaklı")).toBeNull();
    expect(resolveActivePersonaPreference("HEADPHONES", "teknoloji odaklı")).toBeNull();
  });

  it("changes ordering without changing membership or authorizing a winner", () => {
    const ids = [
      "electronics:headphones:huawei:freebuds-6-black",
      "electronics:headphones:sony:wh1000xm5b-ce7",
    ];
    const ranked = rankWithActiveUniversalPersona({
      categoryId: "HEADPHONES",
      eligibleCandidateIds: ids,
      preferences: [{ eventId: "p1", preferenceKey: "DESIGN_LED", status: "ACTIVE" }],
    });
    expect(ranked.status).toBe("READY");
    if (ranked.status !== "READY") return;
    expect(ranked.result.orderedCandidateIds[0]).toBe("electronics:headphones:sony:wh1000xm5b-ce7");
    expect(ranked.result.retainedCandidateIds).toEqual([...ids].sort());
    expect(ranked.result.selectionOutcome).toBe("TIED_TOP_SET");
  });

  it("keeps UNKNOWN neutral and rejects a future catalog identity", () => {
    const known = rankWithActiveUniversalPersona({
      categoryId: "HEADPHONES",
      eligibleCandidateIds: ["electronics:headphones:huawei:freebuds-6-black"],
      preferences: [{ eventId: "p1", preferenceKey: "DESIGN_LED", status: "ACTIVE" }],
    });
    expect(known.status).toBe("READY");
    if (known.status === "READY") expect(known.result.traces[0]?.score).toBe(0);
    expect(
      rankWithActiveUniversalPersona({
        categoryId: "HEADPHONES",
        eligibleCandidateIds: ["future-headphone"],
        preferences: [],
      }),
    ).toEqual({ status: "FAILED_CLOSED", reason: "PERSONA_FUTURE_CATALOG_READINESS_REQUIRED" });
  });
});
