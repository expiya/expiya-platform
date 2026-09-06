# Expiya İkinci El — Staging migration promotion runbook v0.1

## Kaynak tasarım sınırı

`database/design/used_cars_staging_v0_1.sql.disabled` yalnız tasarımdır. Doğrudan yeniden adlandırılmaz veya uygulanmaz. Kaynak checksum'u manifestte sabitlenir; DBA ve security review sonrası ayrı, yeni bir migration artifact üretilir.

## Zorunlu fazlar

1. Preflight: PostgreSQL sürümü, extension, boş hedef schema ve runtime roller.
2. Schema/type oluşturma.
3. Composite tenant anahtarlı tablolar.
4. `ENABLE + FORCE RLS` ve fail-closed policies.
5. Owner olmayan public/partner/ops runtime rolleri.
6. VIN/plaka/belge içermeyen public projection.
7. Resetlenebilir sentetik seed.
8. RLS/adversarial doğrulama.
9. Rollback ve kalıntı kontrolü.

Faz atlama veya tekrar sırası manifest dışına çıkamaz. Transaction dışı adım varsa gerekçesi ve ayrı rollback'i olmalıdır.

## Promotion kanıtı

Manifest; source checksum, dokuz faz, ayrı DBA/security reviewer, hukuk retention kanıtı, KMS/HMAC kanıtı ve checksum'lu rollback artifact taşır. Review tamamlanmış olsa bile manifest migration execution yetkisi değildir; staging deployment için ayrıca named scope authorization gerekir.

## Sentetik seed

En az iki tenant, tenant başına iki şube/kullanıcı/stok bulunur. Böylece cross-tenant ve cross-branch negatif testleri çalışabilir. Reserved synthetic identifier, sahte isim/iletişim, sıfır production row ve kapalı outbound delivery zorunludur. Dataset ve reset script checksum'ları sürümlenir.

## Güncel durum

Migration ve seed manifest sözleşmeleri hazırdır. DBA/security review, hukuk/KMS kanıtı, executable migration, gerçek staging DB ve rollback artifact bulunmamaktadır. `.disabled` tasarım korunur; migration/seed execution ve production write yetkileri kapalıdır.
