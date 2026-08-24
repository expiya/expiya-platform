import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { personaRegionalCorroborationSchema } from "./personaRegionalCorroboration";

const candidatePath = path.join(process.cwd(), "data/production/personas/evidence/regional-corroboration/release-candidates/v1.0.0-wave-01-2026-08-24/regional-corroboration.json");

describe("persona regional corroboration wave 01", () => {
  const candidate = JSON.parse(readFileSync(candidatePath, "utf8")) as unknown;

  it("covers exactly 154 editorial-enriched families", () => expect(personaRegionalCorroborationSchema.safeParse(candidate).success).toBe(true));
  it("cannot mutate ranking or activate without owner review", () => {
    const parsed = personaRegionalCorroborationSchema.parse(candidate);
    expect(parsed.activationPerformed).toBe(false);
    expect(parsed.families.every((family) => !family.rankingMutationAllowed && family.ownerReviewRequired)).toBe(true);
  });
});
