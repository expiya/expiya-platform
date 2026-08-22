import { describe, expect, it } from "vitest";

import { evaluateCarsReleaseGate, type CarsReleaseGateInput } from "./releaseGate";

const passing: CarsReleaseGateInput = { typeScript: true, scopedEslintZeroWarnings: true, fullVitest: true, productionBuild: true,
  goldenReplay: true, propertyInvariants: true, decisionNeutrality: true, equipmentRecChecksumBoundary: true,
  catalogMediaIntegrity: true, secretSessionScan: true, activePointerChangesAuthorized: true, deterministicReplayReportProduced: true, anonymousShadowEvaluation: true };

describe("single immutable cars release gate contract", () => {
  it("is ready only when every required check passes", () => {
    expect(evaluateCarsReleaseGate(passing)).toMatchObject({ disposition: "READY", checkCount: 13, failedChecks: [] });
    expect(evaluateCarsReleaseGate({ ...passing, catalogMediaIntegrity: false, equipmentRecChecksumBoundary: false })).toMatchObject({
      disposition: "BLOCKED", failedChecks: ["catalogMediaIntegrity", "equipmentRecChecksumBoundary"],
    });
  });
});
