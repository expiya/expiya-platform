# Expiya İkinci El — Staging RLS execution runbook v0.1

## Rol matrisi

Migration owner login olamaz; yalnız migration sırasında DDL sahibidir. Public reader yalnız güvenli projection okur. Partner runtime tenant-scoped işlem yapar. Ops runtime yalnız task grant kapsamındadır. Import worker tenant-scoped ve idempotent import yapar. Audit reader yalnız redacted audit view görür. Hiçbir runtime rol tablo sahibi veya `BYPASSRLS` olamaz.

## Koşum modeli

12 RLS adversarial senaryosu gerçek staging runtime rolüyle, ayrı transaction ve fresh pool checkout kullanarak koşar. Fixture en az iki tenant/şube içerir. Her koşum sonunda rollback zorunludur. Beklenen deny/empty/rollback/zero-public-row dışında sonuç fail sayılır.

Audit gerektiren senaryolar query kanıtına ek olarak audit event checksum'u taşır. Tek eksik veya failed senaryo migration promotion'ını bloke eder. Test migration owner veya superuser ile çalıştırılamaz.

## Public projection

Canonical view `used_cars.public_listing_projection` olur ve security barrier taşır. Public reader'ın base table grant'i yoktur. Tenant/branch kimlikleri, VIN/plaka, ciphertext/fingerprint, belge object key, lead iletişimi, kaynak referansı ve asserted-by alanları view'da bulunamaz.

Suspended tenant ve expired listing için row count sıfır olmalıdır. Safe introspection sonucu bile public grant'i otomatik açmaz; deployment scope approval ayrıca gerekir.

## Güncel durum

Altı rol, 12 senaryo execution planı ve public projection introspection sözleşmesi hazırdır. Gerçek PostgreSQL rolleri/view'ı yoktur ve staging koşumu yapılmamıştır. Migration promotion ve public grant yetkileri kapalıdır.
