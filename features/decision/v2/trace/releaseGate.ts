export interface CarsReleaseGateInput {
  readonly typeScript: boolean;
  readonly scopedEslintZeroWarnings: boolean;
  readonly fullVitest: boolean;
  readonly productionBuild: boolean;
  readonly goldenReplay: boolean;
  readonly propertyInvariants: boolean;
  readonly decisionNeutrality: boolean;
  readonly equipmentRecChecksumBoundary: boolean;
  readonly catalogMediaIntegrity: boolean;
  readonly secretSessionScan: boolean;
  readonly activePointerChangesAuthorized: boolean;
  readonly deterministicReplayReportProduced: boolean;
  readonly anonymousShadowEvaluation: boolean;
}

export function evaluateCarsReleaseGate(input: CarsReleaseGateInput) {
  const failedChecks = Object.entries(input).filter(([, passed]) => !passed).map(([name]) => name).sort();
  return Object.freeze({ schemaVersion: "1.0.0", disposition: failedChecks.length === 0 ? "READY" as const : "BLOCKED" as const,
    checkCount: Object.keys(input).length, failedChecks: Object.freeze(failedChecks) });
}
