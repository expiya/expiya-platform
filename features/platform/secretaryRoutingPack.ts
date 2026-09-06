import type { AppliancesProductType } from "@/features/appliances/contracts";
import type { ElectronicsCategoryId } from "@/features/electronics/architectureBaseline";
import { resolveDepartment, resolveDepartmentCapability } from "./departmentRegistry";

export type ActiveSecretaryDepartmentId = "CARS" | "APPLIANCES" | "ELECTRONICS" | "BABY_AND_CHILD";
export interface SecretaryRouteDescriptor { readonly departmentId: ActiveSecretaryDepartmentId; readonly localizedLabel: string; readonly categoryId?: AppliancesProductType | ElectronicsCategoryId | "STROLLER"; readonly aliases: readonly string[]; readonly destination: string }
const route = (descriptor: SecretaryRouteDescriptor) => Object.freeze(descriptor);

export const SECRETARY_ROUTE_DESCRIPTORS: readonly SecretaryRouteDescriptor[] = Object.freeze([
  route({ departmentId: "CARS", localizedLabel: "Otomobil", aliases: ["araba", "otomobil", "araç", "suv", "sedan", "hatchback", "pick up", "pickup", "panelvan", "minibüs"], destination: "/cars?entry=secretary" }),
  route({ departmentId: "BABY_AND_CHILD", localizedLabel: "Bebek arabası", categoryId: "STROLLER", aliases: ["bebek arabası", "puset", "travel sistem", "çocuk arabası"], destination: "/baby?entry=secretary" }),
  route({ departmentId: "APPLIANCES", localizedLabel: "Çamaşır makinesi", categoryId: "WASHING_MACHINE", aliases: ["çamaşır makinesi"], destination: "/appliances?entry=secretary&category=WASHING_MACHINE" }),
  route({ departmentId: "APPLIANCES", localizedLabel: "Kurutma makinesi", categoryId: "DRYER", aliases: ["kurutma makinesi", "kurutma makineleri", "kurutma"], destination: "/appliances?entry=secretary&category=DRYER" }),
  route({ departmentId: "APPLIANCES", localizedLabel: "Buzdolabı", categoryId: "REFRIGERATOR", aliases: ["buzdolabı"], destination: "/appliances?entry=secretary&category=REFRIGERATOR" }),
  route({ departmentId: "APPLIANCES", localizedLabel: "Bulaşık makinesi", categoryId: "DISHWASHER", aliases: ["bulaşık makinesi"], destination: "/appliances?entry=secretary&category=DISHWASHER" }),
  route({ departmentId: "APPLIANCES", localizedLabel: "Robot süpürge", categoryId: "ROBOT_VACUUM", aliases: ["robot süpürge"], destination: "/appliances?entry=secretary&category=ROBOT_VACUUM" }),
  route({ departmentId: "APPLIANCES", localizedLabel: "Hava temizleyici", categoryId: "AIR_PURIFIER", aliases: ["hava temizleyici"], destination: "/appliances?entry=secretary&category=AIR_PURIFIER" }),
  route({ departmentId: "APPLIANCES", localizedLabel: "Solo fırın", categoryId: "FREESTANDING_COOKER", aliases: ["solo fırın", "fırınlı ocak"], destination: "/appliances?entry=secretary&category=FREESTANDING_COOKER" }),
  route({ departmentId: "APPLIANCES", localizedLabel: "Ankastre fırın", categoryId: "BUILT_IN_OVEN", aliases: ["ankastre fırın", "fırın"], destination: "/appliances?entry=secretary&category=BUILT_IN_OVEN" }),
  route({ departmentId: "APPLIANCES", localizedLabel: "Ev tipi klima", categoryId: "SPLIT_AIR_CONDITIONER", aliases: ["split klima", "ev tipi klima", "klima"], destination: "/appliances?entry=secretary&category=SPLIT_AIR_CONDITIONER" }),
  route({ departmentId: "APPLIANCES", localizedLabel: "Ev ürünleri", aliases: ["beyaz eşya", "ev aleti", "ev ürünü"], destination: "/appliances?entry=secretary" }),
  route({ departmentId: "ELECTRONICS", localizedLabel: "Dizüstü bilgisayar", categoryId: "LAPTOP", aliases: ["dizüstü bilgisayar", "masaüstü bilgisayar", "bilgisayar", "laptop"], destination: "/electronics/analysis?category=LAPTOP&entry=secretary" }),
  route({ departmentId: "ELECTRONICS", localizedLabel: "Akıllı telefon", categoryId: "SMARTPHONE", aliases: ["akıllı telefon", "telefon"], destination: "/electronics/analysis?category=SMARTPHONE&entry=secretary" }),
  route({ departmentId: "ELECTRONICS", localizedLabel: "Tablet", categoryId: "TABLET", aliases: ["tablet"], destination: "/electronics/analysis?category=TABLET&entry=secretary" }),
  route({ departmentId: "ELECTRONICS", localizedLabel: "Televizyon", categoryId: "TELEVISION", aliases: ["televizyon", "tv"], destination: "/electronics/analysis?category=TELEVISION&entry=secretary" }),
  route({ departmentId: "ELECTRONICS", localizedLabel: "Monitör", categoryId: "MONITOR", aliases: ["monitör"], destination: "/electronics/analysis?category=MONITOR&entry=secretary" }),
  route({ departmentId: "ELECTRONICS", localizedLabel: "Akıllı saat", categoryId: "SMARTWATCH", aliases: ["akıllı saat"], destination: "/electronics/analysis?category=SMARTWATCH&entry=secretary" }),
  route({ departmentId: "ELECTRONICS", localizedLabel: "Taşınabilir hoparlör", categoryId: "PORTABLE_SPEAKER", aliases: ["taşınabilir hoparlör"], destination: "/electronics/analysis?category=PORTABLE_SPEAKER&entry=secretary" }),
]);
export const SECRETARY_NEGATIVE_COMPOUNDS = Object.freeze(["oyuncak araba", "araba koltuğu", "araba koltugu", "bebek oto koltuğu", "bebek oto koltugu", "arabalı yatak", "arabali yatak"] as const);
export function normalizeSecretaryPhrase(value: string): string { return value.toLocaleLowerCase("tr-TR").normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " "); }
export function containsPhrase(message: string, phrase: string): boolean { return (` ${message} `).includes(` ${normalizeSecretaryPhrase(phrase)} `); }
export function validateSecretaryRouteDescriptors(): readonly string[] {
  const issues: string[] = []; const aliases = new Map<string, string>();
  for (const descriptor of SECRETARY_ROUTE_DESCRIPTORS) {
    const department = resolveDepartment(descriptor.departmentId);
    if (!department || department.status !== "ACTIVE") issues.push(`INACTIVE_DEPARTMENT:${descriptor.departmentId}`);
    if (descriptor.categoryId && resolveDepartmentCapability(descriptor.departmentId, descriptor.categoryId)?.status !== "ACTIVE") issues.push(`INACTIVE_CATEGORY:${descriptor.categoryId}`);
    if (!descriptor.destination.startsWith(department?.canonicalPath ?? "#INVALID")) issues.push(`INVALID_ROUTE:${descriptor.destination}`);
    for (const rawAlias of descriptor.aliases) { const alias = normalizeSecretaryPhrase(rawAlias); const owner = aliases.get(alias); if (owner && owner !== descriptor.destination) issues.push(`CONFLICTING_ALIAS:${alias}`); aliases.set(alias, descriptor.destination); }
  }
  return Object.freeze(issues);
}
const descriptorIssues = validateSecretaryRouteDescriptors();
if (descriptorIssues.length) throw new TypeError(`SECRETARY_ROUTE_PACK_INVALID:${descriptorIssues.join(",")}`);
