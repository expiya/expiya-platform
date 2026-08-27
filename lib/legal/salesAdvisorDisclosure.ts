export const SALES_ADVISOR_DISCLOSURE_VERSION = "PHASE2-DISC-2026.08-v1.0" as const;
export const SALES_ADVISOR_DISCLOSURE_CHECKSUM = "sha256:a9057fbc1c65e58fb9ee1c085f66039733cf805fe62fcf5b5af1af03ae49bcfd" as const;

export const SALES_ADVISOR_DISCLOSURE = {
  schemaVersion: "phase2-public-disclosure/v1",
  version: SALES_ADVISOR_DISCLOSURE_VERSION,
  effectiveAt: "2026-08-28",
  serviceScope: "Expiya Satış Danışmanı, Aşama 1'de açıklanan seçimi değiştirmeyen; yalnız açılmış exact varyantı mevcut katalog ve kanıt kayıtlarıyla açıklayan yapay zekâ destekli karar desteğidir. Satış teklifi, sipariş, rezervasyon, garanti, ekspertiz veya bağlayıcı satın alma tavsiyesi değildir.",
  catalogScope: "Teknik özellik, donanım ve renk bilgileri gösterilen pazar, model yılı, varyant ve kaynak kapsamıyla sınırlıdır. Aile/model düzeyi, temsilî veya yaklaşık içerik açıkça etiketlenir; bilinmeyen, çelişkili ya da doğrulanmamış bilgi araçta yok veya var şeklinde yorumlanmaz.",
  priceScope: "Fiyat, kaynağındaki tarih ve koşullar için bilgi verir. Vergi, kampanya, opsiyon, stok, teslimat ve bayi uygulamaları değişebilir; güncel ve bağlayıcı satış fiyatı ile araç konfigürasyonu satın alma öncesinde yetkili satıcıdan doğrulanmalıdır.",
  mediaScope: "Görsel ve videolar exact varyanta ait, temsilî veya daha geniş kapsamlı olabilir; kapsam etiketi içerikle birlikte gösterilir. Üçüncü taraf bağlantısı ilgili tarafın içeriği ve koşullarına tabidir; bağlantı verilmesi onay, ortaklık veya sponsorluk anlamına gelmez.",
  conversationScope: "Sorunuz, yalnız aynı conversation, offer ve exact varyant bağlamında yanıt üretmek için kullanılır. Son 12 kısa mesaj geçici sunucu belleğinde tutulur; imzalı Aşama 2 handoff süresi dolduğunda erişime kapanır ve temizlenir. İstek tekrarını güvenli yönetmek için soru ve yanıtın geçici idempotency kopyası en fazla bir saat tutulabilir. Mesajlar pazarlama profili, retargeting, lead scoring, filtering veya ranking amacıyla kullanılamaz.",
  aiScope: "Soru anlamlandırmada OpenAI yalnız geçerli KVKK yurt dışı aktarım mekanizması operasyonel olarak doğrulanıp özellik ayrıca etkinleştirilirse kullanılabilir. Bu kapı kapalıyken soru deterministik, yerel kanıt sınırıyla yanıtlanır. Sohbete kimlik, iletişim, sağlık, finans veya başka gereksiz kişisel veri yazmayın.",
  phase3Scope: "Teklif, test sürüşü veya bayi iletişimi düğmeleri yalnız Aşama 3'e bağlı ve süreli bir geçiş hazırlar. Düğmeye basılması başvuru, rezervasyon, teklif, bayi aktarımı veya ticari elektronik ileti izni oluşturmaz; dış işlem yapılmaz.",
  marketingScope: "Danışman sahte kıtlık, yapay aciliyet veya doğrulanmamış üstünlük iddiası üretmez. Bu bilgilendirme KVKK açık rızası, pazarlama izni veya ticari elektronik ileti onayı değildir.",
} as const;
