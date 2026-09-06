# Expiya İkinci El — Staging backup ve restore bootstrap v0.1

## Backup hedefleri

Tenant operasyonu, hassas kimlikler, medya/belgeler, taxonomy release, audit chain ve configuration ayrı backup sınıflarıdır. Provider, KMS key, region, schedule ve expiry job birlikte yapılandırılır; kısmi konfigürasyon kabul edilmez. Configuration dışındaki sınıflar immutable olmalıdır.

Staging backup yalnız staging sentetik verisinden üretilebilir. Production backup veya satırlarının staging'e taşınması yasaktır. Manifest hazır olsa bile backup enablement otomatik değildir.

## Zorunlu tatbikatlar

1. Tam sentetik restore.
2. Restore sonrası cross-tenant negatif test.
3. Silme suppression kayıtlarının yeniden uygulanması.
4. Audit hash-chain continuity.
5. KMS key-version recovery.
6. Backup expiry ve destruction evidence.
7. Failover ve kontrollü failback.

Her tatbikat source/restored checksum eşitliği, iki farklı reviewer, tamamlanma zamanı ve evidence checksum ister. Production cutover yapılamaz.

## Restore sonrası güvenlik kapısı

Beklenen ve gözlenen tenant seti bire bir eşleşir. Cross-tenant sızıntı sıfırdır. Silinmiş subject fingerprint'leri suppression listesinde bulunur; restore onları normal operasyona geri getiremez. Suspended tenant ve expired listing public row sayısı sıfırdır. Audit chain doğrulanır.

## Güncel durum

Altı disabled target, yedi tatbikat ve restored-data safety sözleşmesi hazırdır. Provider, KMS, region, schedule, expiry job ve gerçek staging restore/failover kanıtları yoktur. Backup enablement, production restore ve automatic failover yetkileri kapalıdır.
