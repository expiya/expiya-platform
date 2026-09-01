# Expiya İkinci El — KMS/HMAC key yönetimi ve rotation runbook v0.1

Durum: Sağlayıcı seçimi ve güvenlik onayı bekleyen operasyon taslağı. Gerçek key içermez.

## Amaç

VIN, plaka ve klasik araç şasi/seri tanımlayıcılarını veritabanından ayrı yetki alanındaki envelope encryption ile korumak; duplicate/fraud aramasını düşük entropili alanlarda düz hash kullanmadan tenant ve alan bağlı keyed-HMAC ile yapmak.

## Anahtar sınıfları

| Sınıf | Amaç | Saklama | Runtime erişimi | Rotation |
|---|---|---|---|---|
| KMS KEK | Data encryption key sarmalama | Yönetilen KMS/HSM | Yalnız crypto worker/service identity | Sağlayıcı politikası + olay bazlı |
| Data encryption key | Identifier ciphertext üretimi | Yalnız wrapped form | İstek süresince memory | Batch/tenant politika bazlı |
| HMAC fingerprint key | Duplicate/fraud fingerprint | Secret manager/HSM | Amaç sınırlı fingerprint worker | Planlı ve olay bazlı |
| CSRF signing key | Session/action token | Secret manager | Web auth service | Kısa periyot, overlap |
| Rate-limit network key | IP privacy fingerprint | Secret manager | Edge/rate-limit service | Kısa periyot, overlap |

Anahtarlar ortam, ülke/veri bölgesi ve amaç arasında paylaşılmaz. Development/test key'leri production'da geçersizdir.

## Encryption context

Her KMS çağrısı en az şu authenticated context'i taşır:

- `schemaVersion`,
- `tenantId`,
- `inventoryUnitId`,
- `identifierType`,
- `environment`.

Ciphertext başka tenant, stok veya alan context'iyle çözülemez. Context loglanırken ham tanımlayıcı içermez.

## HMAC fingerprint formatı

`hmac-sha256:{keyVersion}:{digest}`

Payload: `schema version + tenant ID + identifier type + normalized value`. Ham VIN/plaka, digest girdisi dışında hiçbir log, metric veya exception mesajında bulunmaz.

## Planlı rotation

1. Yeni key version KMS/secret manager'da oluşturulur; henüz primary değildir.
2. Yetki policy'si iki kişi tarafından incelenir.
3. Uygulama yeni version'ı okuyabilir fakat write etmez; canary decrypt/fingerprint testi yapılır.
4. Dual-read penceresi açılır: eski ve yeni fingerprint version aranabilir.
5. New-write yeni version'a geçirilir.
6. Background rewrap/refingerprint işi tenant bazında idempotent batch'lerle ilerler.
7. Her batch count, checksum, hata ve audit event üretir; ham tanımlayıcı loglamaz.
8. Coverage yüzde yüz ve reconciliation başarılı olduğunda eski version read-only yapılır.
9. Güvenli bekleme penceresi sonrası eski decrypt/fingerprint yetkisi kaldırılır.
10. İmha veya disable olayı audit ve change ticket'a bağlanır.

## HMAC rotation özel kuralı

Fingerprint deterministik olduğu için rotation sırasında aynı kaydın eski ve yeni fingerprint kolon/version çifti geçici olarak birlikte tutulabilir. Duplicate sorgusu her iki aktif version'ı kontrol eder. Yeni kayıt yalnız yeni version ile yazılır. Reconciliation tamamlanmadan eski version kapatılamaz.

## Acil rotation / compromise

1. Incident commander key version ve etkilenen service identity'leri belirler.
2. Tenant veya sistem çapında identifier write/read kill switch uygulanır.
3. Şüpheli credential/service identity revoke edilir.
4. Yeni key oluşturulur; new-write zorunlu geçirilir.
5. Audit ve KMS access log'ları PII içermeden preserve/legal-hold sürecine alınır.
6. Etki analizi tenant, zaman, action ve ciphertext key version üzerinden yapılır.
7. Rewrap/refingerprint öncelikli job olarak çalışır.
8. Hukuk/KVKK incident değerlendirmesi yapılır; bildirim yükümlülüğü yetkili ekipçe kararlaştırılır.
9. Eski key yalnız delil/rollback gereksinimi varsa kontrollü hold'da tutulur; normal runtime erişimine açılmaz.

## Yetki modeli

- Partner/public/moderation DB rolleri KMS decrypt yetkisi alamaz.
- Public projection worker decrypt gerektirmez; identifier-free projection kullanır.
- Duplicate worker yalnız fingerprint operasyonuna erişir.
- Break-glass decrypt ayrı identity, süreli grant, gerekçe ve iki kişi onayı gerektirir.
- KMS admin, uygulama DB admin ve audit reviewer görevleri ayrıdır.

## Gözlemlenebilirlik

İzinli metric'ler: key version kullanımı, encrypt/decrypt sayısı, hata kodu, latency, rewrap coverage, tenant-bucket count. Yasak alanlar: plaintext, ciphertext, fingerprint digest, request body, belge içeriği.

## Backup ve disaster recovery

- Wrapped data key ve key metadata backup stratejisi KMS sağlayıcı sorumluluk modeliyle doğrulanır.
- Cross-region recovery veri yerleşimi ve hukuk onayı olmadan açılmaz.
- Restore tatbikatı identifier decrypt başarısı kadar tenant/context mismatch reddini de test eder.
- Key deletion schedule backup retention'dan kısa olamaz; crypto-shredding kararı hukuk ve disaster-recovery ekipleriyle ortak verilir.

## Sağlayıcı seçim kriterleri

- Türkiye/KVKK veri işleme değerlendirmesi,
- HSM ve key-policy yetenekleri,
- authenticated encryption context,
- rotation/version ve disable schedule,
- immutable access log entegrasyonu,
- region ve disaster-recovery seçenekleri,
- SLA, incident bildirimi ve alt işleyenler,
- export/egress ve vendor lock-in riski.

## Production çıkış kapısı

- Sağlayıcı ve region onaylı.
- IAM least-privilege ve görev ayrılığı incelendi.
- Test key ile staging rewrap/refingerprint tatbikatı geçti.
- Compromise tabletop yapıldı.
- Log redaction testi geçti.
- Eski/yeni version dual-read ve rollback doğrulandı.
- Hukuk, güvenlik ve platform owner imzaları tamamlandı.

