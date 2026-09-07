import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { RUNTIME_POINTER } from "./smartphonePMaterialityShadow";

type Fact = { factId: string; key: string; value: unknown; sourceId: string; locator: string };
type Product = { exactProductId: string; categoryId: string; facts: Fact[]; unknownCodes?: string[] };
type CandidateFact = { type: string; value: string | number | boolean; qualifier?: string; effectiveDate?: string };

const sha = (value: string | Buffer) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const stable = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;

const sources = [
  { sourceId: "apple-tr:security-releases", url: "https://support.apple.com/tr-tr/100100", authority: "MANUFACTURER_TR_SUPPORT", capturedAt: "2026-09-07", claim: "Apple security release eligibility lists iPhone 16e and iPhone 11 or later; it does not promise a future duration or end date." },
  { sourceId: "samsung-tr:z-flip7-fe-business", url: "https://www.samsung.com/tr/business/smartphones/galaxy-z/galaxy-z-flip7-fe-black-128gb-sm-f761bzkgtur/", authority: "MANUFACTURER_TR_PRODUCT", capturedAt: "2026-09-07", claim: "The exact SM-F761B TUR product page states security updates are valid through 31 July 2032." },
  { sourceId: "xiaomi-tr:support-policy", url: "https://www.mi.com/tr/support/faq/details/KA-472328/", authority: "MANUFACTURER_TR_SUPPORT", capturedAt: "2026-09-07", claim: "Xiaomi, Redmi and POCO smartphones typically receive security maintenance for at least two years after first shipment; some models may receive three years or longer." },
  { sourceId: "honor-tr:security-bulletin", url: "https://www.honor.com/tr/support/bulletin/", authority: "MANUFACTURER_TR_SUPPORT", capturedAt: "2026-09-07", claim: "HONOR 400 is currently listed for quarterly security updates; eligibility may change and carrier timing may differ." },
  { sourceId: "huawei-tr:security-bulletin", url: "https://consumer.huawei.com/tr/support/bulletin/", authority: "MANUFACTURER_TR_SUPPORT", capturedAt: "2026-09-07", claim: "Mate X6 and Pura 80 Pro are currently listed for monthly security patch updates; timing may vary by region and model." },
  { sourceId: "nothing-global:phone-3a", url: "https://nothing.tech/products/phone-3a", authority: "MANUFACTURER_PRODUCT", capturedAt: "2026-09-07", claim: "Phone (3a) Series receives three Android updates and six years of security, corrective and functionality updates from first market availability." },
  { sourceId: "tecno-global:camon30-update-announcement", url: "https://www.tecno-mobile.com/pak/news/tecno-camon-30-series-3-years-android-updates-android-16/", authority: "MANUFACTURER_ANNOUNCEMENT", capturedAt: "2026-09-07", claim: "The global CAMON 30 Series announcement promises Android upgrades through Android 16 and three years of security patches, but no Türkiye applicability bridge was found." },
  { sourceId: "general-mobile-tr:phoenix-support", url: "https://www.generalmobile.com/tr/destek/yardim/kullanim-kilavuzlari", authority: "MANUFACTURER_TR_SUPPORT", capturedAt: "2026-09-07", claim: "The support page identifies GM Phoenix 5G but provides no update duration, end date or frequency." },
] as const;

function evidenceFor(product: Product): { terminal: "KNOWN" | "UNKNOWN" | "CONFLICTED"; bridge: string; sourceIds: string[]; candidateFacts: CandidateFact[]; limitations: string[] } {
  const id = product.exactProductId;
  const existing = product.facts.find((fact) => fact.key === "support_policy");
  if (existing) return { terminal: "KNOWN", bridge: "EXISTING_EXACT_CATALOG_FACT", sourceIds: [existing.sourceId], candidateFacts: [{ type: "SUPPORT_POLICY_LITERAL", value: String(existing.value) }], limitations: ["Literal retained without converting upgrade count, security years, or start/end date."] };
  if (id.includes(":apple:")) return { terminal: "KNOWN", bridge: "TR_SECURITY_ELIGIBILITY_MODEL_FAMILY_TO_EXACT_CONFIGURATION", sourceIds: ["apple-tr:security-releases"], candidateFacts: [{ type: "CURRENT_SECURITY_UPDATE_ELIGIBLE", value: true, effectiveDate: "2026-09-07" }], limitations: ["No promised duration, cadence, or end date; configuration does not change OS eligibility."] };
  if (id.includes("galaxy-z-flip7-fe:sm-f761b")) return { terminal: "KNOWN", bridge: "TUR_MODEL_CODE_SM_F761B_TO_EXACT_CONFIGURATION", sourceIds: ["samsung-tr:z-flip7-fe-business"], candidateFacts: [{ type: "SECURITY_SUPPORT_END_DATE", value: "2032-07-31" }], limitations: ["Exact cited page is 128 GB; model-code bridge applies support lifecycle, not storage-specific commerce claims."] };
  if (/:(xiaomi|redmi|poco):/.test(id)) return { terminal: "KNOWN", bridge: "TR_BRAND_WIDE_POLICY_EXPLICITLY_COVERS_XIAOMI_REDMI_POCO", sourceIds: ["xiaomi-tr:support-policy"], candidateFacts: [{ type: "TYPICAL_MIN_SECURITY_MAINTENANCE_YEARS", value: 2, qualifier: "typically; measured from first shipment" }], limitations: ["Not a model guarantee; first-shipment date and exact end date remain unknown."] };
  if (id.includes(":honor:honor-400:")) return { terminal: "KNOWN", bridge: "TR_BULLETIN_NAMES_HONOR_400_TO_DNY_NX9_CONFIGURATIONS", sourceIds: ["honor-tr:security-bulletin"], candidateFacts: [{ type: "CURRENT_SECURITY_UPDATE_FREQUENCY", value: "QUARTERLY", effectiveDate: "2026-09-07" }], limitations: ["Current list may change; carrier rollout can differ; no duration or end date."] };
  if (id.includes(":huawei:mate-x6:")) return { terminal: "KNOWN", bridge: "TR_BULLETIN_NAMES_MATE_X6_TO_12_512_COLOR_CONFIGURATIONS", sourceIds: ["huawei-tr:security-bulletin"], candidateFacts: [{ type: "CURRENT_SECURITY_UPDATE_FREQUENCY", value: "MONTHLY", effectiveDate: "2026-09-07" }], limitations: ["Current schedule only; no duration or end date."] };
  if (id.includes(":huawei:pura-80-pro:")) return { terminal: "KNOWN", bridge: "TR_BULLETIN_NAMES_PURA_80_PRO_TO_12_512_CONFIGURATION", sourceIds: ["huawei-tr:security-bulletin"], candidateFacts: [{ type: "CURRENT_SECURITY_UPDATE_FREQUENCY", value: "MONTHLY", effectiveDate: "2026-09-07" }], limitations: ["Current schedule only; no duration or end date."] };
  if (id.includes(":tecno:camon-30-5g:")) return { terminal: "UNKNOWN", bridge: "REJECTED_GLOBAL_SERIES_WITHOUT_TURKIYE_APPLICABILITY", sourceIds: ["tecno-global:camon30-update-announcement"], candidateFacts: [], limitations: ["Marketing announcement is not treated as a current Türkiye support fact."] };
  if (id.includes(":general-mobile:gm-phoenix-5g:")) return { terminal: "UNKNOWN", bridge: "TR_EXACT_MODEL_PAGE_HAS_NO_POLICY_FACT", sourceIds: ["general-mobile-tr:phoenix-support"], candidateFacts: [], limitations: ["No duration, cadence, end date, or upgrade count found."] };
  return { terminal: "UNKNOWN", bridge: "NO_ACCEPTABLE_PRIMARY_AUTHORITY", sourceIds: [], candidateFacts: [], limitations: ["No exact applicable manufacturer policy evidence found."] };
}

export function buildSmartphoneSupportPolicyBackfill(root = process.cwd()) {
  const pointerBytes = readFileSync(`${root}/${RUNTIME_POINTER}`);
  const pointer = JSON.parse(pointerBytes.toString());
  const catalogBytes = readFileSync(`${root}/${pointer.catalogFile}`);
  const catalog = JSON.parse(catalogBytes.toString());
  const products: Product[] = catalog.products.filter((product: Product) => product.categoryId === "SMARTPHONE");
  const before = products.map((p) => ({ exactProductId: p.exactProductId, terminal: p.facts.some((f) => f.key === "support_policy") ? "KNOWN" : "UNKNOWN" }));
  const rows = products.map((product) => ({ exactProductId: product.exactProductId, ...evidenceFor(product) }));
  const counts = (items: { terminal: string }[]) => Object.fromEntries(["KNOWN", "UNKNOWN", "CONFLICTED", "NOT_APPLICABLE"].map((terminal) => [terminal, items.filter((x) => x.terminal === terminal).length]));
  const sourceSnapshots = sources.map((source) => ({ ...source, snapshotSha256: sha(stable({ url: source.url, capturedAt: source.capturedAt, claim: source.claim })) }));
  const durationKnown = rows.filter((row) => row.candidateFacts.some((fact) => ["SUPPORT_POLICY_LITERAL", "TYPICAL_MIN_SECURITY_MAINTENANCE_YEARS", "SECURITY_SUPPORT_END_DATE"].includes(fact.type)));
  const durationPartitions = { SEVEN_YEARS: durationKnown.filter((r) => r.candidateFacts.some((f) => String(f.value).includes("7 OS"))).length, UP_TO_SIX_YEARS_OR_TYPICAL_TWO: durationKnown.filter((r) => !r.candidateFacts.some((f) => String(f.value).includes("7 OS"))).length };
  const artifacts: Record<string, unknown> = {
    "support-coverage-matrix.json": { schemaVersion: "smartphone-support-policy-coverage/v1", rows, noSilentDrop: rows.length === 34 },
    "source-registry.json": { schemaVersion: "smartphone-support-source-registry/v1", sources: sourceSnapshots },
    "exact-applicability-ledger.json": { schemaVersion: "smartphone-support-applicability/v1", entries: rows.map(({ exactProductId, terminal, bridge, sourceIds, limitations }) => ({ exactProductId, terminal, bridge, sourceIds, limitations })) },
    "before-after-report.json": { schemaVersion: "smartphone-support-before-after/v1", before: counts(before), after: counts(rows), typedFactDiscipline: ["NO_UP_TO_TO_GUARANTEE_CONVERSION", "NO_UPGRADE_COUNT_TO_YEARS_CONVERSION", "NO_FREQUENCY_TO_DURATION_CONVERSION", "NO_ANNOUNCEMENT_TO_CURRENT_FACT_CONVERSION"] },
    "materiality-preview.json": { schemaVersion: "smartphone-support-materiality-preview/v1", mode: "PREVIEW_ONLY", durationEvidenceProducts: durationKnown.length, durationUnknownProducts: 34 - durationKnown.length, knownPartitions: durationPartitions, question: "Telefonu yedi yıl boyunca güvenlik güncellemeleriyle kullanabilmek şart mı?", outcome: 34 - durationKnown.length > 17 ? "SUPPRESSED_PREDOMINANTLY_DURATION_UNKNOWN" : "ASKABLE", unknownEffect: "UNKNOWN_RETAIN", runtimeEffect: "NONE" },
    "readiness-report.json": { schemaVersion: "smartphone-support-backfill-readiness/v1", INFORMATION_READY: rows.every((r) => r.terminal === "KNOWN") ? "READY" : "PARTIAL", P_READY: true, Y_READY: false, coverage: `${rows.length}/34`, before: counts(before), after: counts(rows), commerceEffect: "NONE", runtimeEffect: "NONE", rootGaps: ["OPPO Reno13 F 5G için resmi süre/frekans/end-date authority bulunamadı", "TECNO global duyurusu için Türkiye applicability köprüsü yok", "GM Phoenix 5G resmi destek sayfasında lifecycle policy yok"], nextBoundedRecommendation: "Yalnız OPPO, TECNO Türkiye ve General Mobile resmi destek kanallarından model-kodlu lifecycle belgeleri edin" },
    "no-effect-proof.json": { schemaVersion: "smartphone-support-backfill-no-effect/v1", runtimePointerSha256: sha(pointerBytes), catalogSha256: sha(catalogBytes), catalogArtifactSha256: pointer.catalogArtifactSha256, exactOrderSha256: sha(stable(catalog.products.map((p: Product) => p.exactProductId))), activePointerMutation: false, runtimeMutation: false, shadowDigestMutation: false, rankingMembershipOrderCardAuthorizationUiDbEffect: "NONE" },
  };
  const artifactDigests = Object.fromEntries(Object.entries(artifacts).map(([name, value]) => [name, sha(stable(value))]));
  const manifest = { schemaVersion: "smartphone-support-policy-backfill-manifest/v1", workUnit: "WU-XPY-SMARTPHONE-SUPPORT-POLICY-EVIDENCE-BACKFILL-01", generatedAt: "2026-09-07T00:00:00.000Z", mode: "EVIDENCE_ONLY", pinnedShadowDigest: "sha256:489339776731d2498b2ba115822ab9da95fb13d8b696dfc8d92b1512ffe81f16", inputs: { runtimePointer: sha(pointerBytes), catalog: sha(catalogBytes) }, artifactDigests, releaseDigest: sha(stable({ artifactDigests, pinnedShadowDigest: "sha256:489339776731d2498b2ba115822ab9da95fb13d8b696dfc8d92b1512ffe81f16" })) };
  const serialized: Record<string, string> = Object.fromEntries([...Object.entries(artifacts), ["manifest.json", manifest]].map(([name, value]) => [name, stable(value)]));
  return { artifacts, manifest, serialized };
}
