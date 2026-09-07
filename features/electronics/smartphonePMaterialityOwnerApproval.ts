import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const PACKAGE_MANIFEST = "data/research/electronics/smartphone-p-materiality-owner-review-v2-01/manifest.json";
const PACKAGE_DIGEST = "sha256:3163b47d52ebabc7a451c11ed48caf8e8363cc5bdc7887e72f5ca7ba5110dd72";
const APPROVAL_TEXT = "Semantic Decision Projection v2 sözleşmesine bağlı SMARTPHONE P-materiality owner-review paketinde yalnız Türkiye/5G, telefoto ve en az 80 W şarj eksenlerinin immutable candidate olarak kabul edilmesini; support-duration sorusunun 16 KNOWN/18 UNKNOWN nedeniyle bastırılmış, feature flag'in default-off ve Y_READY'nin false kalmasını onaylıyorum. Bu onay aktivasyon, push veya deployment yetkisi vermez.";
const sha = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const stable = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

export function buildSmartphonePMaterialityOwnerApproval(root = process.cwd()) {
  const manifestBytes = readFileSync(`${root}/${PACKAGE_MANIFEST}`);
  const manifest = JSON.parse(manifestBytes.toString());
  if (manifest.packageDigest !== PACKAGE_DIGEST) throw new Error("OWNER_REVIEW_PACKAGE_DIGEST_MISMATCH");
  const approvalCore = {
    schemaVersion: "smartphone-p-materiality-owner-approval/v1",
    lifecycle: "APPROVED_OWNER_REVIEW_CANDIDATE",
    approvedAt: "2026-09-07T00:00:00.000Z",
    approvalScope: "IMMUTABLE_CANDIDATE_ACCEPTANCE_ONLY",
    approvalTextTr: APPROVAL_TEXT,
    bindings: { ownerReviewCommit: "ced6e66d58bd8c2455b8e79f82eaf88bba12e364", packageDigest: PACKAGE_DIGEST, packageManifestSha256: sha(manifestBytes), semanticContractCommit: "c29c356e2b15c37bd679f30a8ebd3018f744e4f0" },
    includedAxes: ["TURKIYE_NETWORK_APPLICABILITY", "CAMERA_USE_CASE_TELEPHOTO", "BATTERY_CHARGING_ROUTINE_GTE_80W"],
    exclusions: { supportDuration: { status: "SUPPRESSED_PREDOMINANTLY_DURATION_UNKNOWN", known: 16, unknown: 18 }, activation: false, push: false, deployment: false, pointerMutation: false, runtimeMutation: false, databaseMutation: false },
    readiness: { INFORMATION_READY: true, P_READY: true, Y_READY: false },
    featureFlag: { name: "SMARTPHONE_P_MATERIALITY_V1", defaultEnabled: false },
  };
  const approval = { ...approvalCore, approvalDigest: sha(stable(approvalCore)) };
  const noEffect = { schemaVersion: "smartphone-p-owner-approval-no-effect/v1", packageDigestBefore: PACKAGE_DIGEST, packageDigestAfter: PACKAGE_DIGEST, activePointerMutation: false, runtimeMutation: false, membershipOrderFingerprintAuthorizationEffect: "NONE" };
  const artifacts = { "approval-event.json": approval, "no-effect-proof.json": noEffect };
  const artifactDigests = Object.fromEntries(Object.entries(artifacts).map(([name, value]) => [name, sha(stable(value))]));
  const receipt = { schemaVersion: "smartphone-p-owner-approval-receipt/v1", artifactDigests, receiptDigest: sha(stable({ packageDigest: PACKAGE_DIGEST, artifactDigests })) };
  const serialized: Record<string, string> = Object.fromEntries([...Object.entries(artifacts), ["receipt.json", receipt]].map(([name, value]) => [name, stable(value)]));
  return { artifacts, receipt, serialized };
}
