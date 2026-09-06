import type { AppliancesDecisionCard } from "../recommendation/publicCard";
import type { AppliancesRuntimeOutcome } from "../contracts";
import { defineXpyStageOnePresentationAdapter, XPY_STAGE_ONE_PRESENTATION_VERSION, type XpyPresentedItem, type XpyStageOneSetPresentation } from "@/features/xpy/stageOnePresentation";

const needLabels: Readonly<Record<string, string>> = {
  PET_HEAD: "Evcil hayvan tüyleri için özel başlık istiyorsunuz.", HEPA: "HEPA düzeyinde filtreleme sizin için önemli.",
  CAPACITY: "Belirttiğiniz kapasite alt sınırı karşılanıyor.", FIT: "Belirttiğiniz kurulum ölçülerine uyum aranıyor.", INSTALLATION_FIT: "Belirttiğiniz kurulum ölçülerine uyum aranıyor.",
  LOW_NOISE: "Daha düşük ses düzeyini önemsiyorsunuz.", LOW_NOISE_PRIORITY: "Daha düşük ses düzeyini önemsiyorsunuz.",
  AUTO_EMPTY: "Toz haznesini otomatik boşaltan bir istasyon istiyorsunuz.", AUTO_OPEN_DRY: "Program sonunda otomatik kapı açılmasını istiyorsunuz.",
  CUTLERY_TRAY: "Ayrı çatal-bıçak çekmecesi istiyorsunuz.", REMOTE_CONTROL: "Desteklenen işlevlerde uzaktan kontrol istiyorsunuz.",
  DETERGENT_CONVENIENCE: "Otomatik deterjan dozajlamayı önemsiyorsunuz.", ECO_RESOURCE: "Doğrulanmış enerji ve su tüketimini önemsiyorsunuz.",
  RADIUS: "Belirttiğiniz çalışma yarıçapı alt sınırı karşılanıyor.", CARRY_MASS: "Taşıma ağırlığını seçim ölçütü yaptınız.",
  FRESH_FOOD_CAPACITY: "Belirttiğiniz taze gıda hacmi alt sınırı karşılanıyor.", FREEZER_CAPACITY: "Belirttiğiniz dondurucu hacmi alt sınırı karşılanıyor.",
  BUDGET_SENSITIVITY: "Belirttiğiniz kesin bütçe üst sınırı karar filtresine alındı.",
};

const capabilityLabels: Readonly<Record<string, string>> = {
  PET_HEAD: "Evcil hayvan tüyü başlığı", HEPA: "HEPA filtre", WASHABLE_FILTER: "Yıkanabilir filtre", TRI_ACTIVE_HEAD: "Çok yüzeyli başlık", HARD_FLOOR_HEAD: "Sert zemin başlığı", CARPET_HEAD: "Halı başlığı",
  SMART_CONNECTIVITY: "Bağlantılı kullanım", REMOTE_CONTROL: "Uzaktan kontrol", AUTO_DOSING: "Otomatik deterjan dozajlama", AUTO_OPEN_DRY: "Otomatik kapı açma", CUTLERY_TRAY: "Çatal-bıçak çekmecesi", AUTO_EMPTY: "Otomatik toz boşaltma", MOPPING: "Paspaslama",
};
const factLabels: Readonly<Record<string, { readonly label: string; readonly unit?: string; readonly values?: Readonly<Record<string, string>> }>> = {
  capacity: { label: "Toz haznesi kapasitesi", unit: "L" }, inputPowerMaxW: { label: "Azami elektrik giriş gücü", unit: "W" }, radiusM: { label: "Çalışma yarıçapı", unit: "m" }, massKg: { label: "Gövde ağırlığı", unit: "kg" }, noiseDbA: { label: "Ses gücü düzeyi", unit: "dB(A)" },
  filtrationStandard: { label: "Filtreleme beyanı", values: { HEPA_LABEL_MANUFACTURER: "Üreticinin HEPA filtre beyanı" } }, widthMm: { label: "Genişlik", unit: "mm" }, heightMm: { label: "Yükseklik", unit: "mm" }, depthMm: { label: "Derinlik", unit: "mm" },
};

const publicValueLabels: Readonly<Record<string, string>> = {
  TR: "Türkiye", CURRENT_TR: "Türkiye'de güncel", TR_LISTED_AVAILABILITY_UNKNOWN: "Türkiye'de listeleniyor; bulunurluk bilinmiyor",
  FREESTANDING: "Solo", HEAT_PUMP: "Isı pompalı", DRYING_ONLY: "Yalnız kurutma", RATED_DRY_LOAD: "Anma kuru yük",
  COUNTERTOP_SOLO: "Solo tezgâh üstü", BUILT_IN: "Ankastre", INDUCTION: "İndüksiyon", ELECTRONIC: "Elektronik", MECHANICAL: "Mekanik",
  GAS_HOB_ELECTRIC_OVEN: "Gazlı ocak ve elektrikli fırın", LPG_GAS_HOB_ELECTRIC_OVEN: "LPG'li ocak ve elektrikli fırın",
};

function publicText(value: string): string {
  return value
    .replace(/\bexact[- ]model\b/giu, "ürün modeli")
    .replace(/\bexact[- ]ürün\b/giu, "ürün")
    .replace(/\bexact konfigürasyona\b/giu, "bu ürün yapılandırmasına")
    .replace(/\bexact konfigürasyonun\b/giu, "bu ürün yapılandırmasının")
    .replace(/\bexact kimliğe\b/giu, "bu ürün kimliğine")
    .replace(/\bexact kurulumda\b/giu, "bu ürünün kurulumunda")
    .replace(/\bexact\s+(?:konfigürasyon|kimlik|kurulum)\p{L}*/giu, "doğrulanmış ürün bilgisi")
    .replace(/\bexact\b/giu, "doğrulanmış")
    .replace(/\bruntime(?:-seçilebilir)?\b/giu, "değerlendirme")
    .replace(/\bnon-dominated\b/giu, "güçlü")
    .replace(/\btie-break\b/giu, "gizli seçim")
    .replace(/\bhard filter\b/giu, "zorunlu koşul")
    .replace(/\bteknik aday\b/giu, "teknik açıdan uygun ürün")
    .replace(/\bkatalog üyeliği\b/giu, "doğrulanmış ürün kaydı");
}

function publicValue(value: string): string {
  const trimmed = value.trim(); const mapped = publicValueLabels[trimmed];
  if (mapped) return mapped;
  if (/^[A-Z][A-Z0-9_]+$/u.test(trimmed)) return trimmed.toLocaleLowerCase("tr-TR").replaceAll("_", " ").replace(/^./u, letter => letter.toLocaleUpperCase("tr-TR"));
  return publicText(trimmed);
}

function publicConfiguration(value: string): string {
  return publicText(value)
    .replaceAll("|", " · ")
    .replace(/\s+\/\s+/gu, " · ")
    .replace(/\bTR\b/gu, "Türkiye")
    .replace(/\bheat-pump\b/giu, "ısı pompalı")
    .replace(/\bdrying-only\b/giu, "yalnız kurutma")
    .replace(/\bcanister\b/giu, "silindir gövdeli");
}

function record(value: unknown): Readonly<Record<string, unknown>> { return value && typeof value === "object" && !Array.isArray(value) ? value as Readonly<Record<string, unknown>> : {}; }
function naturalNeed(item: Readonly<Record<string, unknown>>): string {
  const concept = String(item.conceptId ?? ""); const known = needLabels[concept]; if (known) return known;
  return "Görüşmede belirttiğiniz bu ihtiyaç seçim bağlamında dikkate alındı.";
}
function fact(item: AppliancesDecisionCard["technicalEvidence"][number], explanation?: string): XpyPresentedItem {
  const split = item.statement.split(":"); const rawLabel = split.shift()?.trim() || ""; const rawValue = split.join(":").trim() || item.statement; const semantic = factLabels[rawLabel];
  return { label: semantic?.label ?? (publicValue(rawLabel) || "Doğrulanmış teknik bilgi"), value: semantic?.values?.[rawValue] ?? `${publicValue(rawValue)}${semantic?.unit && !rawValue.includes(semantic.unit) ? ` ${semantic.unit}` : ""}`, explanation: explanation ? publicText(explanation) : undefined };
}
function capabilityKey(value: string): string { return value.replace(/([a-z])([A-Z])/gu, "$1_$2").replace(/[^A-Za-z0-9]+/gu, "_").replace(/^_|_$/gu, "").toUpperCase(); }
function sourceLabel(evidence: Readonly<Record<string, unknown>>): string {
  const authority = String(evidence.sourceAuthority ?? evidence.authority ?? "");
  return authority.includes("REGULATORY") ? "Üretici tarafından yayımlanan resmî ürün bilgi formu" : "Üreticinin Türkiye ürün kaydı";
}

export const APPLIANCES_STAGE_ONE_PRESENTATION = defineXpyStageOnePresentationAdapter<AppliancesDecisionCard>({
  adapterId: "appliances-stage1-presentation/v1", version: XPY_STAGE_ONE_PRESENTATION_VERSION,
  project(card) {
    const daily = card.dailyLife.map(item => item.statement);
    const technicalFacts = card.technicalEvidence.map((item, index) => fact(item, daily[index]));
    const sources = [...new Map([...card.technicalEvidence, ...card.capabilities, ...card.warranty].map(item => {
      const evidence = record(item.evidence); const label = sourceLabel(evidence); const href = typeof evidence.canonicalReference === "string" && evidence.canonicalReference.startsWith("https://") ? evidence.canonicalReference : undefined;
      return [`${label}:${href ?? ""}`, { label, href }] as const;
    })).values()];
    const commerce = card.currentCommerce; const governedMedia = card.currentMedia;
    const offers = commerce ? commerce.offers.map(item => ({ merchant: item.marketplace && item.seller ? `${item.merchant} · Satıcı: ${item.seller}` : item.merchant, amount: item.amount, currency: item.currency, observedAt: item.observedAt, availability: item.availability === "IN_STOCK" ? "Stokta" : item.availability === "LIMITED" ? "Sınırlı stok" : "Stok durumu doğrulanamadı", href: item.canonicalListingUrl })) : card.price.status === "READY" ? card.price.observations.flatMap(item => { const value = record(item); const amount = Number(value.amountTRY ?? value.priceTRY ?? value.amount); const observedAt = String(value.observedAt ?? value.observedDate ?? ""); if (!Number.isFinite(amount) || !observedAt) return []; return [{ merchant: String(value.merchantName ?? value.merchant ?? "Doğrulanmış satıcı"), amount, currency: "TRY" as const, observedAt, availability: String(value.availabilityLabel ?? "Gözlem tarihinde listeleniyordu"), href: typeof value.url === "string" ? value.url : undefined }]; }) : [];
    return {
      schemaVersion: XPY_STAGE_ONE_PRESENTATION_VERSION,
      exactIdentity: { id: card.identity.productId, brand: card.identity.brand, model: card.identity.model, configuration: publicConfiguration(card.identity.configurationIdentity) },
      media: governedMedia?.src ? {
        status: governedMedia.status === "EXACT" || governedMedia.status === "AFFILIATE" ? "EXACT" : "REPRESENTATIVE",
        src: governedMedia.src, alt: governedMedia.alt,
        authorityLabel: governedMedia.status === "EXACT" ? "İzin ve ürün kimliği doğrulanmış görsel" : governedMedia.status === "AFFILIATE" ? "İş ortaklığı API’sinden süreli ürün görseli" : "Temsilî görsel; ürünün birebir fotoğrafı değildir",
        provenanceDigest: governedMedia.releaseDigest, linkTarget: governedMedia.linkTarget,
        disclosure: governedMedia.disclosure, cacheMode: governedMedia.cacheMode,
      } : { status: "REPRESENTATIVE", src: "/appliances/representative/owned-category-catalog.svg", alt: `${card.identity.brand} ${card.identity.model} için temsilî ev ürünü illüstrasyonu`, authorityLabel: "Temsilî görsel; ürünün birebir fotoğrafı değildir", disclosure: "Temsilî illüstrasyon; ürünün birebir fotoğrafı değildir.", cacheMode: "PERSISTENT" },
      badge: "Doğrulanmış karar sonucu · Aşama 1", reasons: card.reasons.map(publicText),
      matchedNeeds: card.acceptedNeeds.map(naturalNeed), supportingContext: card.nonSelectionNeeds.map(naturalNeed), technicalFacts,
      capabilities: card.capabilities.map(item => { const evidence = record(item.evidence); const id = capabilityKey(String(evidence.capabilityId ?? item.statement.split(":")[0])); return { label: capabilityLabels[id] ?? id.toLocaleLowerCase("tr-TR").replaceAll("_", " ").replace(/\b\w/gu, letter => letter.toLocaleUpperCase("tr-TR")), explanation: "Yalnız üreticinin belirttiği kapsam ve koşullarda; kullanım sonucu garantisi değildir." }; }),
      limitations: [...new Set([...card.limitations, ...card.disclosures.map(item => item.message), ...card.warranty.map(item => item.statement.replace(/\s*\([^)]*\)\.?$/u, "."))])].filter(item => !(offers.length > 0 && /güncel fiyat bilinmiyor/iu.test(item))).map(publicText),
      offers, commerceNotice: publicText(commerce?.coverageNotice ?? (card.price.status === "STALE" ? "Mevcut fiyat gözleminin süresi dolmuş. Güncel bütçe uyumu veya satışta bulunurluk iddia edilmiyor." : "Bu ürün için güncel ve doğrulanmış satıcı teklifi bulunmuyor. Katalogda yer alması, şu anda satışta olduğu anlamına gelmez.")),
      sources: [...sources, ...(commerce?.media ? [{ label: "Üretici görsel kaynağı", href: commerce.media.canonicalProductPage, observedAt: commerce.media.verifiedAt }] : [])], audit: { "Yetkilendirme izi": card.provenance.authorizationFingerprint, "Karar kaydı izi": card.provenance.artifactFingerprint, "Katalog sürümü": card.provenance.catalog, "Bağlam sürümü": card.provenance.contextRevision, ...(commerce ? { "Sunum veri anlık görüntüsü": commerce.snapshotId, "Sunum veri izi": commerce.snapshotDigest } : {}) },
    };
  },
});

export function projectAppliancesSet(selection: NonNullable<Extract<AppliancesRuntimeOutcome, { kind: "ASK" | "CLARIFY" }>["selectionState"]>): XpyStageOneSetPresentation {
  const disclosures = [...new Set(selection.disclosures.map(item => publicText(item.message)))];
  return { schemaVersion: XPY_STAGE_ONE_PRESENTATION_VERSION, kind: selection.kind === "TRADE_OFF_SET_EXPLANATION" ? "NON_DOMINATED_SET" : "TIED_TOP_SET", departmentLabel: "Ev ürünleri", categoryLabel: "Aşama 1 kararı", title: selection.kind === "TRADE_OFF_SET_EXPLANATION" ? "Seçenekler farklı güçlü yönler taşıyor" : "Tek bir ürün doğrulanmış olarak öne çıkmıyor", explanation: `${selection.identities.length} doğrulanmış ürün kaldı; hiçbiri fiyat, katalog sırası veya gizli puanlamayla kazanan ilan edilmedi.`, candidates: selection.identities.map(product => ({ id: product.productId, name: `${product.brand} ${product.model}`, configuration: product.configurationIdentity ? publicConfiguration(product.configurationIdentity) : undefined })), unresolved: disclosures.length ? disclosures : ["Sizin için vazgeçilmez olan kullanım farkını belirtin; seçenekleri yeniden değerlendirelim."] };
}
