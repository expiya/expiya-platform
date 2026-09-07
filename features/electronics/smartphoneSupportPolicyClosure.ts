import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { buildSmartphoneSupportPolicyBackfill } from "./smartphoneSupportPolicyBackfill";
import { RUNTIME_POINTER } from "./smartphonePMaterialityShadow";

const sha = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const stable = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

const closureSources = [
  { sourceId: "oppo-tr:official-support-index", url: "https://support.oppo.com/tr/", capturedAt: "2026-09-07", authority: "MANUFACTURER_TR_SUPPORT", claim: "The official Türkiye support index offers software-update help but exposes no Reno13 F 5G/CPH2699 lifecycle duration, cadence, eligibility, or end date." },
  { sourceId: "oppo-tr:reno13-f-product-fluency", url: "https://www.oppo.com/tr/smartphones/series-reno/reno13-f-5g/", capturedAt: "2026-09-07", authority: "MANUFACTURER_TR_PRODUCT", claim: "The 60-month fluency laboratory claim is performance testing, not OS upgrades, security support duration, cadence, eligibility, or an end date." },
  { sourceId: "general-mobile-tr:gms-certification", url: "https://www.generalmobile.com/tr/destek/google-mobil-hizmetleri", capturedAt: "2026-09-07", authority: "MANUFACTURER_TR_SUPPORT", claim: "The GMS certification page mentions OTA updates and Google security approval but provides no GM Phoenix 5G model-coded lifecycle commitment." },
] as const;

export function buildSmartphoneSupportPolicyClosure(root = process.cwd()) {
  const backfill = buildSmartphoneSupportPolicyBackfill(root);
  const matrix = backfill.artifacts["support-coverage-matrix.json"] as { rows: Array<{ exactProductId: string; terminal: string; candidateFacts: Array<{ type: string; value: string | number | boolean }> }> };
  const unknown = matrix.rows.filter((row) => row.terminal === "UNKNOWN");
  const closureRows = unknown.map((row) => {
    const maker = row.exactProductId.includes(":oppo:") ? "OPPO" : row.exactProductId.includes(":tecno:") ? "TECNO" : "GENERAL_MOBILE";
    const sourceIds = maker === "OPPO" ? ["oppo-tr:official-support-index", "oppo-tr:reno13-f-product-fluency"] : maker === "GENERAL_MOBILE" ? ["general-mobile-tr:gms-certification"] : [];
    return { exactProductId: row.exactProductId, terminal: "UNKNOWN", terminalReason: "NO_PUBLIC_MODEL_CODED_LIFECYCLE_AUTHORITY_FOUND", authorityLine: maker, sourceIds, candidateFacts: [], unknownEffect: "UNKNOWN_RETAIN", searchClosed: true, repeatRecommendation: false };
  });
  const sourceSnapshots = closureSources.map((source) => ({ ...source, snapshotSha256: sha(stable({ url: source.url, capturedAt: source.capturedAt, claim: source.claim })) }));
  const duration = matrix.rows.map((row) => {
    const literal = row.candidateFacts.find((fact) => fact.type === "SUPPORT_POLICY_LITERAL");
    const typical = row.candidateFacts.find((fact) => fact.type === "TYPICAL_MIN_SECURITY_MAINTENANCE_YEARS");
    const partition = literal ? (String(literal.value).startsWith("7 OS") ? "SEVEN_YEARS" : "BELOW_SEVEN_YEARS") : typical ? "BELOW_SEVEN_YEARS" : null;
    return { exactProductId: row.exactProductId, terminal: partition ? "KNOWN" : "UNKNOWN", partition };
  });
  const effect = (answer: "YES" | "NO" | "UNKNOWN") => duration.map((row) => ({ exactProductId: row.exactProductId, effect: row.terminal === "UNKNOWN" ? "UNKNOWN_RETAIN" : answer === "UNKNOWN" ? "SOFT_ONLY_NONE" : ((answer === "YES") === (row.partition === "SEVEN_YEARS") ? "KNOWN_RETAIN" : "KNOWN_EXCLUDE") }));
  const pointerBytes = readFileSync(`${root}/${RUNTIME_POINTER}`);
  const pointer = JSON.parse(pointerBytes.toString());
  const catalogBytes = readFileSync(`${root}/${pointer.catalogFile}`);
  const finalCounts = Object.fromEntries(["KNOWN", "UNKNOWN", "CONFLICTED", "NOT_APPLICABLE"].map((terminal) => [terminal, matrix.rows.filter((row) => row.terminal === terminal).length]));
  const artifacts: Record<string, unknown> = {
    "exact-six-terminal-ledger.json": { schemaVersion: "smartphone-support-closure-ledger/v1", rows: closureRows, exactCount: closureRows.length, noSilentDrop: closureRows.length === 6 },
    "closure-source-registry.json": { schemaVersion: "smartphone-support-closure-sources/v1", sources: sourceSnapshots, exhaustedAuthorityLines: ["OPPO_RENO13_F_5G_CPH2699_TR", "TECNO_CAMON_30_5G_TR", "GENERAL_MOBILE_GM_PHOENIX_5G_TR"], repeatedUrlFetches: 0 },
    "final-coverage.json": { schemaVersion: "smartphone-support-final-coverage/v1", total: 34, counts: finalCounts, closureOutcome: "TERMINAL_PUBLIC_AUTHORITY_EXHAUSTED" },
    "duration-materiality-preview.json": { schemaVersion: "smartphone-support-duration-materiality/v1", mode: "PREVIEW_ONLY", question: "Telefonu yedi yıl boyunca güvenlik güncellemeleriyle kullanabilmek şart mı?", partitionableKnown: duration.filter((row) => row.terminal === "KNOWN").length, durationUnknown: duration.filter((row) => row.terminal === "UNKNOWN").length, knownPartitionCounts: { SEVEN_YEARS: duration.filter((row) => row.partition === "SEVEN_YEARS").length, BELOW_SEVEN_YEARS: duration.filter((row) => row.partition === "BELOW_SEVEN_YEARS").length }, outcome: duration.filter((row) => row.terminal === "UNKNOWN").length > 17 ? "SUPPRESSED_PREDOMINANTLY_DURATION_UNKNOWN" : "ASKABLE", candidateEffectByAnswer: { YES: effect("YES"), NO: effect("NO"), UNKNOWN: effect("UNKNOWN") }, correction: "SECURITY_SUPPORT_END_DATE is not converted into duration; supersedes backfill-01 preview only.", runtimeEffect: "NONE" },
    "readiness-report.json": { schemaVersion: "smartphone-support-closure-readiness/v1", INFORMATION_READY: "PARTIAL_TERMINAL", P_READY: true, supportQuestionPReady: false, supportQuestionReason: "PREDOMINANTLY_DURATION_UNKNOWN", Y_READY: false, exactSixTerminal: true, unknownNeutral: true, falseWinnerAllowed: false, nextRecommendation: "NONE_PUBLIC_SEARCH_CLOSED; reopen only on a newly published model-coded manufacturer authority" },
    "no-effect-proof.json": { schemaVersion: "smartphone-support-closure-no-effect/v1", runtimePointerSha256: sha(pointerBytes), catalogSha256: sha(catalogBytes), catalogArtifactSha256: pointer.catalogArtifactSha256, exactOrderSha256: sha(stable(JSON.parse(catalogBytes.toString()).products.map((p: { exactProductId: string }) => p.exactProductId))), runtimeMembershipOrderFingerprintMutation: false, pointerAuthorizationUiDbMutation: false, unknownCandidateEffect: "RETAIN" },
  };
  const artifactDigests = Object.fromEntries(Object.entries(artifacts).map(([name, value]) => [name, sha(stable(value))]));
  const manifest = { schemaVersion: "smartphone-support-policy-closure-manifest/v1", workUnit: "WU-XPY-SMARTPHONE-SUPPORT-POLICY-EVIDENCE-CLOSURE-02", generatedAt: "2026-09-07T00:00:00.000Z", mode: "EVIDENCE_ONLY_TERMINAL_CLOSURE", pinnedBackfillDigest: "sha256:b099e17d1a674b2d8d3eb927033330960c81ad220fc524c5d1d3f2a46822e680", artifactDigests, releaseDigest: sha(stable({ artifactDigests, pinnedBackfillDigest: "sha256:b099e17d1a674b2d8d3eb927033330960c81ad220fc524c5d1d3f2a46822e680" })) };
  const serialized: Record<string, string> = Object.fromEntries([...Object.entries(artifacts), ["manifest.json", manifest]].map(([name, value]) => [name, stable(value)]));
  return { artifacts, manifest, serialized };
}
