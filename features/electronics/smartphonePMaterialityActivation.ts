export const SMARTPHONE_P_MATERIALITY_SOURCE_ACTIVATED = true;

export const SMARTPHONE_P_MATERIALITY_ACTIVATION_AUTHORITY = Object.freeze({
  schemaVersion: "smartphone-p-materiality-source-activation/v1",
  workUnit: "WU-SMARTPHONE-P-MATERIALITY-V1-ACTIVATION-01",
  preflightDigest: "sha256:5f471c4aeb7fc9ef03fefedb86888c5fce8d8aed79d73da96b2fcd10bab11fc0",
  closureSourceCommit: "154aed971d717d01b9cbe885ae08bf45a4d4bdd6",
  flag: "SMARTPHONE_P_MATERIALITY_V1",
  from: false,
  to: true,
  yReady: false,
  productionEffectBeforeDeployment: "NONE",
  rollbackOverride: "SMARTPHONE_P_MATERIALITY_V1=false",
} as const);
