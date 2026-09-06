import { APPLIANCES_CATEGORY_REGISTRY, type ActiveAppliancesCategoryId } from "@/features/appliances/categoryRegistry";
import { ELECTRONICS_CATEGORY_REGISTRY, type ElectronicsCategoryId } from "@/features/electronics/architectureBaseline";
import { resolveDepartment, resolveDepartmentCapability } from "./departmentRegistry";

export type ActiveSecretaryDepartmentId = "CARS" | "APPLIANCES" | "ELECTRONICS" | "BABY_AND_CHILD";
export type SecretaryCategoryId = ActiveAppliancesCategoryId | ElectronicsCategoryId | "STROLLER";
export interface SecretaryRouteDescriptor { readonly departmentId: ActiveSecretaryDepartmentId; readonly localizedLabel: string; readonly categoryId?: SecretaryCategoryId; readonly aliases: readonly string[]; readonly destination: string }
export interface SecretaryRouteChoice { readonly label: string; readonly departmentId: ActiveSecretaryDepartmentId; readonly destination: string }
export interface SecretaryUmbrella { readonly aliases: readonly string[]; readonly question: string; readonly categoryIds: readonly SecretaryCategoryId[] }

const APPLIANCE_ALIASES: Partial<Record<ActiveAppliancesCategoryId, readonly string[]>> = {
  WASHING_MACHINE: ["çamaşır makinesi", "çamaşır makinası"], REFRIGERATOR: ["buzdolabı", "buz dolabı"], DISHWASHER: ["bulaşık makinesi", "bulaşık makinası"], DRYER: ["kurutma makinesi", "çamaşır kurutma"],
  VACUUM: ["elektrikli süpürge", "kablolu süpürge", "süpürge"], ROBOT_VACUUM: ["robot süpürge"], FREEZER: ["derin dondurucu"], BUILT_IN_OVEN: ["ankastre fırın", "fırın"], FREESTANDING_COOKER: ["solo fırın", "fırınlı ocak"], HOB: ["ankastre ocak", "ocak"], RANGE_HOOD: ["davlumbaz", "aspiratör"],
  COUNTERTOP_MICROWAVE_OVEN: ["tezgah üstü mikrodalga", "mikrodalga fırın"], BUILT_IN_MICROWAVE_OVEN: ["ankastre mikrodalga"], AIR_PURIFIER: ["hava temizleyici"], FULLY_AUTOMATIC_ESPRESSO_MACHINE: ["tam otomatik kahve makinesi", "tam otomatik espresso makinesi"], MANUAL_ESPRESSO_MACHINE: ["manuel espresso makinesi", "espresso makinesi"],
  FILTER_COFFEE_MACHINE: ["filtre kahve makinesi", "filtre kahve makinası"], TURKISH_COFFEE_MACHINE: ["türk kahvesi makinesi", "türk kahve makinesi", "cezveli kahve makinesi"], AIR_FRYER: ["airfryer", "air fryer", "sıcak hava fritözü"], BLENDER: ["blender"], FOOD_PROCESSOR: ["mutfak robotu"], ELECTRIC_STORAGE_WATER_HEATER: ["termosifon"], INSTANTANEOUS_ELECTRIC_WATER_HEATER: ["elektrikli şofben", "şofben"], SPLIT_AIR_CONDITIONER: ["split klima", "klima"],
};
const ELECTRONICS_ALIASES: Partial<Record<ElectronicsCategoryId, readonly string[]>> = {
  SMARTPHONE: ["akıllı telefon", "cep telefonu", "telefon"], LAPTOP: ["dizüstü bilgisayar", "diz üstü bilgisayar", "masaüstü bilgisayar", "bilgisayar", "laptop"], TABLET: ["tablet"], MONITOR: ["monitör"], TELEVISION: ["televizyon", "tv"], E_READER: ["e kitap okuyucu", "elektronik kitap okuyucu"], HEADPHONES: ["kulaklık", "headset"], PORTABLE_SPEAKER: ["bluetooth hoparlör", "taşınabilir hoparlör"], SOUNDBAR: ["soundbar", "tv ses sistemi", "televizyon ses sistemi", "televizyon için hoparlör"],
  DIGITAL_CAMERA: ["dijital fotoğraf makinesi", "fotoğraf makinesi"], PROJECTOR: ["projektör", "projeksiyon cihazı"], GAME_CONSOLE: ["oyun konsolu"], WIFI_ROUTER_MESH: ["wifi router", "modem router", "mesh sistemi"], NETWORK_ATTACHED_STORAGE: ["nas cihazı", "ağ depolama"], EXTERNAL_STORAGE: ["harici disk", "harici depolama"], PRINTER: ["yazıcı"], WEBCAM: ["web kamera", "webcam"], COMPUTER_AUDIO: ["bilgisayar hoparlörü", "masaüstü hoparlör"], SMARTWATCH: ["akıllı saat"], FITNESS_TRACKER: ["aktivite bilekliği", "akıllı bileklik"], HOME_SECURITY_CAMERA: ["güvenlik kamerası", "ev kamerası"], VIDEO_DOORBELL: ["görüntülü kapı zili"], SMART_HOME_HUB: ["akıllı ev merkezi"], UNINTERRUPTIBLE_POWER_SUPPLY: ["kesintisiz güç kaynağı", "ups"],
};
const route = (departmentId: ActiveSecretaryDepartmentId, localizedLabel: string, aliases: readonly string[], destination: string, categoryId?: SecretaryCategoryId): SecretaryRouteDescriptor => Object.freeze({ departmentId, localizedLabel, aliases: Object.freeze(aliases), destination, ...(categoryId ? { categoryId } : {}) });
export const SECRETARY_ROUTE_DESCRIPTORS: readonly SecretaryRouteDescriptor[] = Object.freeze([
  route("CARS", "Otomobil", ["otomobil", "araba", "araç", "suv", "sedan", "hatchback", "pick up", "pickup", "panelvan", "minibüs"], "/cars?entry=secretary"),
  route("BABY_AND_CHILD", "Bebek arabası", ["bebek arabası", "çocuk arabası", "puset", "travel sistem", "travel system"], "/baby?entry=secretary", "STROLLER"),
  ...APPLIANCES_CATEGORY_REGISTRY.filter(item => item.status === "ACTIVE").map(item => route("APPLIANCES", item.publicLabelTr, APPLIANCE_ALIASES[item.categoryId] ?? [item.publicLabelTr], `/appliances?entry=secretary&category=${item.categoryId}`, item.categoryId)),
  ...ELECTRONICS_CATEGORY_REGISTRY.map(item => route("ELECTRONICS", item.publicLabelTr, ELECTRONICS_ALIASES[item.categoryId] ?? [item.publicLabelTr], `/electronics/analysis?category=${item.categoryId}&entry=secretary`, item.categoryId)),
]);
export const SECRETARY_UMBRELLAS: readonly SecretaryUmbrella[] = Object.freeze([
  { aliases: ["kahve makinesi", "kahve makinası"], question: "Hangi tür kahve makinesi arıyorsunuz?", categoryIds: ["FULLY_AUTOMATIC_ESPRESSO_MACHINE", "MANUAL_ESPRESSO_MACHINE", "FILTER_COFFEE_MACHINE", "TURKISH_COFFEE_MACHINE"] },
  { aliases: ["hoparlör", "ses sistemi"], question: "Nerede kullanacağınız bir ses sistemi arıyorsunuz?", categoryIds: ["PORTABLE_SPEAKER", "SOUNDBAR", "COMPUTER_AUDIO"] },
  { aliases: ["kamera"], question: "Hangi tür kamera arıyorsunuz?", categoryIds: ["DIGITAL_CAMERA", "WEBCAM", "HOME_SECURITY_CAMERA"] },
  { aliases: ["saat"], question: "Akıllı saat mi, aktivite bilekliği mi arıyorsunuz?", categoryIds: ["SMARTWATCH", "FITNESS_TRACKER"] },
  { aliases: ["bilgisayar", "masaüstü bilgisayar"], question: "Dizüstü bilgisayar mı, masaüstü bilgisayar için bir ürün mü arıyorsunuz?", categoryIds: ["LAPTOP", "MONITOR", "COMPUTER_AUDIO"] },
]);
export const SECRETARY_NEGATIVE_COMPOUNDS = Object.freeze(["oyuncak araba", "araba koltuğu", "oto koltuğu", "çocuk koltuğu", "arabalı yatak", "kulaklık aksesuarı", "telefon tamiri", "bilgisayar tamiri", "kapsül kahve makinesi", "pod kahve makinesi"] as const);

const SPELLING_EQUIVALENTS: Readonly<Record<string, string>> = Object.freeze({ makinası: "makinesi", makinasina: "makinesine", turk: "türk", koltugu: "koltuğu", arabasi: "arabası", dizustu: "dizüstü", tasinabilir: "taşınabilir", bulasik: "bulaşık", camasir: "çamaşır", supurge: "süpürge", buzdolabi: "buzdolabı", sofben: "şofben" });
export function normalizeSecretaryPhrase(value: string): string { return value.toLocaleLowerCase("tr-TR").normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ").split(" ").map(token => SPELLING_EQUIVALENTS[token] ?? token).join(" "); }
const suffixes = ["lar", "ler", "ları", "leri", "larda", "lerde", "lardan", "lerden", "ın", "in", "un", "ün", "ı", "i", "u", "ü", "a", "e", "da", "de", "dan", "den", "na", "ne", "nı", "ni", "nu", "nü", "m", "im", "ım", "um", "üm"] as const;
function tokenMatches(token: string, aliasToken: string): boolean { return token === aliasToken || (aliasToken.length >= 3 && suffixes.some(suffix => token === `${aliasToken}${suffix}`)); }
export function containsPhrase(message: string, phrase: string): boolean { const words = normalizeSecretaryPhrase(message).split(" "); const wanted = normalizeSecretaryPhrase(phrase).split(" "); return words.some((_, start) => wanted.every((token, offset) => tokenMatches(words[start + offset] ?? "", token))); }
export function descriptorForCategory(categoryId: SecretaryCategoryId): SecretaryRouteDescriptor | undefined { return SECRETARY_ROUTE_DESCRIPTORS.find(item => item.categoryId === categoryId); }
export function choicesFor(umbrella: SecretaryUmbrella): readonly SecretaryRouteChoice[] { return Object.freeze(umbrella.categoryIds.flatMap(id => { const item = descriptorForCategory(id); return item ? [{ label: item.localizedLabel, departmentId: item.departmentId, destination: item.destination }] : []; })); }
export function validateSecretaryRouteDescriptors(): readonly string[] {
  const issues: string[] = []; const aliases = new Map<string, string>(); const categoryIds = new Set<string>();
  for (const descriptor of SECRETARY_ROUTE_DESCRIPTORS) {
    const department = resolveDepartment(descriptor.departmentId);
    if (!department || department.status !== "ACTIVE") issues.push(`INACTIVE_DEPARTMENT:${descriptor.departmentId}`);
    if (descriptor.categoryId && resolveDepartmentCapability(descriptor.departmentId, descriptor.categoryId)?.status !== "ACTIVE") issues.push(`INACTIVE_CATEGORY:${descriptor.categoryId}`);
    if (!descriptor.destination.startsWith(department?.canonicalPath ?? "#INVALID")) issues.push(`INVALID_ROUTE:${descriptor.destination}`);
    if (!descriptor.aliases.length) issues.push(`NO_ROUTING_METADATA:${descriptor.categoryId ?? descriptor.departmentId}`);
    if (descriptor.categoryId) categoryIds.add(descriptor.categoryId);
    for (const rawAlias of descriptor.aliases) { const alias = normalizeSecretaryPhrase(rawAlias); if (alias.length < 2) issues.push(`UNSAFE_ALIAS:${alias}`); const owner = aliases.get(alias); if (owner && owner !== descriptor.destination) issues.push(`CONFLICTING_ALIAS:${alias}`); aliases.set(alias, descriptor.destination); }
  }
  for (const departmentId of ["APPLIANCES", "ELECTRONICS", "BABY_AND_CHILD"] as const) for (const [id, capability] of Object.entries(resolveDepartment(departmentId)?.capabilities ?? {})) if (capability.status === "ACTIVE" && !categoryIds.has(id)) issues.push(`NO_ROUTING_METADATA:${id}`);
  return Object.freeze(issues);
}
const descriptorIssues = validateSecretaryRouteDescriptors();
if (descriptorIssues.length) throw new TypeError(`SECRETARY_ROUTE_PACK_INVALID:${descriptorIssues.join(",")}`);
