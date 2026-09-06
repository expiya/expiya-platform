# Expiya İkinci El — Araç eşleşme bildirimleri ve ticari sınır v0.1

## Ürün önerisi

Sıfır sonuç ekranında kullanıcıya tercihlerine uyan kurumsal araç stoğa girdiğinde e-posta bildirimi önerilir. Ücretsiz paket hard filtreleri en fazla beş seçili şehirde haftalık ve en fazla 12 hafta kontrol eder. Pro paket aynı hard filtreleri Türkiye genelinde anlık ve 1 yıl izler; birden fazla takip ve gelişmiş değişiklik takibi ileride bu pakete eklenebilir. Her iki takip de süre sonunda otomatik kapanır; sessiz otomatik yenileme yapılmaz.

Ücret bildirim hızını ve kotasını satın alır; organik araç sırasını, eşleşme skorunu veya sponsorlu stok görünürlüğünü değiştiremez. Pro fiyatı ticari/hukuki onay ve pilot ölçümü öncesinde belirlenmez; mevcut prototip ödeme almaz.

## Pro teklif ve ödeme bağlantısı

Pro teklif alanı, mevcut “Aşama 2” karşılaştırma raporu teklifindeki anlaşılır fiyat–kapsam–ödeme CTA desenini izler. Bununla birlikte iki ürün ticari ve teknik olarak ayrıdır: ikinci el bildirimleri `USED_CARS_ALERT_PRO` ürün kodunu, ayrı checkout bağlantısını, ayrı entitlement'ı ve kendi sözleşme/iptal-iade metinlerini kullanır. Sıfır araç karşılaştırma raporunun ürün, sipariş veya ödeme nesneleri yeniden kullanılmaz.

Fiyat, hukuk metinleri ve ödeme sağlayıcısı onaylandığında Pro kartında fiyat ve “Pro'ya geç” CTA'sı gösterilebilir. Bugünkü prototipte bağlantı `null`, CTA kapalı ve ödeme/aktivasyon yetkileri `false` durumundadır; kullanıcıya yanıltıcı bir aktif satın alma düğmesi gösterilmez.

## Veri ve iletişim sınırı

E-posta yalnız seçilen eşleşme talebi için, süreli ve tek tıkla kapatılabilir biçimde işlenir. Hizmet bildirimi talebi pazarlama/elektronik ticari ileti izniyle birleştirilmez. Tercihlerin ham kopyası yerine sürümlü ve pseudonymous fingerprint saklanır. Gerçek aktivasyon KVKK aydınlatma, saklama süresi, delivery provider ve suppression akışı ister.

E-posta adresi bildirim aktivasyonundan önce tek kullanımlık kodla doğrulanır. Kod en fazla 10 dakika geçerli, yeniden gönderim aralığı en az 60 saniye ve deneme limiti 5'tir; plaintext kod yerine HMAC digest saklanır ve başarılı kullanım sonrası challenge tüketilir. Ücretsiz akış doğrulamadan sonra aktivasyona, Pro akış doğrulamadan sonra ödeme adımına ilerler. Ödeme sağlayıcısının e-posta alanı doğrulama yerine geçmez.

## Mevcut durum

UI prototipi, free/pro taslakları, ayrı ikinci el ürün kodu, checkout hazırlık sözleşmesi ve doğrulama sınırı hazırdır. E-posta saklama/gönderme, fiyat, gerçek ödeme bağlantısı, provider veya alert aktivasyonu yoktur. Delivery, checkout, billing ve production activation yetkileri kapalıdır.
