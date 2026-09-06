# Expiya İkinci El — Üyelik, faturalama ve ticari ayrıştırma runbook v0.1

## Paket ilkeleri

Başlangıç, Büyüme ve Kurumsal paketler; şube, aktif stok, kullanıcı, lead-aksiyon kotası, analitik ve feed/API entitlement'ları sunar. Kota kullanım kapasitesidir; araç doğruluğu, moderasyon önceliği, organik görünürlük veya Expiya kararını satın almaz. Pilot aşamada tamamlanmış aksiyon başına faturalama kapalıdır.

Kurumsal vitrin yalnız açık ticari yüzeydir. Sponsorlu stoklar “Sponsorlu” etiketiyle ayrı carousel/vitrinde gösterilir; organik sonuç listesine enjekte edilmez. Sponsor analytics event'leri organik impression/click/lead event'lerinden ayrı şema ve stream taşır.

## Üyelik ve tahsilat akışı

1. Doğrulanmış firma sözleşme ve paket seçimini tamamlar.
2. Fiyat, dönem, vergiler, kota ve iptal koşulları immutable teklif snapshot'ına bağlanır.
3. Ödeme sağlayıcısı hosted/tokenized akış kullanır; kart verisi Expiya sistemine alınmaz.
4. Webhook imzası, süre/replay ve idempotency kontrolünden geçer; tenant–invoice–amount–currency eşleşmesi doğrulanır.
5. Ödeme kaydı fatura/abonelik state machine'ini ilerletmeye adaydır; tek başına üyelik veya yayın aktivasyonu yapmaz.
6. Dealer identity, sözleşme, operasyon, ödeme ve moderasyon kapıları ayrı ayrı yeniden değerlendirilir.
7. Past-due sürecinde grace policy uygulanabilir; kapanışta stok fail-closed kaldırılır, fakat kişisel veri otomatik silinmez.
8. Refund/chargeback/dispute reason code ve audit ile yürütülür.

## Organik bağımsızlık kontrolleri

- Ranking input şemasında tenant planı, aylık ücret, kampanya veya sponsor alanı bulunmaz.
- Ranking servisinin üyelik/faturalama deposuna erişimi verilmez.
- Organik karar snapshot'ı policy ve taxonomy sürümüyle denetlenir.
- A/B testleri sponsor CTR artışı uğruna organik relevance veya güven eşiğini düşüremez.
- Satış ekibi manuel organik sıra değiştiremez; istisna mekanizması yoktur.
- Periyodik audit, ücret ödeyen ve ödemeyen uygun stokların benzer koşullardaki exposure dağılımını inceler.

## Muhasebe, KVKK ve güvenlik kapıları

Fiyat/iskonto onayı, ödeme sağlayıcı DPA/sözleşmesi, e-Arşiv/e-Fatura süreci, vergi-muhasebe değerlendirmesi, retention, refund/dispute tatbikatı ve webhook secret rotasyonu production öncesi tamamlanır. Fatura erişimi tenant-scope ve MFA gerektirir; loglarda ödeme tokenı, vergi numarası ve fatura PII redakte edilir.

## Ticari sertifikasyon

Her bayi üyeliği, Pro araç bildirimi ve sponsorlu vitrin teklifi ayrı `USED_CARS_*` ürün kodu, kuruş cinsinden TRY fiyatı, vergi görünürlüğü, dönem, entitlement, sözleşme ve iptal/iade sürümü içeren immutable teklif snapshot'ı taşır. Commercial ve Legal onayları farklı kişilerce verilir. Teklif doğrulaması checkout veya tahsilat yetkisi üretmez.

Staging sertifikasyonu hosted checkout/kart verisi sınırı, imzalı webhook, replay/idempotency, tutar–para birimi, tenant fatura izolasyonu, e-fatura hatası, tam/kısmi iade, chargeback/dispute, iptal–bitiş ve secret rotation dahil 12 sentetik senaryo ister. Kanıtta kart veya ham fatura PII bulunamaz.

Ranking bağımsızlık denetimi en az 28 gün, ücretli ve ücretsiz uygun stoklarda en az 100'er örnek ve en az beş eşlenmiş kohort ister. Exposure farkı yüzde 5'i aşamaz; ranking şemasında ticari alan, billing erişimi, sponsor–organik karışımı veya manuel sıra override'ı toleransı sıfırdır. Bağımsız reviewer ve checksum'lı kanıt zorunludur.

## Açık kapılar

Gerçek fiyat onayı, ödeme sağlayıcısı, fatura entegrasyonu, vergi/muhasebe incelemesi, refund/dispute tatbikatı, sponsorlu UI erişilebilirlik incelemesi ve bağımsız ranking audit'i tamamlanmadı. `realChargeAuthorized`, `invoiceIssuanceAuthorized` ve `sponsoredPublicationAuthorized` sabit `false` kalır. Bu paket tahsilat, fatura kesme veya sponsorlu yayın yetkisi değildir.
