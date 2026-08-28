import { createHash } from "node:crypto";
import type { CatalogFact, CatalogVariantSnapshot } from "@/features/decision/v2/catalog/types";
import { resolveVehicleGallery, resolveVehicleImage } from "@/features/vehicle-data/resolveVehicleImage";
import { v34PriceAuthority } from "@/features/decision/v3/catalogAdapter.server";
import { SALES_ADVISOR_VERSION, VARIANT_CONTENT_SCHEMA_VERSION, type PublicVariantFact, type VariantContentArtifact } from "./types";
import { getReviewedSalesColors, getReviewedSalesFacts, getReviewedSalesMedia } from "./salesKnowledge.server";
import { getEquipmentPublicCopy } from "./equipmentPublicCopy";

const stable = (value: unknown): string => JSON.stringify(value, (_key, item: unknown) => item && typeof item === "object" && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const sha = (value: string): string => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const verified = <T,>(fact: CatalogFact<T> | undefined): fact is CatalogFact<T> => Boolean(fact && fact.confidence === "HIGH" && fact.provenance.length && fact.provenance.every((item) => item.sourceId && item.sourceUrl));
const dailyMeanings: Readonly<Record<string, string>> = {
  bodyStyle: "Gövde yapısı; oturma yüksekliği, park kolaylığı, kabin ve bagaj kullanımını birlikte etkiler.",
  fuelType: "Yakıt türü; şarj ihtiyacı, kullanım maliyeti ve uzun yol planını doğrudan etkiler.",
  power: "Güç değeri hızlanma ve yüklü kullanımdaki rezerv hakkında somut bir referanstır.",
  torque: "Tork, özellikle ilk hareket, ara hızlanma ve yüklü kullanımda aracın çekiş hissini etkiler.",
  engineDisplacement: "Motor hacmi tek başına performansı belirlemez; vergi, tüketim ve motor karakteri değerlendirilirken diğer verilerle birlikte okunur.",
  transmission: "Şanzıman tipi yoğun trafikte kullanım rahatlığını ve aracın hızlanma karakterini etkiler.",
  drivenWheels: "Çekiş düzeni; ıslak, bozuk veya eğimli zemindeki ilerleme karakteriyle direksiyon hissini etkileyebilir.",
  seats: "Koltuk sayısı yasal yolcu kapasitesini gösterir; gerçek diz ve bagaj alanını tek başına anlatmaz.",
  luggage: "Bagaj hacmi günlük eşya ve seyahat yükü için ölçülebilir alanı gösterir.",
  cargoVolume: "Azami yükleme hacmi, koltuk düzeni değiştirildiğinde taşınabilecek hacim hakkında fikir verir.",
  payload: "Taşıma kapasitesi; yolcu, eşya ve aksesuarların toplam ağırlığı için pratik üst sınırı anlamaya yardımcı olur.",
  brakedTowing: "Frenli römork kapasitesi, karavan veya römork planında aşılmaması gereken doğrulanmış sınırı gösterir.",
  length: "Uzunluk; park alanı ihtiyacı, manevra ve kabin yerleşimi üzerinde etkilidir.",
  width: "Genişlik; dar sokak, otopark ve yan yana oturma rahatlığını etkiler.",
  height: "Yükseklik; baş mesafesi, oturma pozisyonu ve kapalı otopark kullanımında önemlidir.",
  wheelbase: "Dingil mesafesi kabin alanı ve sürüş dengesi hakkında ipucu verir; tek başına iç hacmi garanti etmez.",
  range: "Resmî test değeridir; gerçek kullanım menzili hava, hız, yük ve iklimlendirmeye göre değişebilir.",
  consumption: "Birleşik tüketim karşılaştırma referansıdır; şehir içi yoğunluğu, hız ve sürüş biçimi gerçek tüketimi değiştirir.",
  electricConsumption: "Elektrik tüketimi, aynı enerji fiyatıyla farklı elektrikli araçların kullanım giderini karşılaştırmaya yardımcı olur.",
  dcCharge: "Azami DC şarj gücü hızlı şarj potansiyelini gösterir; gerçek hız batarya sıcaklığına ve doluluk oranına göre değişir.",
  batteryCapacity: "Batarya kapasitesi menzil potansiyelini etkiler; aracın tüketimiyle birlikte değerlendirilmelidir.",
  usableBattery: "Kullanılabilir kapasite, sürüş için erişilebilen enerji miktarını gösterir ve brüt kapasiteden farklı olabilir.",
};
const dailyExamples: Readonly<Record<string, string>> = {
  bodyStyle: "Örneğin dar bir şehir sokağında gövde ölçüleri manevrayı; yüksek oturma yapısı ise görüş ve inip binme hissini etkiler.",
  fuelType: "Örneğin sık uzun yol yapan biri yakıt erişimi ve mola düzenini; şehir içinde kullanan biri kısa mesafe verimliliğini birlikte değerlendirebilir.",
  power: "Örneğin sollama, otoyola katılma veya araç yüklüyken hızlanma sırasında kullanılabilecek performans rezervi hakkında fikir verir.",
  torque: "Örneğin yokuşta ilk hareket ederken veya yüklü araçla ara hızlanırken çekiş hissinde fark yaratabilir.",
  transmission: "Örneğin dur-kalk trafikte debriyaj kullanımı gerekip gerekmemesini ve düşük hızdaki sürüş rahatlığını etkiler.",
  drivenWheels: "Örneğin ıslak bir rampada veya gevşek stabilize zeminde gücün hangi tekerleklere aktarıldığı ilerleme karakterini etkileyebilir; lastik seçimi yine belirleyicidir.",
  seats: "Örneğin sürücü dahil düzenli taşınacak kişi sayısı bu değeri aşmamalıdır; tüm koltuklar kullanıldığında bagaj alanı ayrıca kontrol edilmelidir.",
  luggage: "Örneğin valiz, bebek arabası veya haftalık alışveriş yükünün sığıp sığmayacağını karşılaştırırken kullanılabilir.",
  cargoVolume: "Örneğin arka koltuklar yatırıldığında taşınabilecek kutu veya ekipman hacmini karşılaştırmaya yardımcı olur.",
  payload: "Örneğin yolcular, bagaj ve sonradan eklenen aksesuarların toplam ağırlığı bu sınır içinde kalmalıdır.",
  brakedTowing: "Örneğin karavan veya frenli römork planında, römorkun yüklü ağırlığı bu sınırla birlikte ruhsat koşullarına göre kontrol edilir.",
  length: "Örneğin kısa park yerlerine sığma ve dar dönüşlerde aracın kapladığı alan üzerinde doğrudan etkilidir.",
  width: "Örneğin köy içindeki dar geçitlerde, otopark kolonları arasında ve yan yana otururken hissedilen alanı etkiler.",
  height: "Örneğin kapalı otopark girişlerinde toplam yüksekliğin uygunluğu ayrıca kontrol edilmelidir.",
  wheelbase: "Örneğin uzun dingil mesafesi kabin yerleşimine katkı sağlayabilirken dar dönüşlerde manevra hissini etkileyebilir.",
  range: "Örneğin tek şarjla planlanan rota, soğuk hava ve otoyol hızı hesaba katılarak resmî değerden pay bırakılarak planlanmalıdır.",
  consumption: "Örneğin yılda 15.000 km kullanımda iki araç arasındaki küçük tüketim farkı toplam yakıt giderinde belirginleşebilir.",
  electricConsumption: "Örneğin aynı şarj tarifesinde daha düşük kWh/100 km değeri kilometre başına enerji maliyetini azaltabilir.",
  dcCharge: "Örneğin uzun yol molasında ulaşılabilecek şarj süresini etkiler; istasyon gücü ve batarya doluluğu gerçek sonucu değiştirir.",
  batteryCapacity: "Örneğin daha büyük batarya menzil potansiyeli sağlayabilir, ancak tüketim yüksekse tek başına daha uzun menzil garanti etmez.",
  usableBattery: "Örneğin rota planında sürüşe ayrılan gerçek enerji kapasitesini karşılaştırmak için brüt değerden daha doğrudan bir ölçüdür.",
};
const fact = <T,>(key: string, label: string, source: CatalogFact<T> | undefined, format: (value: T) => string, dailyMeaning?: string): PublicVariantFact | undefined => verified(source) ? { key, label, value: format(source.value), disposition: "VERIFIED", ...((dailyMeaning ?? dailyMeanings[key]) ? { dailyMeaning: dailyMeaning ?? dailyMeanings[key] } : {}), ...(dailyExamples[key] ? { dailyExample: dailyExamples[key] } : {}) } : undefined;
const fuel: Record<string, string> = { GASOLINE: "Benzin", DIESEL: "Dizel", LPG: "LPG", MHEV: "Hafif hibrit", HEV: "Hibrit", PHEV: "Şarj edilebilir hibrit", BEV: "Elektrik", HYDROGEN: "Hidrojen" };

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
  const equipment = d.safetyFeatureCodes.filter(verified).map((item) => {
    const publicCopy = getEquipmentPublicCopy(item.value);
    if (!publicCopy) throw new TypeError(`PHASE2_EQUIPMENT_PUBLIC_COPY_MISSING:${item.value}`);
    return { key: item.value, label: "Doğrulanmış donanım", value: publicCopy.label, dailyMeaning: publicCopy.dailyMeaning, disposition: "VERIFIED" as const };
  });
  const image = resolveVehicleImage({ variantId: variant.id, brand: variant.brand, model: variant.model, bodyStyle: d.bodyStyle.value, modelYear: d.modelYear.value });
  const gallery = resolveVehicleGallery({ variantId: variant.id, brand: variant.brand, model: variant.model, bodyStyle: d.bodyStyle.value, modelYear: d.modelYear.value });
  const resolvedMedia = gallery.length ? gallery : image.status === "PLACEHOLDER" ? [] : [image];
  const media = [...resolvedMedia.map((item, index) => ({ url: item.path, alt: `${variant.brand} ${variant.model} ${index + 1}. araç görseli`, disposition: item.status === "EXACT" ? "VERIFIED" as const : "REPRESENTATIVE" as const, label: item.status === "EXACT" ? "Exact varyant görseli" : `Temsilî görsel${item.representedModel ? ` · ${item.representedModel}` : ""}`, ...(item.attributionText ? { attribution: item.attributionText } : {}) })), ...getReviewedSalesMedia(variant.id)];
  const priceAuthority = v34PriceAuthority(variant);
  const price = priceAuthority === "VERIFIED"
    ? { status: "VERIFIED" as const, display: `${variant.activeNewPrice!.amountTry.toLocaleString("tr-TR")} TL`, note: "Kaynak tarihinde doğrulanmış katalog fiyatıdır; güncel satış fiyatı, stok, teslimat, opsiyon ve kampanya koşullarını yetkili satıcıdan doğrulayın." }
    : priceAuthority === "ESTIMATED"
      ? { status: "ESTIMATED" as const, display: "Güncel fiyat doğrulanıyor", note: "Bu araç değerlendirmeye dahil edildi ancak doğrulanmış güncel satış fiyatı henüz bulunmuyor. Güncel fiyat ve stok durumu için yetkili satıcıdan bilgi alın." }
      : { status: "UNAVAILABLE" as const, display: "Güncel fiyat doğrulanıyor", note: "Yetkili güncel fiyat kaydı bulunmadığı için fiyat iddiası gösterilmiyor. Stok, teslimat ve güncel satış koşullarını yetkili satıcıdan doğrulayın." };
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
