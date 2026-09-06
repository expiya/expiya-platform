import { APPLIANCES_VISUAL_PACK, BABY_VISUAL_PACK, CARS_VISUAL_PACK, ELECTRONICS_VISUAL_PACK } from "./visualPacks";
import { defineDepartmentLandingPack, XPY_DEPARTMENT_LANDING_VERSION } from "./departmentLanding";
import { APPLIANCES_CATEGORY_REGISTRY } from "@/features/appliances/categoryRegistry";
import { appliancesCategoryFallback } from "@/features/appliances/media/categoryFallbacks";
import { ELECTRONICS_CATEGORY_REGISTRY } from "@/features/electronics/architectureBaseline";

const xpy = [
  { letter: "X", title: "X Assistant", description: "İhtiyaçlarını kendi cümlelerinle anlatabileceğin konuşma katmanı." },
  { letter: "P", title: "P Question Planner", description: "Kararı etkileyen eksik bilgileri doğru sırayla netleştiren soru planı." },
  { letter: "Y", title: "Y Decision Maker", description: "Yalnızca doğrulanmış bilgilerle seçenekleri değerlendirip gerekçeli karar sunan katman." },
] as const;

export const CARS_LANDING_PACK = defineDepartmentLandingPack({
  version: XPY_DEPARTMENT_LANDING_VERSION,
  departmentId: "CARS",
  canonicalPath: "/cars",
  visualPack: CARS_VISUAL_PACK,
  eyebrow: "Otomobil seçim asistanı",
  headline: ["Sizin için doğru arabayı", "birlikte bulalım"],
  supportingCopy: "İhtiyaçlarınızı anlatın; seçenekleri bir arkadaş gibi konuşup sonunda net ve gerekçeli bir karara ulaşalım.",
  primaryCta: { label: "Aracımı bul", href: "/cars#asama-1" },
  secondaryCta: { label: "Nasıl çalışır?", href: "#nasil-calisir" },
  categories: [
    { id: "NEW_CAR", label: "Sıfır araç seçimi", description: "Türkiye pazarı için yayınlanmış araç kataloğunda ihtiyacını netleştir.", href: "/cars#asama-1", availability: "AVAILABLE" },
  ],
  works: [
    { title: "İhtiyacını anlar", description: "Kullanımını, bütçeni ve yeni aracından beklentilerini sohbetle netleştirir." },
    { title: "Seçenekleri değerlendirir", description: "Yayınlanmış katalog ve kanıt sınırları içinde seçeneklerin uyumunu değerlendirir." },
    { title: "Kararı netleştirir", description: "Önceliklerine bağlı, gerekçesi görünür bir karar yolu sunar." },
  ],
  xpy,
  stages: [
    { id: "STAGE_1_DECISION", label: "AŞAMA 1 · Karar görüşmesi", description: "İhtiyaçlarını konuş; karar ölçütlerini ve uygun seçenekleri netleştir.", href: "/cars#asama-1", availability: "AVAILABLE" },
    { id: "STAGE_2_EVALUATION", label: "AŞAMA 2 · Değerlendirme", description: "AŞAMA 1'de seçtiğin aracın ayrıntılı değerlendirmesine güvenli biçimde ilerle.", href: "/cars#asama-1", availability: "REQUIRES_HANDOFF" },
    { id: "STAGE_3_ACTION", label: "AŞAMA 3 · Güvenli talep", description: "Araç değerlendirmesinden teklif, test sürüşü veya bayi iletişimi adımına geç.", href: "/cars#asama-1", availability: "REQUIRES_HANDOFF" },
  ],
  trust: { title: "Kararın kaynağı ve sınırı görünür", description: "Sonuçlar doğrulanmış katalog bilgileriyle açıklanır; eksik veya güncel olmayan bilgiler açıkça belirtilir.", points: ["Gerekçeli sonuç", "Kaynak ve güncellik açıklaması", "Eksik bilgide açık uyarı"] },
  footerCopy: "Expiya Cars, yapay zekâ destekli sıfır araç karar deneyimidir.",
});

const applianceCategories = APPLIANCES_CATEGORY_REGISTRY.map(category => ({
  id: category.categoryId,
  label: category.publicLabelTr,
  description: category.status === "ACTIVE"
    ? "Bu kategori için aktif karar görüşmesini başlat."
    : "Bu kategori için doğrulanmış ürün bilgileri tamamlandığında görüşme kullanıma açılacak.",
  href: category.route,
  availability: category.status === "ACTIVE" ? "AVAILABLE" as const : "UNAVAILABLE" as const,
  visual: appliancesCategoryFallback(category.categoryId, category.publicLabelTr),
}));

export const APPLIANCES_LANDING_PACK = defineDepartmentLandingPack({
  version: XPY_DEPARTMENT_LANDING_VERSION,
  departmentId: "APPLIANCES",
  canonicalPath: "/appliances",
  visualPack: APPLIANCES_VISUAL_PACK,
  eyebrow: "Ev ürünleri seçim asistanı",
  headline: ["Eviniz için doğru ürünü", "birlikte bulalım"],
  supportingCopy: "İhtiyacınızı anlatın; 24 aktif ev ürünü kategorisinde karar ölçütlerinizi konuşarak netleştirelim.",
  heroImage: { src: "/appliances/appliances-landing-hero.png", alt: "", sizes: "100vw" },
  primaryCta: { label: "Görüşmeye başla", href: "/appliances#asama-1" },
  secondaryCta: { label: "Kategorileri keşfet", href: "#asama-1" },
  categories: applianceCategories,
  works: [
    { title: "İhtiyacını anlar", description: "Alanını, kullanım biçimini ve önceliklerini sohbetle netleştirir." },
    { title: "Doğru soruları planlar", description: "Seçtiğin kategoriye göre kararı etkileyen eksik bilgileri sıraya koyar." },
    { title: "Bilmediğini açıkça söyler", description: "Değerlendirmeyi yalnız seçtiğin ürün için açar; güncel fiyat, stok veya satış imkânı yoksa bunu açıkça belirtir." },
  ],
  xpy,
  stages: [
    { id: "STAGE_1_DECISION", label: "AŞAMA 1 · Karar görüşmesi", description: "Aktif. 24 kategoride ihtiyacını ve karar ölçütlerini konuş.", href: "/appliances#asama-1", availability: "AVAILABLE" },
    { id: "STAGE_2_EVALUATION", label: "AŞAMA 2 · Ürün değerlendirmesi", description: "Yalnız AŞAMA 1’de seçtiğin güncel ürün kartından açılır; ürünün teknik bilgilerini ve günlük kullanımdaki karşılığını gösterir.", href: "/appliances#asama-1", availability: "REQUIRES_HANDOFF" },
    { id: "STAGE_3_ACTION", label: "AŞAMA 3 · Güvenli talep", description: "Kullanıma açık değil. Satıcı, teklif, stok, ödeme, sipariş ve veri aktarımı desteklenmiyor.", href: "/appliances/stage/3", availability: "UNAVAILABLE" },
  ],
  trust: { title: "Doğrulanmayanı vaat etmez", description: "Her ürün yalnız doğrulanmış bilgilerle anlatılır; bulunmayan fiyat, stok ve satıcı bilgileri tahmin edilmez.", points: ["24 aktif kategori", "Açık bilgi ve kapsam sınırları", "Fiyat, stok, puan veya satıcı iddiası yok"] },
  footerCopy: "Expiya Appliances, ev ürünleri karar ihtiyaçlarını konuşarak netleştiren XPY deneyimidir.",
});

const electronicsSymbols: Record<string, string> = { SMARTPHONE: "▯", LAPTOP: "⌨", TABLET: "▭", MONITOR: "▣", TELEVISION: "▰", E_READER: "▤", HEADPHONES: "◉", PORTABLE_SPEAKER: "◍", SOUNDBAR: "▬", DIGITAL_CAMERA: "◫", PROJECTOR: "◈", GAME_CONSOLE: "◇", WIFI_ROUTER_MESH: "⌁", NETWORK_ATTACHED_STORAGE: "▦", EXTERNAL_STORAGE: "▱", PRINTER: "▧", WEBCAM: "◉", COMPUTER_AUDIO: "◖", SMARTWATCH: "◌", FITNESS_TRACKER: "⌇", HOME_SECURITY_CAMERA: "◉", VIDEO_DOORBELL: "▥", SMART_HOME_HUB: "⬡", UNINTERRUPTIBLE_POWER_SUPPLY: "▮" };
export const ELECTRONICS_LANDING_PACK = defineDepartmentLandingPack({ version: XPY_DEPARTMENT_LANDING_VERSION, departmentId: "ELECTRONICS", canonicalPath: "/electronics", visualPack: ELECTRONICS_VISUAL_PACK, eyebrow: "Elektronik seçim asistanı", headline: ["Doğru elektronik ürünü", "birlikte bulalım"], supportingCopy: "Telefonlardan ev teknolojilerine kadar 24 kategoride ihtiyacınızı konuşun; doğrulanmış ürün bilgileriyle seçenekleri netleştirin.", primaryCta: { label: "Kategorileri keşfet", href: "#kategoriler" }, secondaryCta: { label: "Nasıl çalışır?", href: "#nasil-calisir" }, categories: ELECTRONICS_CATEGORY_REGISTRY.map(category => ({ id: category.categoryId, label: category.publicLabelTr, description: "Bu kategori için karar görüşmesini başlat.", href: `/electronics/analysis?category=${category.categoryId}`, availability: "AVAILABLE" as const, visual: { kind: "CATEGORY_SYMBOL_FALLBACK" as const, symbol: electronicsSymbols[category.categoryId] ?? "◇", alt: `${category.publicLabelTr} kategori simgesi`, disclosure: "Temsilî kategori simgesi" } })), works: [{ title: "İhtiyacınızı anlar", description: "Kullanımınızı ve önceliklerinizi tek tek, anlaşılır sorularla netleştirir." }, { title: "Uyumu kontrol eder", description: "Bölge, ekosistem, bağlantı, güvenlik ve diğer önemli uyum sınırlarını gözetir." }, { title: "Bilmediğini açık bırakır", description: "Eksik fiyatı veya teknik bilgiyi tahmin etmez; seçenekleri yapay biçimde sıralamaz." }], xpy, stages: [{ id: "STAGE_1_DECISION", label: "AŞAMA 1 · Karar görüşmesi", description: "Aktif. 24 elektronik kategorisinde ihtiyacınızı ve seçenekleri netleştirin.", href: "#kategoriler", availability: "AVAILABLE" }, { id: "STAGE_2_EVALUATION", label: "AŞAMA 2 · Ürün değerlendirmesi", description: "Yalnız yetkili AŞAMA 1 kararından güvenli geçişle açılabilir; şu anda doğrudan kullanıma kapalıdır.", href: "/electronics/stage/2", availability: "REQUIRES_HANDOFF" }, { id: "STAGE_3_ACTION", label: "AŞAMA 3 · Güvenli talep", description: "Satıcı, teklif, sipariş, ödeme ve veri aktarımı henüz desteklenmiyor.", href: "/electronics/stage/3", availability: "UNAVAILABLE" }], trust: { title: "Gerekçe görünür, bilinmeyen dürüstçe korunur", description: "Sonuçlar yalnız doğrulanmış Türkiye ürün kimliği ve teknik kanıtlarla açıklanır.", points: ["24 aktif kategori", "Exact ürün ve yapılandırma", "Fiyat, stok ve popülerlik etkisi yok"] }, footerCopy: "Expiya Electronics, elektronik ürün kararlarını ihtiyaçlarınıza göre netleştiren konuşma deneyimidir." });

export const BABY_LANDING_PACK = defineDepartmentLandingPack({ version: XPY_DEPARTMENT_LANDING_VERSION, departmentId: "BABY_AND_CHILD", canonicalPath: "/baby", visualPack: BABY_VISUAL_PACK, eyebrow: "Bebek & Çocuk seçim asistanı", headline: ["Doğru bebek arabasını", "birlikte bulalım"], supportingCopy: "Taşıma, katlı ölçü, kullanım aşaması ve uyum ihtiyaçlarınızı doğrulanmış Türkiye ürünleriyle konuşun.", primaryCta: { label: "Görüşmeye başla", href: "/baby#asama-1" }, secondaryCta: { label: "Nasıl çalışır?", href: "#nasil-calisir" }, categories: [{ id: "STROLLER", label: "Bebek arabası", description: "Türkiye için exact ürün yapılandırmalarıyla karar görüşmesi.", href: "/baby#asama-1", availability: "AVAILABLE" }], works: [{ title: "İhtiyacınızı anlar", description: "Tek seferde tek doğal soruyla kullanımınızı netleştirir." }, { title: "Kanıtı korur", description: "Eksik bilgiyi avantaj saymaz ve güvenlik iddiası üretmez." }, { title: "Kararı açıklar", description: "Tek ürün desteklenmiyorsa bağlı aday kümesini görünür bırakır." }], xpy, stages: [{ id: "STAGE_1_DECISION", label: "AŞAMA 1 · Karar görüşmesi", description: "Aktif bebek arabası karar görüşmesi.", href: "/baby#asama-1", availability: "AVAILABLE" }, { id: "STAGE_2_EVALUATION", label: "AŞAMA 2 · Ürün değerlendirmesi", description: "Yalnız yetkili AŞAMA 1 kararından açılır.", href: "/baby/stage/2", availability: "REQUIRES_HANDOFF" }, { id: "STAGE_3_ACTION", label: "AŞAMA 3 · Güvenli talep", description: "Satış, teklif ve sipariş işlemleri açık değil.", href: "/baby/stage/3", availability: "UNAVAILABLE" }], trust: { title: "Doğrulanmayanı vaat etmez", description: "Yalnız exact Türkiye ürün kimliği ve üretici kanıtı kullanılır.", points: ["Exact ürün kimliği", "Bilinmeyenler açık", "Fiyat ve marka sıralaması yok"] }, footerCopy: "Expiya Bebek & Çocuk, bebek arabası kararını ihtiyaçlarınıza göre netleştirir." });
export const DEPARTMENT_LANDING_PACKS = Object.freeze({ CARS: CARS_LANDING_PACK, APPLIANCES: APPLIANCES_LANDING_PACK, ELECTRONICS: ELECTRONICS_LANDING_PACK, BABY_AND_CHILD: BABY_LANDING_PACK });
export function resolveDepartmentLandingPack(departmentId: keyof typeof DEPARTMENT_LANDING_PACKS) { return DEPARTMENT_LANDING_PACKS[departmentId]; }
