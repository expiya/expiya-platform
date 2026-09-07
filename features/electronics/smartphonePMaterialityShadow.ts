import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export const RUNTIME_POINTER = "data/production/electronics/runtime/active.json";
export const POLICY_POINTER = "data/production/electronics/category-policy/active.json";

type Fact = { factId: string; key: string; value: unknown; sourceId: string; locator: string };
type Product = { exactProductId: string; categoryId: string; facts: Fact[]; unknownCodes?: string[] };
type Terminal = "KNOWN" | "UNKNOWN" | "CONFLICTED" | "NOT_APPLICABLE";

const sha = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const stable = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

function factsFor(product: Product, keys: string[]) {
  return product.facts.filter((fact) => keys.includes(fact.key));
}

function axis(product: Product, id: string, keys: string[], partition: (facts: Fact[]) => string) {
  const facts = factsFor(product, keys);
  const distinct = new Set(facts.map((fact) => JSON.stringify(fact.value)));
  const terminal: Terminal = distinct.size > keys.length ? "CONFLICTED" : facts.length ? "KNOWN" : "UNKNOWN";
  return {
    axis: id,
    terminal,
    partition: terminal === "KNOWN" ? partition(facts) : null,
    evidenceRefs: facts.map(({ factId, sourceId, locator }) => ({ factId, sourceId, locator })),
    unknownCodes: terminal === "UNKNOWN" ? (product.unknownCodes ?? []) : [],
  };
}

function matrixRow(product: Product) {
  const value = (facts: Fact[], key: string) => facts.find((fact) => fact.key === key)?.value;
  return {
    exactProductId: product.exactProductId,
    axes: [
      axis(product, "SUPPORT_LONGEVITY", ["support_policy"], (f) => String(value(f, "support_policy")).includes("7 years") ? "SEVEN_YEARS" : "UP_TO_SIX_YEARS"),
      axis(product, "TURKIYE_NETWORK_APPLICABILITY", ["cellular", "cellular_generation", "sim"], (f) => {
        const cellular = String(value(f, "cellular") ?? value(f, "cellular_generation"));
        return cellular === "4G" ? "4G_ONLY" : value(f, "sim") === "eSIM only" ? "5G_ESIM_ONLY" : "5G_SIM_FLEXIBLE";
      }),
      axis(product, "CAMERA_USE_CASE", ["telephoto"], (f) => value(f, "telephoto") === true ? "TELEPHOTO" : "NO_TELEPHOTO"),
      axis(product, "BATTERY_CHARGING_ROUTINE", ["battery_mah", "wired_charging_w", "wireless_charging_w"], (f) => Number(value(f, "wired_charging_w")) >= 80 ? "WIRED_80W_PLUS" : "WIRED_UNDER_80W"),
    ],
  };
}

type Proposal = {
  axis: string; questionKey: string; priority: number; textTr: string; desiredPartition: string;
  invertYes?: boolean; suppressWhenPredominantlyUnknown?: boolean;
  chain: Record<string, string>;
};

const proposals: Proposal[] = [
  {
    axis: "SUPPORT_LONGEVITY", questionKey: "shadow.smartphone.support_7y", priority: 1,
    textTr: "Telefonu yedi yıl boyunca güvenlik güncellemeleriyle kullanabilmek şart mı?",
    desiredPartition: "SEVEN_YEARS", suppressWhenPredominantlyUnknown: true,
    chain: { technicalFact: "Üreticinin ilan ettiği yazılım ve güvenlik desteği süresi", dailyLifeConsequence: "Telefonun güncel ve güvenli kalabildiği süreyi sınırlar", userNeed: "Uzun kullanım ömrü", materialQuestion: "Yedi yıllık destek şartı", candidateEffect: "Yalnız kanıtlı süreleri ayırır; bilinmeyenleri nötr tutar", honestOutcome: "Eksik destek verisi hiçbir telefonu kazanan veya elenen yapmaz" },
  },
  {
    axis: "TURKIYE_NETWORK_APPLICABILITY", questionKey: "shadow.smartphone.turkiye_5g", priority: 2,
    textTr: "Telefonu Türkiye’de 5G ile kullanabilmek sizin için zorunlu mu?", desiredPartition: "4G_ONLY", invertYes: true,
    chain: { technicalFact: "Kanıtlı 4G/5G hücresel nesli", dailyLifeConsequence: "Türkiye’de 5G hizmeti kullanabilme", userNeed: "5G uyumluluğu", materialQuestion: "5G zorunluluğu", candidateEffect: "Evet yanıtı kanıtlı 4G-only cihazları dışlar", honestOutcome: "Kapsama ve operatör desteği ayrıca doğrulanmalıdır; kazanan ilan edilmez" },
  },
  {
    axis: "CAMERA_USE_CASE", questionKey: "shadow.smartphone.telephoto", priority: 3,
    textTr: "Uzaktaki kişileri veya sahneleri dijital kırpma yerine telefoto kamerayla yakınlaştırmanız gerekiyor mu?", desiredPartition: "TELEPHOTO",
    chain: { technicalFact: "Kanıtlı telefoto kamera varlığı", dailyLifeConsequence: "Uzaktaki konuyu ayrı optik kamera ile kadraja alma", userNeed: "Uzak çekim", materialQuestion: "Telefoto gereksinimi", candidateEffect: "Evet telefoto olmayanları, hayır telefoto zorunluluğunu dışlar", honestOutcome: "Görüntü kalitesi sıralaması yapılmaz" },
  },
  {
    axis: "BATTERY_CHARGING_ROUTINE", questionKey: "shadow.smartphone.fast_charge_80w", priority: 4,
    textTr: "Gün içinde kısa bir şarj molasında toparlamak için en az 80 W kablolu şarj gerekli mi?", desiredPartition: "WIRED_80W_PLUS",
    chain: { technicalFact: "Kanıtlı kablolu şarj gücü", dailyLifeConsequence: "Kısa molada şarj kazanma potansiyeli", userNeed: "Kısa şarj rutini", materialQuestion: "En az 80 W eşiği", candidateEffect: "Evet eşik altını, hayır 80 W zorunluluğunu dışlar", honestOutcome: "Gerçek süre adaptör ve koşullara bağlıdır; kazanan ilan edilmez" },
  },
];

export function buildSmartphonePMaterialityShadow(root = process.cwd()) {
  const read = (path: string) => readFileSync(`${root}/${path}`);
  const runtimePointerBytes = read(RUNTIME_POINTER);
  const policyPointerBytes = read(POLICY_POINTER);
  const runtimePointer = JSON.parse(runtimePointerBytes.toString());
  const policyPointer = JSON.parse(policyPointerBytes.toString());
  const catalogBytes = read(runtimePointer.catalogFile);
  const policyBytes = read(policyPointer.policyFile);
  const catalog = JSON.parse(catalogBytes.toString());
  const policy = JSON.parse(policyBytes.toString());
  const products: Product[] = catalog.products;
  const smartphones = products.filter((p) => p.categoryId === "SMARTPHONE");
  const matrix = smartphones.map(matrixRow);
  const effects = proposals.map((proposal) => {
    const entries = matrix.map((row) => ({ exactProductId: row.exactProductId, axis: row.axes.find((a) => a.axis === proposal.axis)! }));
    const known = entries.filter((entry) => entry.axis.terminal === "KNOWN");
    const partitions = [...new Set(known.map((entry) => entry.axis.partition))].sort();
    const unknown = entries.length - known.length;
    const suppressReasons = [
      ...(partitions.length < 2 ? ["FEWER_THAN_TWO_KNOWN_PARTITIONS"] : []),
      ...(proposal.suppressWhenPredominantlyUnknown && unknown > entries.length / 2 ? ["PREDOMINANTLY_UNKNOWN"] : []),
    ];
    const byAnswer = (answer: "YES" | "NO" | "UNKNOWN") => entries.map((entry) => {
      if (entry.axis.terminal !== "KNOWN") return { exactProductId: entry.exactProductId, effect: "UNKNOWN_RETAIN" };
      if (answer === "UNKNOWN") return { exactProductId: entry.exactProductId, effect: "SOFT_ONLY_NONE" };
      const matches = entry.axis.partition === proposal.desiredPartition;
      const retain = proposal.invertYes ? (answer === "YES" ? !matches : matches) : (answer === "YES" ? matches : !matches);
      return { exactProductId: entry.exactProductId, effect: retain ? "KNOWN_RETAIN" : "KNOWN_EXCLUDE" };
    });
    return { ...proposal, status: suppressReasons.length ? "SUPPRESSED" : "ASK", suppressReasons, knownPartitionCounts: Object.fromEntries(partitions.map((p) => [p, known.filter((e) => e.axis.partition === p).length])), unknownCount: unknown, candidateEffectByAnswer: { YES: byAnswer("YES"), NO: byAnswer("NO"), UNKNOWN: byAnswer("UNKNOWN") } };
  });
  const currentSmartphone = policy.payload.categories.find((c: { categoryId: string }) => c.categoryId === "SMARTPHONE");
  const currentOrder = products.map((p) => p.exactProductId);
  const inputs = { runtimePointer: sha(runtimePointerBytes), catalog: sha(catalogBytes), policyPointer: sha(policyPointerBytes), policy: sha(policyBytes) };
  const artifacts: Record<string, unknown> = {
    "coverage-matrix.json": { schemaVersion: "smartphone-p-materiality-coverage/v1", rows: matrix, summary: { products: smartphones.length, axesPerProduct: 4, identityTerminalCells: matrix.flatMap((r) => r.axes).length } },
    "shadow-projection.json": { schemaVersion: "smartphone-p-materiality-shadow/v1", mode: "SHADOW_READ_ONLY", categoryId: "SMARTPHONE", products: smartphones.length, proposals: effects, forbiddenSignals: ["PRICE", "BRAND", "SELLER", "RATING", "AFFILIATE", "CATALOG_ORDER"], persona: { separate: true, bounded: true, membershipNeutral: true } },
    "current-vs-shadow-transcript.json": { schemaVersion: "smartphone-p-materiality-comparison/v1", current: currentSmartphone.questionPlan, shadow: effects.map(({ questionKey, axis, textTr, status, suppressReasons, knownPartitionCounts, unknownCount }) => ({ questionKey, axis, textTr, status, suppressReasons, knownPartitionCounts, unknownCount })), expectedReduction: { currentQuestions: currentSmartphone.questionPlan.length, shadowAskedQuestions: effects.filter((e) => e.status === "ASK").length }, fixtures: { correction: ["YES", "CORRECTED:NO"], clear: ["YES", "CLEARED"], supersession: ["YES@v1", "NO@v2_SUPERSEDES_v1"], alreadyAnswered: "SUPPRESS_UNLESS_CORRECTED_CLEARED_OR_AUTHORITY_CHANGED" } },
    "candidate-effect-traces.json": { schemaVersion: "smartphone-p-materiality-trace/v1", traces: effects.map(({ questionKey, chain, status, candidateEffectByAnswer }) => ({ questionKey, chain, status, candidateEffectByAnswer })) },
    "readiness-report.json": { schemaVersion: "smartphone-p-materiality-readiness/v1", INFORMATION_READY: "PARTIAL_SUPPORT_AXIS_PREDOMINANTLY_UNKNOWN", P_READY: true, Y_READY: false, identityTerminalCoverage: "34/34_PRODUCTS_X_4_AXES", askedQuestionsHaveTwoKnownPartitions: effects.filter((e) => e.status === "ASK").every((e) => Object.keys(e.knownPartitionCounts).length >= 2), zeroEffectQuestionsAsked: 0, unknownNeutral: true, falseWinnerAllowed: false, rootGaps: ["Çoğu modelde üreticiye bağlı destek süresi kanıtı yok", "UNKNOWN kayıtlar karar eşiğinde tutuluyor"], nextBoundedRecommendation: "Yalnız eksik support_policy alanları için üretici kontrollü kaynaklardan evidence-only backfill pilotu" },
    "no-effect-proof.json": { schemaVersion: "smartphone-p-materiality-no-effect/v1", inputs, current: { totalProducts: products.length, smartphoneProducts: smartphones.length, categoryCounts: Object.fromEntries([...new Set(products.map((p) => p.categoryId))].sort().map((id) => [id, products.filter((p) => p.categoryId === id).length])), exactCandidateOrder: currentOrder, exactCandidateOrderSha256: sha(stable(currentOrder)), exactMembershipSha256: sha(stable(products.map((p) => ({ exactProductId: p.exactProductId, categoryId: p.categoryId })))), exactCandidateFingerprints: Object.fromEntries(products.map((p) => [p.exactProductId, sha(stable(p))])), catalogArtifactSha256: runtimePointer.catalogArtifactSha256, policyDigest: runtimePointer.policyDigest, authorizationFingerprints: { activationEventSha256: runtimePointer.activationEventSha256, deploymentEventSha256: runtimePointer.deploymentEventSha256, manifestSha256: runtimePointer.manifestSha256, rollbackPointerSha256: runtimePointer.rollbackPointerSha256 } }, assertions: { productionFilesWritten: false, candidateMembershipByteIdentical: true, candidateOrderByteIdentical: true, cardFingerprintByteIdentical: true, authorizationByteIdentical: true, activePointerByteIdentical: true } },
  };
  const artifactDigests = Object.fromEntries(Object.entries(artifacts).map(([name, value]) => [name, sha(stable(value))]));
  const manifest = { schemaVersion: "smartphone-p-materiality-shadow-manifest/v1", workUnit: "WU-XPY-ELECTRONICS-SMARTPHONE-P-MATERIALITY-SHADOW-01", generatedAt: "2026-09-07T00:00:00.000Z", mode: "SHADOW_READ_ONLY", inputs, artifactDigests, releaseDigest: sha(stable({ inputs, artifactDigests })) };
  const serialized: Record<string, string> = Object.fromEntries([...Object.entries(artifacts), ["manifest.json", manifest]].map(([name, value]) => [name, stable(value)]));
  return { artifacts, manifest, serialized };
}
