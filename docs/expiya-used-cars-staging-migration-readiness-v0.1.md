# Expiya İkinci El — Staging migration taslağı ve readiness v0.1

## Teslim edilen taslak

`database/design/used_cars_staging_v0_1.sql.disabled`

Dosya bilinçli olarak `database/migrations` dışında ve `.disabled` uzantılıdır. İlk transaction ifadesinden sonra kasıtlı exception üretir ve sonunda rollback taşır. Yanlışlıkla çalıştırılsa dahi şema uygulamamalıdır.

Taslak; tenant/branch composite foreign key'leri, stok/revision/listing ayrımı, ciphertext/fingerprint alanları, media/lead/import/audit çekirdeği, `ENABLE + FORCE RLS` ve örnek tenant politikalarını içerir.

## Mevcut readiness

| Kapı | Durum |
|---|---|
| Doğrulanmış session context sözleşmesi | İç tasarım hazır |
| Pool transaction izolasyonu | Unit test hazır; gerçek PostgreSQL koşumu eksik |
| Composite tenant key review | İç tasarım hazır |
| KVKK retention hukuk onayı | Eksik |
| KMS/HMAC sağlayıcı ve rotation onayı | Eksik |
| Public projection fail-closed | Unit test hazır; gerçek DB koşumu eksik |
| Moderatör grant modeli | İç tasarım hazır; bağımsız review eksik |
| Bağımsız güvenlik incelemesi | Eksik |
| Staging rollback/RLS saldırgan koşumu | Eksik |

## Promotion kuralı

Yukarıdaki bütün kapılar kapanmadan dosya `.sql` migration'a çevrilemez, migration numarası alamaz ve staging/production veritabanına uygulanamaz. `currentUsedCarsMigrationReadiness.productionWriteAuthorized` her durumda `false` kalır; gerçek uygulama yetkisi ayrı deployment kontrolüdür.

Promotion fazları, reviewer ayrımı, rollback artifact ve sentetik seed koşulları `expiya-used-cars-staging-migration-promotion-runbook-v0.1.md` içinde ayrıca sürümlenmiştir.
