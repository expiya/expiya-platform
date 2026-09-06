# Expiya İkinci El — Conversational commerce vizyonu v0.1

Tarih: 1 Eylül 2026
Durum: Gelecek vizyonu; MVP veya production yetkisi değildir.

## Vizyon

Expiya, kullanıcı ile doğrulanmış kurumsal satıcı arasında üç kademeli bir köprü olabilir:

1. İzinli mesajlaşma ve WhatsApp dahil kanal handoff'u.
2. Araç başında planlı veya tek tıkla başlatılan canlı görüntülü tanıtım.
3. Satıcının açıkça tanımladığı yetki sınırları içinde çalışan, kullanıcıya kendisini yapay zekâ olarak açıklayan satış ve pazarlık asistanı.

Bu kabiliyetler mevcut `lead-handoff` modülüne özellik olarak yığılmamalıdır. Lead aktarımı, kanal iletişimi, canlı görüşme ve satıcı adına hareket eden ajan farklı risk ve yetki alanlarıdır.

## Önerilen yeni bounded context'ler

```text
features/used-cars/
├── communications-consent/   # kanal, amaç, alıcı, süre ve geri çekme
├── channel-gateway/          # WhatsApp, web mesajlaşma ve gelecekteki kanal adaptörleri
├── appointment/              # mesajlaşma, telefon ve görüntülü tanıtım randevusu
├── live-vehicle-session/     # doğrudan video sağlayıcı adaptörleri, araç/stok bağlama ve güvenli kontrol listesi
├── conversation-orchestration/ # konuşma durumu, araç bağlamı, insan handoff
├── seller-agent-policy/      # satıcının ajana verdiği açık yetkiler ve yasaklar
├── negotiation/              # fiyat/koşul teklifleri, karşı teklifler ve sona erme
└── conversation-audit/       # açıklama, mesaj, teklif ve insan müdahalesi geçmişi
```

## WhatsApp entegrasyonu

- Kullanıcı kanalı, amaç kapsamını ve hangi satıcıyla paylaşım yapılacağını açıkça seçer.
- WhatsApp pazarlama izni ile araç özelindeki hizmet iletişimi ayrı rızalardır.
- Kullanıcı başlatmalı ve işletme başlatmalı konuşmalar platform sağlayıcısının güncel politika ve şablon kurallarına göre ayrılır.
- Telefon numarası yalnız kanal gateway kasasında tutulur; matching, analitik ve model prompt'larına taşınmaz.
- Mesaj içerikleri varsayılan olarak eğitim verisi değildir.
- Opt-out, engelleme, retention, alıcı bildirimi ve erişim audit'i zorunludur.
- Entegrasyon sağlayıcısının güncel Türkiye kullanılabilirliği, sözleşmesi ve veri işleme konumu uygulamadan önce ayrıca doğrulanır.

WhatsApp yalnız olası kanallardan biridir; ürün mimarisi WhatsApp'a bağımlı değildir.

## Doğrudan görüntülü görüşme sağlayıcısı

ElevenSight benzeri, kullanıcı ile satıcıyı uygulama indirmeden veya karmaşık toplantı kurulumu olmadan doğrudan görüntülü görüşmeye alan bir sağlayıcı `live-vehicle-session` içindeki değiştirilebilir adaptör olarak konumlanır. Ürün ve veri modeli sağlayıcının oda, çağrı veya SDK nesnelerine bağlanmaz.

- Kullanıcı “şimdi ara” veya planlı randevu seçeneklerinden birini seçebilir.
- Sistem yalnız uygun, doğrulanmış ve yetkili şube kullanıcısına çağrı yönlendirir.
- Çağrı belirli tenant, şube, `inventoryUnitId` ve listing revision ile ilişkilendirilir.
- Sağlayıcıya minimum veri aktarılır; mümkünse opaque kullanıcı ve oturum kimlikleri kullanılır.
- Oda veya çağrı token'ları kısa ömürlü, tek amaçlı ve tek kullanımlık tasarlanır.
- Webhook'lar imza, timestamp, replay ve idempotency kontrollerinden geçer.
- Sağlayıcının kayıt, transkripsiyon, yapay zekâ analizi ve alt işleyen özellikleri varsayılan kapalıdır.
- Bağlantı kurulamazsa telefon, mesajlaşma veya randevu gibi kontrollü fallback sunulur.
- Sağlayıcı değiştirilebilir olmalı; Expiya'nın rıza, audit, retention ve güvenlik sözleşmeleri dış servise devredilmemelidir.

## Canlı görüntülü araç tanıtımı

- Görüşme belirli `inventoryUnitId`, tenant, şube ve yetkili satış danışmanına bağlanır.
- Oturum öncesinde stok güncelliği yeniden doğrulanır.
- Kullanıcıya görüntülü görüşmenin bağımsız ekspertiz veya kimlik doğrulama garantisi olmadığı açıkça gösterilir.
- Görüntü/ses kaydı varsayılan olarak kapalıdır. Kayıt açılacaksa tüm katılımcılardan ayrı ve açık rıza alınır.
- Satış danışmanı VIN, plaka, ruhsat, kimlik veya üçüncü kişilerin yüzlerini istemeden göstermemesi için yönlendirilir.
- Kullanıcıya araç çalıştırma, gösterge paneli, dış/iç yüzey, lastik, uyarı ışıkları ve bilinen kusurlar için yapılandırılmış ama bağlayıcı olmayan kontrol listesi sunulabilir.
- Görüşme tamamlanması aracın doğrulandığı veya kusursuz olduğu anlamına gelmez.

## Satıcı adına çalışan yapay zekâ asistanı

Asistan görüşmenin başında ve gerektiğinde konuşma içinde yapay zekâ olduğunu, hangi satıcı adına hareket ettiğini ve yetki sınırlarını açıkça söyler. İnsanmış gibi davranamaz.

Asistan yalnız yayınlanmış stok projection'ı, satıcının onaylı ticari politikası ve alan bazlı kanıt sözleşmesi üzerinden konuşur. Eksik bilgi üretmez; satıcı beyanını Expiya doğrulaması gibi sunmaz.

### Yetkilendirilebilir kabiliyetler

- Araç özelliklerini ve kanıt durumunu açıklamak.
- Kullanıcının kullanım ihtiyacını anlamak.
- Görüşme veya test sürüşü randevusu önermek.
- Satıcının önceden tanımladığı kurallar içinde fiyat teklifi veya karşı teklif oluşturmak.
- Finansman ilgisini kaydetmek; kesin kredi/onay vaadi vermemek.
- Yetki sınırına gelince insan satış danışmanına aktarım yapmak.

### Varsayılan yasaklar

- Satıcı tarafından yetkilendirilmemiş fiyat indirimi veya koşul vermek.
- Fiyat tabanı, marj, diğer müşteriler veya gizli stok bilgilerini açıklamak.
- Bağlayıcı satış sözleşmesi kurmak, kapora tahsil etmek veya ödeme bağlantısı üretmek.
- Hasarsızlık, kilometre, bakım, garanti veya piyasa değeri hakkında kaynaksız garanti vermek.
- Kullanıcı üzerinde yapay kıtlık, baskı veya aldatıcı ikna kullanmak.
- Korumalı veya hassas özelliklerden fiyat/pazarlık sonucu çıkarmak.
- Kullanıcı mesajlarındaki talimatlarla sistem, tenant veya satıcı politika sınırlarını değiştirmek.
- Başka tenant'ın konuşma, teklif, fiyat tabanı veya stok verisine erişmek.

## Pazarlık yetki modeli

Her araç veya stok grubu için sürümlü bir `SellerNegotiationMandate` gerekir:

- tenant ve şube,
- stok/revizyon kimliği,
- geçerlilik başlangıç ve bitişi,
- ilan fiyatı ve izinli teklif türleri,
- minimum fiyat veya indirim fonksiyonu — modele ham gizli değer olarak verilmemesi tercih edilir,
- izinli yan haklar,
- toplam tur ve süre sınırı,
- insan onayı gerektiren eşikler,
- aynı kullanıcı için teklif tutarlılığı,
- ayrımcılık ve adil davranış politikası,
- yetkiyi veren aktör ve dört göz onayı,
- iptal ve acil durdurma anahtarı.

Model doğrudan bağlayıcı fiyat hesaplamaz. Deterministik policy engine izin verilen teklif zarfını üretir; model yalnız izinli seçenekleri doğal dille açıklar. Her teklif bir `offerId`, policy version, stok revizyonu, sona erme zamanı ve audit kaydı taşır.

## Zorunlu güvenlik ve operasyon kontrolleri

- Açık AI disclosure ve kolay insan handoff.
- Tenant izolasyonu, araç bağlamı kilidi ve least-privilege tool access.
- Prompt injection ve veri sızdırma kontrolleri.
- Mesaj ve tool-call seviyesinde audit; hassas içerik redaction.
- Dolandırıcılık, taciz, tehdit, ödeme yönlendirmesi ve şüpheli off-platform davranış sinyalleri.
- Kullanıcı ve satıcı için engelleme/şikâyet/itiraz akışları.
- Kalite değerlendirmesi: doğruluk, kaynak bağlılığı, yetki ihlali, adil teklif, handoff başarısı.
- Kill switch: tenant, model, kanal, stok veya ülke seviyesinde durdurma.
- Model/provider değişiminde tekrar eval ve kontrollü rollout.

## Aşamalı teslim önerisi

### Faz C1 — izinli iletişim köprüsü

Araç özelinde WhatsApp/mesajlaşma tercihi, kanal rızası, kısa ömürlü handoff ve audit. AI satış yoktur.

### Faz C2 — doğrudan veya planlı canlı araç oturumu

“Şimdi görüntülü görüş” veya randevu, yetkili danışman, stok yeniden teyidi, sağlayıcı adaptörü, kayıt varsayılan kapalı ve oturum sonrası güvenli kontrol listesi.

### Faz C3 — açıklayıcı satış asistanı

Yalnız araç anlatımı, soru yanıtlama ve insan handoff. Teklif/pazarlık yetkisi yoktur.

### Faz C4 — kontrollü teklif asistanı

Deterministik teklif policy engine, dar pilot, insan onaylı teklifler ve kapsamlı eval. Bağlayıcı sözleşme/ödeme yoktur.

### Faz C5 — ileri conversational commerce

Hukuk, tüketici mevzuatı, KVKK, platform politikaları, güvenlik ve adil davranış ölçümleri yeterli olursa daha geniş yetki değerlendirilir.

## Bugünkü mimariye etkisi

- Mevcut `lead-handoff` sözleşmesi korunur; iletişim gateway'i haline getirilmez.
- `evidence` ve public listing projection, yapay zekânın konuşabileceği tek araç gerçekleri kaynağıdır.
- `matching` organik ve ticari etkiden bağımsız kalır; satış ajanı eşleştirme skorunu değiştiremez.
- `memberships`, özelliğe erişim kapasitesi sağlayabilir fakat organik sıralama avantajı veremez.
- `audit`, `retention`, `fraud` ve tenant sınırları gelecekteki konuşma/teklif olaylarını taşıyacak şekilde genişletilir.
- Bugün gerçek WhatsApp bağlantısı, video sağlayıcısı, AI satış ajanı, teklif veya pazarlık kodu eklenmez.
