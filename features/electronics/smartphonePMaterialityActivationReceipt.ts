import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { SMARTPHONE_P_MATERIALITY_ACTIVATION_AUTHORITY } from "./smartphonePMaterialityActivation";

const PREFLIGHT = "data/research/electronics/smartphone-p-activation-preflight-closure-01";
const AUTHORIZATION = "sha256:5f471c4aeb7fc9ef03fefedb86888c5fce8d8aed79d73da96b2fcd10bab11fc0 özetli WU-SMARTPHONE-P-MATERIALITY-V1-ACTIVATION-PREFLIGHT-CLOSURE-01 paketine ve 154aed971d717d01b9cbe885ae08bf45a4d4bdd6 exact source SHA'sına bağlı olarak yalnız SMARTPHONE_P_MATERIALITY_V1 feature flag'inin default-off durumundan atomik biçimde etkinleştirilmesini onaylıyorum; Y_READY false kalacak ve bu onay push, preview, deployment, veritabanı veya başka pointer/lineage değişikliği yetkisi vermez.";
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object" ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)])) : value;
const stable = (value: unknown) => `${JSON.stringify(canonical(value))}\n`;
const sha = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}`;

export function buildSmartphonePMaterialityActivationReceipt(root = process.cwd()) {
  const manifestBytes = readFileSync(`${root}/${PREFLIGHT}/manifest.json`);
  const manifest = JSON.parse(manifestBytes.toString());
  const preflight = JSON.parse(readFileSync(`${root}/${PREFLIGHT}/preflight.json`, "utf8"));
  if (manifest.packageDigest !== "sha256:dded5176d257c494358e59c43688f62c12c92bf85a2dbe9a8290f1a1b54081cd" || preflight.preflightDigest !== SMARTPHONE_P_MATERIALITY_ACTIVATION_AUTHORITY.preflightDigest) throw new Error("ACTIVATION_PREFLIGHT_BINDING_MISMATCH");
  const receiptCore = {
    schemaVersion: "smartphone-p-materiality-atomic-source-activation-receipt/v1",
    activationId: "WU-SMARTPHONE-P-MATERIALITY-V1-ACTIVATION-01",
    status: "SUCCESS_LOCAL_SOURCE_ACTIVATION",
    activatedAt: "2026-09-08T00:00:00.000Z",
    authorizationSentence: AUTHORIZATION,
    authorizationSentenceSha256: sha(AUTHORIZATION),
    preflightPackageDigest: manifest.packageDigest,
    preflightDigest: preflight.preflightDigest,
    closureSourceCommit: SMARTPHONE_P_MATERIALITY_ACTIVATION_AUTHORITY.closureSourceCommit,
    operation: { onlyFeatureFlag: SMARTPHONE_P_MATERIALITY_ACTIVATION_AUTHORITY.flag, from: false, to: true, atomic: true },
    readiness: { P_READY: true, Y_READY: false },
    postconditions: { electronics: 121, smartphone: 34, catalogFactory: 105, supportDurationQuestion: "SUPPRESSED", rollbackOverride: SMARTPHONE_P_MATERIALITY_ACTIVATION_AUTHORITY.rollbackOverride },
    mutationBoundary: { push: false, preview: false, deployment: false, production: false, database: false, pointer: false, otherLineage: false },
    productionEffect: "NONE_UNTIL_SEPARATELY_AUTHORIZED_DEPLOYMENT",
  };
  const receipt = { ...receiptCore, receiptDigest: sha(stable(receiptCore)) };
  const rollback = { schemaVersion: "smartphone-p-materiality-atomic-source-rollback/v1", status: "READY_NOT_EXECUTED", activationReceiptDigest: receipt.receiptDigest, operation: SMARTPHONE_P_MATERIALITY_ACTIVATION_AUTHORITY.rollbackOverride, restores: "DEFAULT_OFF", preserves: ["CURRENT_PRODUCTION_DEPLOYMENT", "DATABASE", "CATALOG_POINTERS", "OTHER_LINEAGES"] };
  return { receipt, rollback, manifestSha256: sha(manifestBytes), serialized: { "activation-receipt.json": Buffer.from(stable(receipt)), "rollback-receipt-template.json": Buffer.from(stable(rollback)), "authorization-sentence.txt": Buffer.from(`${AUTHORIZATION}\n`) } };
}
