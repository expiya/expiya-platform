# Expiya Cars ücretli karşılaştırma — sandbox kabul kapıları

Canlı ödeme bu kontrol listesi tamamlanmadan açılmaz.

## Ortam ve veri

- [ ] `DATABASE_URL` yalnız test veritabanını gösteriyor.
- [ ] `PAID_REPORT_PII_KEY` 32 rastgele baytın base64url karşılığı ve gizli değişken olarak saklanıyor.
- [ ] Resend anahtarı yalnız gönderim yetkili; yönetim yetkisi taşımıyor.
- [ ] `PAID_REPORT_FROM_EMAIL` Resend'de doğrulanmış alan adına ait.
- [ ] `IYZICO_ENV=sandbox` ve canlı ödeme kapısı kapalı.
- [ ] `0016_paid_report_vehicle_entitlements.sql` test veritabanına uygulandı.

## Uçtan uca senaryo

- [ ] Karar kartından ücretli rapor teklifi açılıyor.
- [ ] Aynı sınıftan tam iki alternatif seçilebiliyor.
- [ ] Eksik zorunlu alanlar alan altında açıklanıyor.
- [ ] iyzico sandbox ödemesi tek kez doğrulanıyor.
- [ ] Rapor kuyruğu `QUEUED → RUNNING → READY` ilerliyor.
- [ ] PDF uygulama içinde yedi sayfa olarak açılıyor ve indiriliyor.
- [ ] Aynı PDF yalnız onaylanan test adresine e-posta eki olarak ulaşıyor.
- [ ] Resend yeniden denemesinde aynı idempotency anahtarı mükerrer e-posta üretmiyor.
- [ ] Karar ekranında ilk karar ve iki “Raporla açıldı” kartı görünüyor.
- [ ] Her üç araçtan teklif, test sürüşü ve satıcı görüşmesi güvenli forma geçiyor.
- [ ] Alternatif araç yeni ücretli karşılaştırmanın başlangıç aracı yapılabiliyor.
- [ ] İkinci rapor ilk raporun karar geçmişini değiştirmiyor.

## Hata senaryoları

- [ ] Başarısız ödeme rapor veya araç yetkisi oluşturmuyor.
- [ ] Callback tekrarı ikinci sipariş/rapor oluşturmuyor.
- [ ] PDF üretilemezse durum ve iade yolu açıkça gösteriliyor.
- [ ] E-posta başarısızlığı web/PDF erişimini engellemiyor.
- [ ] Üç başarısız e-posta denemesinden sonra otomatik tekrar duruyor.
- [ ] Yetkisiz exact varyant için satış veya yeniden karşılaştırma tokenı verilmiyor.
- [ ] Eski/değiştirilmiş token güvenli biçimde reddediliyor.

## Yayın kapıları

- [ ] `npm test` kapsam içi testlerde sıfır hata.
- [ ] `npm run lint` sıfır kapsam içi hata.
- [ ] `npm run build` başarılı.
- [ ] `npm run paid-comparison:readiness` başarılı.
- [ ] Hukuk, Güvenlik, Tasarım ve Katalog kontrolleri kayıt altına alındı.
- [ ] Kullanıcı canlı ödeme açılışına ayrıca açık onay verdi.
