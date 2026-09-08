import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { immutableDigest } from "./canonical";
import type { SourceReference, SemanticDecisionProjectionV2 } from "./contract";
import { buildSoftDirectionalProjection, type FactValue } from "./wave1CoreDomains";

type Json = Record<string, unknown>;
interface Mapping {
  readonly field: `technicalFacts.${string}` | `capabilities.${string}`; readonly operator: "EQ" | "GTE" | "LTE"; readonly threshold: string | number | boolean; readonly unit?: string;
  readonly need: string; readonly question: string; readonly context: string; readonly regime: string;
}
export const APPLIANCE_P_MATERIALITY_MAPPINGS: Readonly<Record<string, Mapping>> = Object.freeze({
  AIR_FRYER: { field: "technicalFacts.capacityLitres", operator: "GTE", threshold: 9, unit: "L", need: "Aile porsiyonlarında daha geniş nominal sepet hacmi yönü", question: "Aile porsiyonlarını daha az partiye bölmek için nominal toplam kapasitenin en az 9 litre olması önemli mi?", context: "Aile porsiyonu; litre pişirme sonucu veya porsiyon garantisi değildir", regime: "MANUFACTURER_NOMINAL_CAPACITY" },
  BLENDER: { field: "technicalFacts.jugCapacityLitres", operator: "GTE", threshold: 2, unit: "L", need: "Tek seferde daha geniş sürahi hacmi", question: "Birden fazla porsiyonu tek seferde hazırlamak için sürahi kapasitesinin en az 2 litre olması önemli mi?", context: "Birden fazla porsiyon hazırlama", regime: "MANUFACTURER_JUG_CAPACITY" },
  BUILT_IN_OVEN: { field: "technicalFacts.cavityLitres", operator: "GTE", threshold: 75, unit: "L", need: "Büyük tepsi ve kaplar için daha geniş nominal fırın hacmi", question: "Büyük tepsi veya kaplar için doğrulanmış fırın hacminin en az 75 litre olması önemli mi?", context: "Büyük tepsi ve kap kullanımı; iç ölçüler ayrıca doğrulanır", regime: "MANUFACTURER_CAVITY_VOLUME" },
  COUNTERTOP_MICROWAVE_OVEN: { field: "technicalFacts.controlType", operator: "EQ", threshold: "ELECTRONIC", need: "Elektronik kumanda ile program seçimi", question: "Günlük ısıtmada elektronik kumanda kullanmak sizin için önemli mi?", context: "Günlük ısıtma ve kumanda tercihi", regime: "EXACT_CONTROL_TYPE" },
  DISHWASHER: { field: "technicalFacts.noiseDbA", operator: "LTE", threshold: 44, unit: "dB(A)", need: "Açık mutfakta daha düşük beyan edilen çalışma sesi yönü", question: "Açık mutfakta kullanım için aynı rejimde beyan edilen sesin 44 dB(A) veya altında olması önemli mi?", context: "Açık mutfakta çalışma; yalnız aynı doğrulanmış akustik rejim", regime: "TR_2019_2017_AB_ACOUSTIC" },
  DRYER: { field: "technicalFacts.capacityKg", operator: "GTE", threshold: 10, unit: "kg", need: "Büyük kuru çamaşır yükleri için daha yüksek nominal kapasite yönü", question: "Büyük aile yükleri için beyan edilen kuru yük kapasitesinin en az 10 kg olması önemli mi?", context: "Büyük aile çamaşır yükü; program bazlı azami yük ayrıca geçerlidir", regime: "RATED_DRY_LOAD" },
  ELECTRIC_STORAGE_WATER_HEATER: { field: "technicalFacts.widthMm", operator: "LTE", threshold: 450, unit: "mm", need: "Dar kurulum alanına daha dar gövdeyle yaklaşma", question: "Doğrulanmış kurulum alanınız için cihaz gövdesinin 450 mm veya daha dar olması önemli mi?", context: "Dar banyo kurulumu; servis boşlukları ayrıca doğrulanır", regime: "EXACT_BODY_DIMENSION" },
  FILTER_COFFEE_MACHINE: { field: "technicalFacts.widthMm", operator: "LTE", threshold: 240, unit: "mm", need: "Dar tezgahta daha az gövde genişliği", question: "Dar tezgâhınız için cihaz genişliğinin 240 mm veya altında olması önemli mi?", context: "Dar mutfak tezgâhı", regime: "EXACT_BODY_DIMENSION" },
  FOOD_PROCESSOR: { field: "technicalFacts.bowlCapacityLitres", operator: "GTE", threshold: 3, unit: "L", need: "Toplu hazırlıkta daha geniş nominal hazne yönü", question: "Haftalık toplu hazırlık için hazne kapasitesinin en az 3 litre olması önemli mi?", context: "Haftalık yemek hazırlığı; kullanılabilir hacim işleme türüne bağlıdır", regime: "MANUFACTURER_BOWL_CAPACITY" },
  FREESTANDING_COOKER: { field: "technicalFacts.heatingModeCount", operator: "GTE", threshold: 6, need: "Farklı tarifler için daha geniş beyan edilen ısıtma modu erişimi", question: "Farklı tarifler için en az 6 üretici tanımlı ısıtma modu bulunması önemli mi?", context: "Farklı fırın tarifleri; mod sayısı pişirme kalitesi garantisi değildir", regime: "EXACT_HEATING_MODE_COUNT" },
  FREEZER: { field: "technicalFacts.heightMm", operator: "LTE", threshold: 1750, unit: "mm", need: "Alçak depolama alanına daha kısa gövdeyle yaklaşma", question: "Kurulum yeriniz için gövde yüksekliğinin 1750 mm veya altında olması önemli mi?", context: "Kiler veya depolama alanı; havalandırma boşluğu ayrıca gerekir", regime: "EXACT_BODY_DIMENSION" },
  FULLY_AUTOMATIC_ESPRESSO_MACHINE: { field: "technicalFacts.widthMm", operator: "LTE", threshold: 250, unit: "mm", need: "Dar tezgahta daha az gövde genişliği", question: "Dar tezgâhınız için makine genişliğinin 250 mm veya altında olması önemli mi?", context: "Dar mutfak tezgâhı", regime: "EXACT_BODY_DIMENSION" },
  INSTANTANEOUS_ELECTRIC_WATER_HEATER: { field: "technicalFacts.powerW", operator: "GTE", threshold: 7500, unit: "W", need: "Uygun elektrik tesisatında daha yüksek beyan edilen ısıtma gücü yönü", question: "Yetkili elektrik kontrolü sonrasında beyan edilen gücün en az 7500 W olması önemli mi?", context: "Elektrik hattı ve debi yetkili kurulumla doğrulanır; sıcak su sonucu garanti değildir", regime: "EXACT_RATED_POWER" },
  MANUAL_ESPRESSO_MACHINE: { field: "capabilities.integratedGrinder", operator: "EQ", threshold: true, need: "Ayrı öğütücü olmadan çekirdek öğütme kabiliyeti", question: "Ayrı bir öğütücü kullanmamak için dahili öğütücü önemli mi?", context: "Çekirdekten manuel espresso hazırlama", regime: "EXACT_INCLUDED_CAPABILITY" },
  RANGE_HOOD: { field: "technicalFacts.nominalAirflowM3h", operator: "GTE", threshold: 500, unit: "m³/h", need: "Aynı beyan rejiminde daha yüksek nominal hava debisi yönü", question: "Mutfak planınız için beyan edilen nominal hava debisinin en az 500 m³/h olması önemli mi?", context: "Davlumbaz kanalı, oda ve montaj sonucu değiştirir", regime: "MANUFACTURER_NOMINAL_AIRFLOW" },
  REFRIGERATOR: { field: "technicalFacts.widthMm", operator: "LTE", threshold: 700, unit: "mm", need: "Dar mutfak boşluğuna daha dar gövdeyle yaklaşma", question: "Doğrulanmış mutfak boşluğunuz için gövde genişliğinin 700 mm veya altında olması önemli mi?", context: "Mutfak yerleşimi; kapı açılımı ve servis boşlukları ayrıca doğrulanır", regime: "EXACT_BODY_DIMENSION" },
  ROBOT_VACUUM: { field: "capabilities.autoEmpty", operator: "EQ", threshold: true, need: "Toz haznesini daha seyrek elle boşaltma kabiliyeti", question: "Robotun toz haznesini daha seyrek elle boşaltmak için otomatik boşaltma istasyonu önemli mi?", context: "Günlük ev temizliği; sarf ve bakım ihtiyacı devam eder", regime: "EXACT_INCLUDED_CAPABILITY" },
  TURKISH_COFFEE_MACHINE: { field: "technicalFacts.cupsDeclared", operator: "GTE", threshold: 4, need: "Misafir için tek çevrimde daha fazla beyan edilen fincan kapasitesi yönü", question: "Misafirler için tek çevrimde en az 4 fincan beyanı önemli mi?", context: "Misafir kahvesi; fincan ölçüsü üretici rejimine bağlıdır", regime: "MANUFACTURER_DECLARED_CUPS" },
  VACUUM: { field: "technicalFacts.noiseDbA", operator: "LTE", threshold: 75, unit: "dB(A)", need: "Aynı rejimde daha düşük beyan edilen çalışma sesi yönü", question: "Uzun temizlikte beyan edilen çalışma sesinin 75 dB(A) veya altında olması önemli mi?", context: "Uzun ev temizliği; yalnız karşılaştırılabilir üretici rejimi", regime: "MANUFACTURER_DECLARED_NOISE" },
});

const readJson = async (file: string): Promise<Json> => JSON.parse(await readFile(file, "utf8")) as Json;
const known = (value: unknown): FactValue => typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : "UNKNOWN";
const qualifies = (mapping: Mapping) => (value: Exclude<FactValue, "UNKNOWN">) => mapping.operator === "EQ" ? value === mapping.threshold : typeof value === "number" && typeof mapping.threshold === "number" && (mapping.operator === "GTE" ? value >= mapping.threshold : value <= mapping.threshold);

export async function buildWave1ApplianceProjections(root: string): Promise<readonly SemanticDecisionProjectionV2[]> {
  const base = path.join(root, "data/production/appliances"), projections: SemanticDecisionProjectionV2[] = [];
  for (const entry of await readdir(base, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    let pointer: Json;
    try { pointer = await readJson(path.join(base, entry.name, "active.json")); } catch { continue; }
    if (pointer.lifecycle !== "ACTIVE" || typeof pointer.releaseVersion !== "string") continue;
    const dir = path.join(base, entry.name, "releases", pointer.releaseVersion);
    let artifact: Json | null = null;
    try { for (const file of (await readdir(dir)).filter((item) => item.endsWith(".json")).sort()) { const item = await readJson(path.join(dir, file)); if (Array.isArray(item.products) && item.products.length) { artifact = item; break; } } } catch { continue; }
    if (!artifact) continue;
    const categoryId = String(artifact.productType ?? artifact.categoryId ?? ""), mapping = APPLIANCE_P_MATERIALITY_MAPPINGS[categoryId];
    if (!mapping) continue;
    const sources = ((artifact.sources as Json[]) ?? []).map((item): SourceReference => Object.freeze({ sourceId: String(item.sourceId ?? item.id), authority: "PRIMARY", digest: immutableDigest(item), market: "TR", capturedAt: String(item.accessedAt ?? "2026-09-08T00:00:00.000+03:00"), reliability: String(item.authority ?? "").includes("MANUFACTURER_TR") ? 0.95 : 0.85, locator: String(item.url ?? "artifact-source") }));
    const sourceIds = new Set(sources.map((item) => item.sourceId)), [group, field] = mapping.field.split(".") as ["technicalFacts" | "capabilities", string];
    const candidates = (artifact.products as Json[]).map((product) => ({ id: String(product.productId), configurationId: String(product.configurationIdentity), fact: known((product[group] as Json | undefined)?.[field]), evidenceIds: Object.freeze(((product.evidenceRefs as string[]) ?? []).filter((id) => sourceIds.has(id))) }));
    projections.push(buildSoftDirectionalProjection({ departmentId: "APPLIANCES", categoryId, authorityVersion: pointer.releaseVersion, authorityDigest: `sha256:${String(pointer.artifactSha256 ?? pointer.decisionArtifactSha256)}`, projectionId: `wave1.appliances.${categoryId.toLocaleLowerCase()}.${field}`, questionId: `p.appliances.${categoryId.toLocaleLowerCase()}.${field}`, questionTr: mapping.question, needId: `appliances.${categoryId.toLocaleLowerCase()}.${field}`, needTr: mapping.need, field: mapping.field, operator: mapping.operator, threshold: mapping.threshold, ...(mapping.unit ? { unit: mapping.unit } : {}), context: mapping.context, regime: mapping.regime, candidates, sources: Object.freeze(sources), qualifies: qualifies(mapping) }));
  }
  return Object.freeze(projections.sort((left, right) => left.identity.categoryId.localeCompare(right.identity.categoryId)));
}
