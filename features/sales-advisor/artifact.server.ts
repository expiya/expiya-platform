import { createHash } from "node:crypto";
import type { CatalogFact, CatalogVariantSnapshot } from "@/features/decision/v2/catalog/types";
import { resolveVehicleGallery, resolveVehicleImage } from "@/features/vehicle-data/resolveVehicleImage";
import { v34PriceAuthority } from "@/features/decision/v3/catalogAdapter.server";
import { SALES_ADVISOR_VERSION, VARIANT_CONTENT_SCHEMA_VERSION, type PublicVariantFact, type VariantContentArtifact } from "./types";
import { getReviewedSalesColors, getReviewedSalesFacts, getReviewedSalesMedia } from "./salesKnowledge.server";

const stable = (value: unknown): string => JSON.stringify(value, (_key, item: unknown) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const sha = (value: string): string => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const verified = <T,>(fact: CatalogFact<T> | undefined): fact is CatalogFact<T> => Boolean(fact && fact.confidence === "HIGH" && fact.provenance.length && fact.provenance.every((item) => item.sourceId && item.sourceUrl));
const fact = <T,>(key: string, label: string, source: CatalogFact<T> | undefined, format: (value: T) => string, dailyMeaning?: string): PublicVariantFact | undefined => verified(source) ? { key, label, value: format(source.value), disposition: "VERIFIED", ...(dailyMeaning ? { dailyMeaning } : {}) } : undefined;
const fuel: Record<string, string> = { GASOLINE: "Benzin", DIESEL: "Dizel", LPG: "LPG", MHEV: "Hafif hibrit", HEV: "Hibrit", PHEV: "Şarj edilebilir hibrit", BEV: "Elektrik", HYDROGEN: "Hidrojen" };
const equipmentLabels: Readonly<Record<string, string>> = { ADAPTIVE_CRUISE_CONTROL: "Adaptif hız sabitleyici", AEB: "Otomatik acil fren desteği", BLIND_SPOT_WARNING: "Kör nokta uyarısı", DRIVER_ATTENTION_WARNING: "Sürücü dikkat uyarısı", FRONT_REAR_PARK_SENSORS: "Ön ve arka park sensörleri", FRONT_REAR_SIDE_PARK_SENSORS: "Ön, arka ve yan park sensörleri", LKA: "Şerit takip desteği", REAR_CAMERA: "Geri görüş kamerası", SURROUND_VIEW_CAMERA: "360° çevre görüş kamerası", ISOFIX: "ISOFIX çocuk koltuğu bağlantısı" };

export function buildVariantContentArtifact(input: { variant: CatalogVariantSnapshot; catalogRelease: string; catalogFingerprint: string }): VariantContentArtifact {
  const { variant } = input;
  if (variant.market !== "TR" || variant.lifecycleStatus !== "ON_SALE") throw new TypeError("PHASE2_VARIANT_NOT_PUBLISHABLE");
  const d = variant.decisionFacts;
  const facts = [
    fact("bodyStyle", "Gövde", d.bodyStyle, String), fact("fuelType", "Yakıt", d.powertrain.fuelType, (v) => fuel[v] ?? v),
    fact("power", "Güç", d.powertrain.powerKw, (v) => `${v} kW / ${Math.round(v * 1.35962)} bg`, "Güç değeri hızlanma ve yüklü kullanımdaki rezerv hakkında somut bir referanstır."),
    fact("torque", "Tork", d.powertrain.torqueNm, (v) => `${v} Nm`), fact("engineDisplacement", "Motor hacmi", d.powertrain.engineDisplacementCc, (v) => `${v} cm³`),
    fact("transmission", "Şanzıman", d.powertrain.transmission, String), fact("drivenWheels", "Çekiş", d.powertrain.drivenWheels, String), fact("seats", "Koltuk", d.dimensions.seats, (v) => `${v} kişilik`),
    fact("luggage", "Bagaj", d.dimensions.luggageLitres, (v) => `${v} litre`, "Bagaj hacmi günlük eşya ve seyahat yükü için ölçülebilir alanı gösterir."),
    fact("cargoVolume", "Azami yükleme hacmi", d.dimensions.cargoVolumeLitres, (v) => `${v} litre`), fact("payload", "Taşıma kapasitesi", d.dimensions.payloadKg, (v) => `${v} kg`),
    fact("brakedTowing", "Frenli römork kapasitesi", d.dimensions.brakedTowingKg, (v) => `${v} kg`), fact("length", "Uzunluk", d.dimensions.lengthMm, (v) => `${v} mm`),
    fact("width", "Genişlik", d.dimensions.widthMm, (v) => `${v} mm`), fact("height", "Yükseklik", d.dimensions.heightMm, (v) => `${v} mm`), fact("wheelbase", "Dingil mesafesi", d.dimensions.wheelbaseMm, (v) => `${v} mm`),
    fact("range", "Elektrikli menzil", d.efficiency.electricRangeKm, (v) => `${v} km`, "Resmî test değeridir; gerçek kullanım koşullarına göre değişebilir."),
    fact("consumption", "Birleşik tüketim", d.efficiency.combinedLitresPer100Km, (v) => `${v} L/100 km`),
    fact("electricConsumption", "Elektrik tüketimi", d.efficiency.combinedKwhPer100Km, (v) => `${v} kWh/100 km`),
    fact("dcCharge", "DC şarj", d.efficiency.maxDcChargeKw, (v) => `${v} kW`),
    fact("batteryCapacity", "Batarya kapasitesi", d.efficiency.batteryCapacityKwh, (v) => `${v} kWh`), fact("usableBattery", "Kullanılabilir batarya", d.efficiency.batteryUsableKwh, (v) => `${v} kWh`),
  ].filter((item): item is PublicVariantFact => Boolean(item));
  facts.push(...getReviewedSalesFacts(variant.id));
  const equipment = d.safetyFeatureCodes.filter(verified).map((item) => ({ key: item.value, label: "Doğrulanmış donanım", value: equipmentLabels[item.value] ?? item.value.replaceAll("_", " ").toLocaleLowerCase("tr-TR"), disposition: "VERIFIED" as const }));
  const image = resolveVehicleImage({ variantId: variant.id, brand: variant.brand, model: variant.model, bodyStyle: d.bodyStyle.value, modelYear: d.modelYear.value });
  const gallery = resolveVehicleGallery({ variantId: variant.id, brand: variant.brand, model: variant.model, bodyStyle: d.bodyStyle.value, modelYear: d.modelYear.value });
  const resolvedMedia = gallery.length ? gallery : image.status === "PLACEHOLDER" ? [] : [image];
  const media = [...resolvedMedia.map((item, index) => ({ url: item.path, alt: `${variant.brand} ${variant.model} ${index + 1}. araç görseli`, disposition: item.status === "EXACT" ? "VERIFIED" as const : "REPRESENTATIVE" as const, label: item.status === "EXACT" ? "Exact varyant görseli" : `Temsilî görsel${item.representedModel ? ` · ${item.representedModel}` : ""}`, ...(item.attributionText ? { attribution: item.attributionText } : {}) })), ...getReviewedSalesMedia(variant.id)];
  const priceAuthority = v34PriceAuthority(variant);
  const price = priceAuthority === "UNAVAILABLE" ? { status: "UNAVAILABLE" as const, display: "Güncel fiyat doğrulanıyor", note: "Yetkili güncel fiyat kaydı bulunmadığı için fiyat iddiası gösterilmiyor. Stok, teslimat ve güncel satış koşullarını yetkili satıcıdan doğrulayın." } : { status: priceAuthority, display: `${variant.activeNewPrice!.amountTry.toLocaleString("tr-TR")} TL`, note: priceAuthority === "VERIFIED" ? "Kaynak tarihinde doğrulanmış katalog fiyatıdır; güncel satış fiyatı, stok, teslimat, opsiyon ve kampanya koşullarını yetkili satıcıdan doğrulayın." : "Tahmini fiyattır; güncel satış fiyatı, stok, teslimat, opsiyon ve kampanya koşullarını yetkili satıcıdan doğrulayın." };
  const sourceChecksum = sha(stable({ id: variant.id, decisionFacts: variant.decisionFacts, activeNewPrice: variant.activeNewPrice, catalog: input.catalogFingerprint }));
  const colors = getReviewedSalesColors({ brand: variant.brand, model: variant.model, modelYear: d.modelYear.value });
  const base = { schemaVersion: VARIANT_CONTENT_SCHEMA_VERSION, artifactVersion: SALES_ADVISOR_VERSION, exactVariantId: variant.id, catalogRelease: input.catalogRelease, catalogFingerprint: input.catalogFingerprint, title: `${variant.brand} ${variant.model} ${variant.trim}`, identity: { brand: variant.brand, model: variant.model, trim: variant.trim, modelYear: d.modelYear.value }, facts, equipment, colors, media, price, researchStatus: { lastReviewedAt: "2026-08-27", exactFacts: facts.filter((item) => item.disposition === "VERIFIED").length, scopedFacts: facts.filter((item) => item.disposition !== "VERIFIED").length }, sourceChecksum };
  return { ...base, checksum: sha(stable(base)) };
}

export function validateVariantContentArtifact(artifact: VariantContentArtifact, expected: { exactVariantId: string; catalogRelease: string; catalogFingerprint: string }): void {
  if (artifact.schemaVersion !== VARIANT_CONTENT_SCHEMA_VERSION || artifact.artifactVersion !== SALES_ADVISOR_VERSION || artifact.exactVariantId !== expected.exactVariantId || artifact.catalogRelease !== expected.catalogRelease || artifact.catalogFingerprint !== expected.catalogFingerprint) throw new TypeError("PHASE2_ARTIFACT_BINDING_INVALID");
  const { checksum, ...base } = artifact;
  if (checksum !== sha(stable(base))) throw new TypeError("PHASE2_ARTIFACT_CHECKSUM_INVALID");
  if ([...artifact.facts, ...artifact.equipment, ...artifact.colors].some((item) => !["VERIFIED", "FAMILY_LEVEL", "REPRESENTATIVE", "APPROXIMATE", "NO_CLAIM"].includes(item.disposition))) throw new TypeError("PHASE2_ARTIFACT_CLAIM_INVALID");
  if (artifact.video) {
    const allowed = artifact.video.provider === "YOUTUBE" ? /^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]+$/u : /^https:\/\/player\.vimeo\.com\/video\/\d+$/u;
    if (artifact.video.disposition !== "VERIFIED" || !allowed.test(artifact.video.embedUrl) || !/^https:\/\//u.test(artifact.video.sourceUrl)) throw new TypeError("PHASE2_ARTIFACT_VIDEO_INVALID");
  }
}
