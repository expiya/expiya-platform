# Expiya İkinci El — Medya, Belge, Duplicate ve Fraud Sınırı v0.1

Durum: `FOUNDATION / NO STORAGE OR SCANNER ADAPTER / NO AUTOMATIC ENFORCEMENT`
Tarih: `2026-09-01`

## 1. Yükleme yaşam döngüsü

```text
UPLOADED_QUARANTINED
→ STRUCTURE_VALIDATED
→ MALWARE_SCAN_PASSED
→ PRIVACY_REVIEW_PASSED
→ IDENTITY_REVIEW_PASSED
→ PUBLIC_RENDITION_READY
```

Her aşama `REJECTED` durumuna gidebilir. Public veya private onaylı kayıt `REVOKED` olabilir ve geri dönüşsüzdür; yeniden yükleme yeni asset kimliği gerektirir. Quarantine'dan public duruma doğrudan geçiş yasaktır.

## 2. Dosya sınıfları

- Araç fotoğrafı: güvenli türetilmiş public rendition üretilebilir.
- Belge: hiçbir zaman doğrudan public olmaz; private erişim ve görev bazlı grant gerektirir.
- Orijinal fotoğraf: EXIF/PII incelemesi öncesi public değildir.
- Thumbnail/public WebP: orijinal asset'e provenance bağı taşır; metadata temizlenir.

## 3. Public fotoğraf kapıları

Tüm kapılar zorunludur:

1. Magic-byte ile tespit edilen MIME allowlist (`JPEG`, `PNG`, `WebP`).
2. Declared/detected MIME eşitliği.
3. Pozitif ve en fazla 15 MB boyut.
4. Malware scan sonucu `PASSED`; timeout/error başarı sayılmaz.
5. EXIF kaldırılmış.
6. PII/plaka/yüz/konum kontrolü `PASSED`.
7. Araç/listing identity kontrolü `PASSED`.
8. Görsel kullanım hakkı satıcıca doğrulanmış ve sözleşme kapsamında.
9. Quarantine orijinalinden türetilmiş yeni asset.
10. Yalnız public storage sınıfı/CDN namespace'i.

Scanner entegrasyonu daha sonra seçilir. Sağlayıcı sonucu satıcı beyanını veya araç doğruluğunu doğrulamaz; yalnız dosya güvenlik kapısına katkı sağlar.

## 4. Belge güvenliği

- PDF ve görsel belge allowlist'i ayrıca tanımlanır; Office/makro/arşiv formatları MVP'de reddedilir.
- Sayfa sayısı, decompression ratio, nested object, JavaScript/action, embedded file ve parola koruması kontrol edilir.
- CDR uygulanırsa orijinal ve sanitized türev ayrı hash/asset kimliği taşır.
- Ruhsat, ekspertiz, fatura ve servis belgesinde TCKN, adres, imza, telefon, müşteri adı ve üçüncü kişi verisi redakte edilir.
- OCR çıktısı ham log veya analitiğe yazılmaz.
- Moderatör belge erişimi kısa ömürlü grant ve audit event gerektirir; toplu indirme varsayılan kapalıdır.

## 5. Duplicate sinyalleri

- VIN ve plaka karşılaştırması düz değer veya düz SHA-256 ile değil keyed-HMAC fingerprint ile yapılır.
- Tenantlar arası eşleşme partner kullanıcıya karşı tenant bilgisini açmaz; yalnız Expiya fraud görevi üretir.
- Görsel duplicate için perceptual hash yalnız aday sinyalidir; benzer açı/stüdyo fonu false positive üretebilir.
- Belge hash eşleşmesi yeniden kullanım sinyalidir; aynı filonun geçerli ortak belgesi olabileceği için otomatik suçlama değildir.
- Satılmış/withdrawn geçmiş kayıtlar duplicate araştırmasına bağlam sağlar; public yeniden yayın kapısı ayrıca incelenir.

## 6. Fraud sinyal ve karar sınırı

Sinyaller: aynı/cross-tenant VIN, aktif plaka, duplicate görsel/belge, kilometre gerilemesi, fiyat anomalisi, taxonomy/kimlik çatışması, hızlı stok patlaması, tekrarlı kullanıcı şikâyeti.

- `HIGH` ve `CRITICAL` aktif sinyal yayını fail-closed bloke eder.
- Her aktif sinyal manuel inceleme gerektirir.
- Sistem otomatik olarak “dolandırıcılık” hükmü vermez.
- Dismiss kararı reason code, aktör ve audit zinciri taşır.
- Tenant askıya alma, sinyalden ayrı moderasyon kararı ve itiraz süreci gerektirir.
- Fraud modeli ücretli paket, organik ranking veya satış dönüşümüyle eğitilmez.

## 7. Log ve analitik

Loglara dosya bytes, OCR metni, VIN/plaka, object URL, signed URL, AV vendor raw payload veya belge içeriği girmez. İzinli alanlar: asset pseudonymous ID, tenant pseudonymous ID, kapı kodu, scanner version, duration bucket, status ve timestamp.

## 8. Production öncesi kapılar

- Scanner/CDR sağlayıcı DPIA, veri bölgesi, alt işleyen ve retention incelemesi.
- Dosya formatı/limit politikası ve adversarial corpus.
- Object storage private/public bucket policy ve tenant prefix testleri.
- Presigned URL TTL, content-disposition ve cache-control testi.
- EXIF/OCR/PII redaksiyon doğruluğu ve insan override süreci.
- Keyed-HMAC/KMS key rotasyonu.
- Fraud moderasyon SLA, dört göz ve itiraz akışı.
- Zararlı dosya olay müdahale runbook'u.
