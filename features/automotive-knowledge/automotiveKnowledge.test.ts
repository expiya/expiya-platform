import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { canonicalJson } from "./canonical";
import { release } from "./content";
import { planAutomotiveKnowledgeResponse } from "./planner";
import { knowledgeReleaseSchema } from "./schema";

describe("Automotive Knowledge Layer v0.1", () => {
  it("routes all bounded public intents deterministically", () => {
    expect(planAutomotiveKnowledgeResponse("Expiya ne yapıyor?")?.intent).toBe("EXPIYA_ORIENTATION");
    expect(planAutomotiveKnowledgeResponse("Sizde ne tür araçlar var?")?.intent).toBe("CATALOG_OVERVIEW");
    expect(planAutomotiveKnowledgeResponse("Dizel ile hibrit arasındaki fark nedir?")?.intent).toBe("AUTOMOTIVE_EDUCATION");
    expect(planAutomotiveKnowledgeResponse("Türkiye otomotiv pazarı 2025 nasıldı?")?.intent).toBe("MARKET_STATISTICS");
    expect(planAutomotiveKnowledgeResponse("Otomobilin tarihini anlatır mısın?")?.intent).toBe("AUTOMOTIVE_HISTORY");
    expect(planAutomotiveKnowledgeResponse("Elektrikli araçların geleceği nasıl görünüyor?")?.intent).toBe("FORECAST_DISCUSSION");
    expect(planAutomotiveKnowledgeResponse("Hibrit olsun")).toBeUndefined();
    expect(planAutomotiveKnowledgeResponse("Otomobil fiyat endeksi ne durumda?")?.intent).toBe("ECONOMIC_INDICATORS");
    expect(planAutomotiveKnowledgeResponse("ÖTV oranı nasıl belirleniyor?")?.intent).toBe("TAX_AND_REGULATION");
    expect(planAutomotiveKnowledgeResponse("Engelli araç ÖTV istisnası nedir?")?.intent).toBe("INCENTIVES");
    expect(planAutomotiveKnowledgeResponse("Hurda teşviki var mı?")).toBeUndefined();
    expect(planAutomotiveKnowledgeResponse("Kasko fiyatları nasıl belirleniyor?")?.intent).toBe("INSURANCE_AND_CLAIMS");
    expect(planAutomotiveKnowledgeResponse("Periyodik bakım ne zaman yapılır?")?.intent).toBe("MAINTENANCE_AND_PARTS");
    expect(planAutomotiveKnowledgeResponse("Fiyat performans analizi nasıl yapılır?")?.intent).toBe("OWNERSHIP_VALUE");
    expect(planAutomotiveKnowledgeResponse("Araç ithalat rejimi nasıl işliyor?")?.intent).toBe("IMPORT_AND_COMPLIANCE");
    expect(planAutomotiveKnowledgeResponse("Taşıt kredisi vadesi nasıl belirleniyor?")?.intent).toBe("FINANCING_AND_CREDIT");
    expect(planAutomotiveKnowledgeResponse("Otonom sürüş seviye 2 ne demek?")?.intent).toBe("AUTONOMOUS_DRIVING");
    expect(planAutomotiveKnowledgeResponse("Elektrikli araç menzilini etkileyen faktörler neler?")?.intent).toBe("EV_RANGE_AND_CHARGING");
    expect(planAutomotiveKnowledgeResponse("Uzmanlar otomotiv geleceği için ne diyor?")?.intent).toBe("EXPERT_PERSPECTIVES");
    expect(planAutomotiveKnowledgeResponse("Güvenli ve ileri sürüş teknikleri nelerdir?")?.intent).toBe("SAFE_AND_ADVANCED_DRIVING");
    expect(planAutomotiveKnowledgeResponse("İkinci el araç alırken ekspertiz raporu yeterli mi?")?.intent).toBe("USED_VEHICLE_DUE_DILIGENCE");
    expect(planAutomotiveKnowledgeResponse("Aracımda geri çağırma var mı?")?.intent).toBe("VEHICLE_RECALLS");
    expect(planAutomotiveKnowledgeResponse("AC DC şarj ve kWh ile kW farkı nedir?")?.intent).toBe("EV_CHARGING_ECOSYSTEM");
    expect(planAutomotiveKnowledgeResponse("Lastik basıncı nasıl belirlenir?")?.intent).toBe("TIRE_SAFETY");
    expect(planAutomotiveKnowledgeResponse("Çocuk koltuğu nasıl seçilir?")?.intent).toBe("CHILD_PASSENGER_SAFETY");
    expect(planAutomotiveKnowledgeResponse("Maddi hasarlı kaza tutanağı nasıl tutulur?")?.intent).toBe("POST_CRASH_GUIDANCE");
    expect(planAutomotiveKnowledgeResponse("Euro NCAP güvenlik yıldızı ne anlatır?")?.intent).toBe("SAFETY_RATINGS");
    expect(planAutomotiveKnowledgeResponse("Elektrikli aracın yaşam döngüsü emisyonu nedir?")?.intent).toBe("ENVIRONMENTAL_IMPACT");
    expect(planAutomotiveKnowledgeResponse("Engelli sürücü için uyarlanmış araç nasıl seçilir?")?.intent).toBe("ACCESSIBLE_MOBILITY");
    expect(planAutomotiveKnowledgeResponse("Yurt dışına araçla çıkarken ne gerekir?")?.intent).toBe("INTERNATIONAL_DRIVING");
    expect(planAutomotiveKnowledgeResponse("Sahte araç ilanı ve kapora dolandırıcılığından nasıl korunurum?")?.intent).toBe("LISTING_AND_PAYMENT_SAFETY");
  });

  it("hands explicit vehicle-selection requests to the Decision Engine", () => {
    expect(planAutomotiveKnowledgeResponse("Euro NCAP ne demek?")?.intent).toBe("SAFETY_RATINGS");
    expect(planAutomotiveKnowledgeResponse("Peki güvenliği yüksek bir araç seçelim")).toBeUndefined();
    expect(planAutomotiveKnowledgeResponse("Elektrikli araç menzili neden düşer?")?.intent).toBe("EV_RANGE_AND_CHARGING");
    expect(planAutomotiveKnowledgeResponse("Benim için uzun menzilli elektrikli araç bul")).toBeUndefined();
    expect(planAutomotiveKnowledgeResponse("İkinci el ekspertiz yeterli mi?")?.intent).toBe("USED_VEHICLE_DUE_DILIGENCE");
    expect(planAutomotiveKnowledgeResponse("O zaman ikinci el bir aile aracı seçelim")).toBeUndefined();
  });

  it("requires complete provenance for every published statistic", () => {
    const parsed = knowledgeReleaseSchema.parse(release);
    const facts = parsed.records.filter((record) => record.knowledgeClass === "CURRENT_MARKET_FACT");
    expect(facts.length).toBeGreaterThan(0);
    for (const record of facts) for (const source of record.provenance) {
      expect(source).toMatchObject({ sourceUrl: expect.any(String), sourceTitle: expect.any(String), publisher: expect.any(String), publishedAt: expect.any(String), period: expect.any(String), market: expect.any(String), retrievedAt: expect.any(String), checksum: expect.stringMatching(/^sha256:/u), locator: expect.any(String) });
    }
  });

  it("keeps economic proxies and legal applicability explicit", () => {
    const prices = planAutomotiveKnowledgeResponse("Otomobil fiyat endeksi ne durumda?");
    expect(prices?.message).toMatch(/ilan fiyat|resmî TÜİK endeksi değildir|otomobile özel fiyat endeksi değildir/iu);
    const tax = planAutomotiveKnowledgeResponse("ÖTV oranı nasıl belirleniyor?");
    expect(tax?.message).toMatch(/tek bir genel oran yoktur|kişiye özel vergi/iu);
    expect(tax?.decisionImpact).toBe("NONE");
  });

  it("fails closed after a time-bounded incentive expires", () => {
    expect(planAutomotiveKnowledgeResponse("Engelli araç ÖTV istisnası nedir?", new Date("2027-01-01T00:00:00.000Z"))).toBeUndefined();
  });

  it("does not invent insurance, maintenance, residual-value or import prices", () => {
    expect(planAutomotiveKnowledgeResponse("Kasko fiyatları nasıl belirleniyor?")?.message).toMatch(/tek bir güncel prim rakamı yoktur|poliçe teklifi değildir/iu);
    expect(planAutomotiveKnowledgeResponse("Periyodik bakım fiyatı nedir?")?.message).toMatch(/tek kilometre, süre veya fiyat yoktur|model yılına özel/iu);
    expect(planAutomotiveKnowledgeResponse("Fiyat performans analizi nasıl yapılır?")?.message).toMatch(/tek bir puan değildir|araçları puanlamaz veya sıralamaz/iu);
    expect(planAutomotiveKnowledgeResponse("Araç ithalat maliyeti nedir?")?.message).toMatch(/tek başına ithalat izni veya toplam maliyet hesabı değildir|ithalat izni veya vergi hesabı değildir/iu);
  });

  it("keeps credit limits distinct from approval and total cost", () => {
    const response = planAutomotiveKnowledgeResponse("Taşıt kredisi vadesi ve aylık taksit nasıl belirleniyor?");
    expect(response?.message).toMatch(/yalnız aylık faiz|toplam maliyet|üst sınırdır|kredi teklifi, onay/iu);
    expect(response?.message).toMatch(/geçici 12|tam elektrikli/iu);
    expect(response?.decisionImpact).toBe("NONE");
  });

  it("keeps automation, range and expert projections bounded", () => {
    const automation = planAutomotiveKnowledgeResponse("Otonom sürüş seviye 2 ne demek?");
    expect(automation?.message).toMatch(/sürücü yolu sürekli izler|pazarlama adları otomasyon seviyesi değildir/iu);
    const range = planAutomotiveKnowledgeResponse("Elektrikli araç menzilini etkileyen faktörler neler?");
    expect(range?.message).toMatch(/sıcaklık|yüksek hız|laboratuvar protokol/iu);
    const experts = planAutomotiveKnowledgeResponse("Uzmanlar otomotiv geleceği için ne diyor?");
    expect(experts?.message).toMatch(/IEA|NHTSA|kurumların tarihli değerlendirmeleridir/iu);
    expect(experts?.decisionImpact).toBe("NONE");
  });

  it("keeps safe and advanced driving instructional content risk-bounded", () => {
    const response = planAutomotiveKnowledgeResponse("İleri sürüş ve viraj tekniği nedir?");
    expect(response?.message).toMatch(/daha hızlı gitmek değildir|tehlikeyi daha erken görmek|uygun kapalı alanda nitelikli eğitmen/iu);
    expect(response?.message).toMatch(/ABS, ESC|fizik sınırlarını ortadan kaldırmaz/iu);
    expect(response?.decisionImpact).toBe("NONE");
    expect(response?.recordIds).toEqual([
      "AK-SAFE-DRIVING-FOUNDATIONS",
      "AK-ADVANCED-DEFENSIVE-DRIVING",
      "AK-DRIVER-ASSISTANCE-SAFETY-BOUNDARY",
    ]);
  });

  it("keeps used-vehicle, recall and listing checks distinct and non-authoritative", () => {
    expect(planAutomotiveKnowledgeResponse("İkinci el araç alırken ekspertiz raporu yeterli mi?")?.message).toMatch(/tek bir ekspertiz|taslaktır|çok kaynaklı/iu);
    expect(planAutomotiveKnowledgeResponse("Aracımda geri çağırma var mı?")?.message).toMatch(/şasi numarası|belirli bir aracın kampanyaya dahil olduğunu söylemez/iu);
    expect(planAutomotiveKnowledgeResponse("Sahte araç ilanı ve güvenli ödeme nedir?")?.message).toMatch(/EİDS|tek başına garanti değildir|kapora/iu);
  });

  it("bounds charging, tyres, child safety and post-crash guidance", () => {
    expect(planAutomotiveKnowledgeResponse("AC DC şarj ve kWh ile kW farkı nedir?")?.message).toMatch(/kW anlık güç|TL\/kWh|kesin süre garantisi değildir/iu);
    expect(planAutomotiveKnowledgeResponse("Lastik basıncı nasıl belirlenir?")?.message).toMatch(/kapı etiketi|lastik yanağındaki|profesyonel/iu);
    expect(planAutomotiveKnowledgeResponse("Çocuk koltuğu nasıl seçilir?")?.message).toMatch(/boyu-kilosu|araç kılavuzu|hukuki zorunluluğun/iu);
    expect(planAutomotiveKnowledgeResponse("Maddi hasarlı kaza tutanağı nasıl tutulur?")?.message).toMatch(/sadece maddi hasarlı|kusuru belirlemez|yaralanma/iu);
  });

  it("prevents safety scores, lifecycle data and accessibility from becoming recommendations", () => {
    expect(planAutomotiveKnowledgeResponse("Euro NCAP güvenlik yıldızı ne anlatır?")?.message).toMatch(/test yılı|benzer tür, boyut ve kütle|evrensel güvenlik sıralaması değildir/iu);
    expect(planAutomotiveKnowledgeResponse("Elektrikli aracın yaşam döngüsü emisyonu nedir?")?.message).toMatch(/beşikten mezara|elektrik.*karışım|Türkiye sonucu gibi sunulamaz/iu);
    const accessible = planAutomotiveKnowledgeResponse("Engelli sürücü için uyarlanmış araç nasıl seçilir?");
    expect(accessible?.message).toMatch(/işlevsel ihtiyaç|uzman sürüş\/rehabilitasyon|Türkiye için ayrıca/iu);
    expect(accessible?.decisionImpact).toBe("NONE");
  });

  it("keeps international-driving guidance country-specific and time-sensitive", () => {
    const response = planAutomotiveKnowledgeResponse("Yurt dışına araçla çıkarken hangi belgeler gerekir?");
    expect(response?.message).toMatch(/transit ülkeler|tek bir AB trafik kuralı olmadığını|seyahatten hemen önce/iu);
    expect(response?.decisionImpact).toBe("NONE");
  });

  it("keeps forecasts conditional and produces no decision facts", () => {
    const response = planAutomotiveKnowledgeResponse("Elektrikli araçların geleceği nasıl görünüyor?");
    expect(response?.decisionImpact).toBe("NONE");
    expect(response?.message).toMatch(/senaryo|varsayım|belirsizlik/iu);
    const keys = (value: unknown): string[] => value && typeof value === "object"
      ? Object.entries(value).flatMap(([key, child]) => [key, ...keys(child)])
      : [];
    expect(keys(release)).not.toEqual(expect.arrayContaining(["candidates", "ranking", "hardConstraint", "preference"]));
  });

  it("regenerates byte-identically", () => {
    expect(canonicalJson(release)).toBe(canonicalJson(JSON.parse(canonicalJson(release))));
  });

  it("resolves the v0.7 release to byte-exact source snapshots", () => {
    const root = process.cwd();
    const registry = JSON.parse(readFileSync(path.join(root, "data/automotive-knowledge/releases/v0.7.0/checksums.json"), "utf8")) as { files: Record<string, string> };
    for (const [relative, expected] of Object.entries(registry.files)) {
      const bytes = readFileSync(path.join(root, "data/automotive-knowledge", relative));
      expect(createHash("sha256").update(bytes).digest("hex"), relative).toBe(expected);
    }
  });

  it("has no imports from Knowledge Layer into Decision Engine", () => {
    const root = process.cwd();
    const walk = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? walk(target) : [target];
    });
    const violations = walk(path.join(root, "features/decision"))
      .filter((file) => /\.(?:ts|tsx)$/u.test(file))
      .filter((file) => readFileSync(file, "utf8").includes("automotive-knowledge"));
    expect(violations).toEqual([]);
  });
});
