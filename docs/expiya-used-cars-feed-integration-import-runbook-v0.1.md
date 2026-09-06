# Expiya İkinci El — Feed/API ve toplu stok import runbook v0.1

## Tek canonical sınır

CSV, XLSX, SFTP, pull API ve push API aynı `used-inventory-feed/v1` envelope ve satır doğrulama hattına girer. Kanalın güvenilir olması veriyi güvenilir veya yayınlanabilir yapmaz. Envelope tenant, şube, taxonomy release, source checksum, idempotency key, import mode ve batch sınırı taşır.

Satıcı kaynağındaki kolonlar yönetilen mapping ile canonical alanlara bağlanır. Marka, model, nesil, motor, şanzıman veya donanım serbest metinden oluşturulamaz; `taxonomyVariantId` mevcut onaylı release içinde çözülmelidir. Eşleşmeyen kimlik yeni taxonomy request üretir.

## İşleme sırası

1. Kaynak/provider ve servis hesabı tenant'a bağlanır; scope yalnız `INVENTORY_IMPORT` olur.
2. Request timestamp, nonce, body checksum, key version ve HMAC ile doğrulanır. Replay ve cross-tenant istek reddedilir.
3. Dosya tipi/MIME/boyut ve malware kapıları uygulanır; spreadsheet formula injection ve zip bomb kontrol edilir.
4. Sürümlü kolon mapping ve deterministik transform çalışır; satır hataları kaynak kolonuyla raporlanır.
5. VIN/plaka public log'a yazılmadan private normalization/fingerprint sürecine alınır.
6. Dry-run tenant, branch, taxonomy, schema, duplicate, fiyat/km/tarih ve controlled enum doğrulaması üretir.
7. Reconciliation create/update/unchanged/explicit closure/omitted ayrımını gösterir. Omission silme değildir.
8. Kullanıcı/operasyon onayı yeni immutable import revision oluşturur; gerçek write ayrıca launch-control ister.
9. Satır bazlı sonuç, checksum ve idempotency outcome audit'e yazılır. Retry aynı sonucu replay eder; farklı payload aynı key ile çalışamaz.

## Snapshot ve stok kapanışı

Feed snapshot'ta görünmeyen araç otomatik satıldı veya silindi sayılmaz. Closure yalnız açık `SOLD`/`WITHDRAWN`, doğrulanmış tenant–şube sahipliği ve güncel revision ile mümkündür. Feed uzun süre gelmezse stok freshness süresi dolar ve public projection fail-closed kaldırılır; kayıt/audit korunur.

## Güvenlik ve operasyon

- Servis hesapları interaktif login yapamaz ve insan rolü alamaz.
- Secret/key düzenli döndürülür; dual-key kısa geçişi ve revoke tatbikatı yapılır.
- Rate limit tenant + service-account bucket'ıdır; global tenant etkisi yaratmaz.
- Hata dosyaları VIN/plaka/PII maskelemesi ve süreli signed URL kullanır.
- Import analytics yüksek-cardinality external stock/VIN içermez.
- Provider outage, partial batch, duplicate burst ve stale feed için alert/runbook sahibi tanımlanır.

## Açık kapılar

Beş validate-only kanal, 16 sertifikasyon senaryosu ve 10 bin satırlık load/reconciliation gate staging bootstrap sözleşmesi olarak hazırdır. Gerçek provider mapping onayı, sandbox koşumu, key rotation, load testi, reconciliation tatbikatı ve support sahipliği tamamlanmadı. `realFeedConnectionAuthorized` ve `inventoryWriteAuthorized` sabit `false` kalır. Bu paket gerçek feed bağlantısı veya stok yazımı değildir. Ayrıntılı staging sınırı `docs/expiya-used-cars-staging-feed-sandbox-bootstrap-v0.1.md` içindedir.
