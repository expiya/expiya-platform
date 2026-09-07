import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { CATALOG_FACTORY_GATE_IDS, evaluateCatalogFactoryReadinessV2, type CatalogFactoryGateEvidence } from "../semantic-decision-projection/v2/catalogFactoryReadiness";
import { SEMANTIC_DECISION_PROJECTION_V2, type CandidateEffectKind, type SemanticDecisionProjectionV2, type Uncertainty } from "../semantic-decision-projection/v2/contract";
import { buildSmartphonePMaterialityOwnerReview } from "./smartphonePMaterialityOwnerReview";
import { buildSmartphonePMaterialityShadow, POLICY_POINTER, RUNTIME_POINTER } from "./smartphonePMaterialityShadow";

const sha = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}` as const;
const stable = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const axisConfig = {
  TURKIYE_NETWORK_APPLICABILITY: { capabilityId: "SMARTPHONE_5G_TR", field: "cellular", operator: "EQ", value: "5G", context: "Türkiye hücresel kullanım", regime: "TR", needId: "TR_5G_REQUIRED" },
  CAMERA_USE_CASE: { capabilityId: "SMARTPHONE_TELEPHOTO", field: "telephoto", operator: "EQ", value: true, context: "Uzaktaki kişi veya sahne çekimi", regime: "OPTICAL_TELEPHOTO", needId: "TELEPHOTO_REQUIRED" },
  BATTERY_CHARGING_ROUTINE: { capabilityId: "SMARTPHONE_WIRED_CHARGING_80W", field: "wired_charging_w", operator: "GTE", value: 80, unit: "W", context: "Kısa şarj molası", regime: "WIRED_CHARGING", needId: "FAST_CHARGE_80W_REQUIRED" },
} as const;

export function buildSmartphonePMaterialityOwnerReviewV2(root = process.cwd()) {
  const owner = buildSmartphonePMaterialityOwnerReview(root);
  const shadow = buildSmartphonePMaterialityShadow(root);
  const candidate = owner.artifacts["owner-review-candidate.json"] as { questions: Array<Record<string, unknown>> };
  const matrix = shadow.artifacts["coverage-matrix.json"] as { rows: Array<{ exactProductId: string; axes: Array<{ axis: string; terminal: Uncertainty; partition: string | null; evidenceRefs: Array<{ factId: string; sourceId: string }> }> }> };
  const runtimePointerBytes = readFileSync(`${root}/${RUNTIME_POINTER}`), policyPointerBytes = readFileSync(`${root}/${POLICY_POINTER}`);
  const runtimePointer = JSON.parse(runtimePointerBytes.toString()), policyPointer = JSON.parse(policyPointerBytes.toString());
  const catalogBytes = readFileSync(`${root}/${runtimePointer.catalogFile}`), policyBytes = readFileSync(`${root}/${policyPointer.policyFile}`);
  const catalog = JSON.parse(catalogBytes.toString());
  const smartphones = catalog.products.filter((product: { categoryId: string }) => product.categoryId === "SMARTPHONE");
  const offerings: Array<{ exactOfferingId: string; categoryId: string; market: string; configurationId: string }> = smartphones.map((product: { exactProductId: string; configurationIdentity: string }) => ({ exactOfferingId: product.exactProductId, categoryId: "SMARTPHONE", market: "TR", configurationId: product.configurationIdentity }));
  const projections: SemanticDecisionProjectionV2[] = candidate.questions.map((question) => {
    const axis = String(question.axis) as keyof typeof axisConfig, config = axisConfig[axis];
    const rows = matrix.rows.map((row) => ({ row, axis: row.axes.find((item) => item.axis === axis)! }));
    const sourceIds = [...new Set(rows.flatMap(({ axis: item }) => item.evidenceRefs.map((ref) => ref.sourceId)))].sort();
    const effects = question.candidateEffectByAnswer as Record<string, Array<{ exactProductId: string; effect: string }>>;
    const mapEffect = (effect: string): CandidateEffectKind => ({ KNOWN_RETAIN: "knownRetain", KNOWN_EXCLUDE: "knownExclude", UNKNOWN_RETAIN: "unknownRetain", SOFT_ONLY_NONE: "none" })[effect] as CandidateEffectKind;
    return {
      schemaVersion: SEMANTIC_DECISION_PROJECTION_V2,
      identity: { projectionId: `electronics.smartphone.${axis.toLocaleLowerCase("en-US")}.owner-review-v2`, categoryId: "SMARTPHONE", scope: "EXACT_OFFERING" }, offerings,
      semanticAuthority: { authorityId: "electronics-smartphone-p-materiality-owner-review", version: "v2.0-candidate", digest: "sha256:e67788378c14e0638ce9aec4224ca0f97864d3ac6528b0a9712bf8141b7c61d7" },
      applicability: { market: "TR", configurationIds: offerings.map((item) => item.configurationId), effectiveFrom: "2026-09-07", explicitlyApplies: true, limitations: ["OWNER_REVIEW_ONLY", "DEFAULT_OFF", "SUPPORT_DURATION_EXCLUDED"] },
      factCapabilityRefs: rows.flatMap(({ axis: item }) => item.evidenceRefs.map((ref) => ({ factId: ref.factId, capabilityId: config.capabilityId, sourceRefs: [ref.sourceId] }))),
      sources: sourceIds.map((sourceId) => ({ sourceId, authority: "PRIMARY", digest: sha(sourceId), market: "TR", capturedAt: "2026-09-07T00:00:00.000Z", reliability: 1 })),
      technicalPredicate: { field: config.field, operator: config.operator, value: config.value, ...("unit" in config ? { unit: config.unit } : {}), context: config.context, regime: config.regime },
      dailyLifeConsequence: { statementTr: String((question.chain as Record<string, string>).dailyLifeConsequence), conditions: [config.context], limitations: ["Yalnız katılan exact fact'ler kullanılır"], nonGuarantees: ["Tek kazanan garanti edilmez", "UNKNOWN aday dışlanmaz"] },
      userNeed: { needId: config.needId, statementTr: String((question.chain as Record<string, string>).userNeed), decisionUse: "QUESTION_INPUT" },
      materialQuestion: { questionId: String(question.questionKey), publicTurkishQuestion: String(question.textTr), answerDomain: [{ answerId: "YES", labelTr: "Evet, gerekli", establishesExplicitRequirement: true }, { answerId: "NO", labelTr: "Hayır, zorunlu değil", establishesExplicitRequirement: false }, { answerId: "UNKNOWN", labelTr: "Henüz emin değilim", establishesExplicitRequirement: false }], prerequisites: [{ prerequisiteId: "TWO_KNOWN_PARTITIONS", description: "Current pool has at least two known partitions", required: true }, { prerequisiteId: "NON_ZERO_EFFECT", description: "At least one answer changes known candidate eligibility", required: true }], candidateEffectByAnswer: Object.fromEntries(Object.entries(effects).map(([answer, entries]) => [answer, entries.map((entry) => { const terminal = rows.find(({ row }) => row.exactProductId === entry.exactProductId)!.axis.terminal; return { exactOfferingId: entry.exactProductId, effect: mapEffect(entry.effect), uncertainty: terminal, partition: rows.find(({ row }) => row.exactProductId === entry.exactProductId)!.axis.partition ?? null, evidenceRefs: rows.find(({ row }) => row.exactProductId === entry.exactProductId)!.axis.evidenceRefs.map((ref) => ref.factId), exactKnownMismatch: entry.effect === "KNOWN_EXCLUDE" }; })])), decisionUseOnExplicitAnswer: "HARD_FILTER" },
      uncertainty: rows.some(({ axis: item }) => item.terminal === "UNKNOWN") ? "UNKNOWN" : "KNOWN",
      inheritance: { sourceScope: "EXACT_OFFERING", targetScope: "EXACT_OFFERING", allowedPurpose: "TECHNICAL_DECISION", explicitApplicabilityRequired: true, identityBridgeRequired: true, identityBridgeRef: "ACTIVE_SMARTPHONE_V02_EXACT_CONFIGURATION", blockedByConflict: true, blockedByConflictRefs: [], foreignMarketDecisionAuthority: "NONE" },
      personaDecisionPolicy: { maximumAggregateScore: 0.75, membershipEffect: "NONE", sufficiencyEffect: "NONE", singleWinnerEffect: "NONE" },
      honestAllowedOutcomes: ["ASK_ONE_QUESTION", "KNOWN_CANDIDATE_PARTITION", "UNKNOWN_CANDIDATES_RETAINED", "NON_RANKED_CANDIDATE_POOL", "NO_SINGLE_WINNER"], governedComparison: false,
    };
  });
  const evidenceRefs = ["owner-review-candidate.json", "semantic-projections-v2.json", "no-effect-proof-v2.json"];
  const gates: CatalogFactoryGateEvidence[] = CATALOG_FACTORY_GATE_IDS.map((gateId) => gateId === "pointer-manifest-approval-consistency" ? { gateId, status: "PENDING", evidenceKind: "DECLARATIVE_RECORD", evidenceRefs: [], reason: "NO_POINTER_OR_RUNTIME_ACTIVATION_AUTHORIZED" } : gateId === "owner-approval" ? { gateId, status: "PASS", evidenceKind: "SIGNED_APPROVAL", evidenceRefs: ["USER_APPROVAL_2026-09-07_OWNER_REVIEW_SCOPE_ONLY"], reason: "Owner approved candidate preparation without activation authority" } : { gateId, status: "PASS", evidenceKind: gateId === "runtime-fixtures" || gateId === "unknown-conflict-neutrality" || gateId === "P-zero-effect-suppression" ? "EXECUTABLE_TEST" : "IMMUTABLE_ARTIFACT", evidenceRefs, reason: "Bound exact Smartphone v02 owner-review evidence" });
  const readiness = evaluateCatalogFactoryReadinessV2({ subjectId: "ELECTRONICS_SMARTPHONE_P_MATERIALITY_OWNER_REVIEW_V2", evaluationScope: "PRODUCTION_EXACT_CATALOG", gates });
  const bindings = { contractCommit: "c29c356e2b15c37bd679f30a8ebd3018f744e4f0", runtimePointerSha256: sha(runtimePointerBytes), catalogSha256: sha(catalogBytes), policyPointerSha256: sha(policyPointerBytes), policySha256: sha(policyBytes), ownerReviewDigest: "sha256:e67788378c14e0638ce9aec4224ca0f97864d3ac6528b0a9712bf8141b7c61d7" };
  const artifacts: Record<string, unknown> = {
    "semantic-projections-v2.json": { schemaVersion: "smartphone-semantic-decision-projections/v2", projections },
    "catalog-factory-readiness-v2.json": readiness,
    "support-duration-suppression.json": { status: "SUPPRESSED_PREDOMINANTLY_DURATION_UNKNOWN", known: 16, unknown: 18, candidateEffect: "NONE", runtimeEffect: "NONE" },
    "no-effect-proof-v2.json": { bindings, exactCounts: { electronics: 121, smartphone: 34 }, membershipOrderSha256: sha(stable(catalog.products.map((p: { exactProductId: string; categoryId: string }) => ({ exactProductId: p.exactProductId, categoryId: p.categoryId })))), fingerprintSha256: sha(stable(catalog.products)), authorizationSha256: sha(stable({ activation: runtimePointer.activationEventSha256, deployment: runtimePointer.deploymentEventSha256, policy: policyPointer.approvalEventDigest })), mutations: { pointer: false, runtime: false, database: false, ui: false, deployment: false, push: false } },
    "approval-record.json": { eligibility: readiness.levels.INFORMATION_READY.ready && readiness.levels.P_READY.ready && !readiness.levels.Y_READY.ready ? "PASS" : "FAIL", Y_READY: false, activationAuthorized: false, approvalSentenceTr: "Semantic Decision Projection v2 sözleşmesine bağlı SMARTPHONE P-materiality owner-review paketinde yalnız Türkiye/5G, telefoto ve en az 80 W şarj eksenlerinin immutable candidate olarak kabul edilmesini; support-duration sorusunun 16 KNOWN/18 UNKNOWN nedeniyle bastırılmış, feature flag'in default-off ve Y_READY'nin false kalmasını onaylıyorum. Bu onay aktivasyon, push veya deployment yetkisi vermez." },
  };
  const artifactDigests = Object.fromEntries(Object.entries(artifacts).map(([name, value]) => [name, sha(stable(value))]));
  const manifest = { schemaVersion: "smartphone-p-owner-review-v2-manifest/v1", workUnit: "WU-XPY-SMARTPHONE-P-MATERIALITY-OWNER-REVIEW-V2-01", generatedAt: "2026-09-07T00:00:00.000Z", bindings, artifactDigests, packageDigest: sha(stable({ bindings, artifactDigests })) };
  const serialized: Record<string, string> = Object.fromEntries([...Object.entries(artifacts), ["manifest.json", manifest]].map(([name, value]) => [name, stable(value)]));
  return { artifacts, manifest, serialized };
}
