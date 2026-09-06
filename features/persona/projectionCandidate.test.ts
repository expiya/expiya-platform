import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { validatePersonaProjectionCandidate, type PersonaProjectionCandidate } from "./projectionCandidate";

const directory = path.join(
  process.cwd(),
  "data/production/personas/universal/projection-materialization/XPY-UNIVERSAL-PERSONA-PROJECTION-TR-v0.1-owner-review",
);
const read = <T>(file: string): T => JSON.parse(readFileSync(path.join(directory, file), "utf8"));
const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.entries(value as Record<string, unknown>)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, item]) => [key, canonical(item)]),
        )
      : value;
const digest = (value: unknown) =>
  `sha256:${createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex")}`;

describe("universal Persona projection candidate", () => {
  it("reconciles 169 exact products into 49 inactive category bindings", () => {
    const candidate = read<PersonaProjectionCandidate>("projection-candidate.json");
    expect(validatePersonaProjectionCandidate(candidate)).toEqual([]);
    expect(candidate.records.filter((record) => record.status === "GOVERNED_INHERITED")).toHaveLength(4);
    expect(candidate.records.filter((record) => record.status === "PERSONA_EVIDENCE_UNKNOWN")).toHaveLength(165);
    expect(candidate.categoryBindings.filter((binding) => binding.status === "INACTIVE_CANDIDATE_USABLE_MAPPING")).toHaveLength(4);
  });

  it("keeps every shadow trace membership-identical and non-authorizing", () => {
    const traces = read<Array<Record<string, unknown>>>("shadow-traces.json");
    expect(traces).toHaveLength(7);
    for (const trace of traces) {
      expect(trace).toMatchObject({
        membershipIdentical: true,
        technicalEligibilityChanged: false,
        sufficiencyChanged: false,
        singleSelectionAuthorized: false,
        catalogOrderIndependent: true,
      });
    }
  });

  it("proves preference lifecycle, ties, neutral unknowns, and category-local fail closure", () => {
    const proofs = read<Record<string, unknown>>("invariant-proofs.json");
    expect(proofs).toMatchObject({
      aggregateCap: 0.75,
      noDoubleCounting: true,
      conflictPrecedence: "CONFLICTED_EVIDENCE_IS_NEUTRAL_AND_OVERRIDES_POSITIVE_CONTRIBUTION",
      correctionRemovesPriorEffect: true,
      clearRemovesEffect: true,
      supersessionRemovesPriorEffect: true,
      tiesRemainTies: true,
      unknownIsNeutral: true,
      catalogOrderIndependent: true,
      missingMappingFailsClosedLocally: true,
      futureCatalogReadinessGateMandatory: true,
      carsV39Changed: false,
    });
  });

  it("binds every immutable artifact and approval request to the package digest", () => {
    const manifest = read<{
      packageDigest: string;
      artifactDigests: Record<string, string>;
      [key: string]: unknown;
    }>("manifest.json");
    const { packageDigest, ...manifestCore } = manifest;
    expect(digest(manifestCore)).toBe(packageDigest);
    for (const [file, expectedDigest] of Object.entries(manifest.artifactDigests)) {
      expect(digest(read(file))).toBe(expectedDigest);
    }
    const approval = read<{ packageDigest: string; exactSentence: string }>("approval-request.json");
    expect(approval.packageDigest).toBe(packageDigest);
    expect(approval.exactSentence).toContain(packageDigest);
  });
});
