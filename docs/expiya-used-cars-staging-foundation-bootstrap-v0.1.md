# Expiya İkinci El — Staging foundation bootstrap v0.1

## Amaç

İlk executable staging dilimi, yalnız sentetik veriyle partner girişinden public listing projection'a kadar tenant izolasyonunu kanıtlar. Bu belge ortam kurmaz, migration uygulamaz veya production trafiği açmaz; uygulanacak bootstrap sözleşmesini sabitler.

## Üç ayrı deployable

Public, partner ve ops staging yüzeyleri ayrı host, identity audience, database role, KMS context, cache namespace ve telemetry stream kullanır. Partner ve ops ayrı host-only session/csrf secret'larına sahiptir. Public DB rolü read-only'dir.

Staging hostları public DNS'e açılmaz. Gerçek firma verisi, gerçek kullanıcı PII, production backup restore, dış lead gönderimi ve gerçek ödeme yasaktır. Dataset tamamen sentetik ve resetlenebilir olmalıdır.

## İlk dikey dilim

1. MFA'lı sentetik partner principal ve ayrı audience.
2. Transaction-local tenant/actor/branch context ve pool reuse negatif testi.
3. Sentetik taxonomy ile inventory creation, sahte VIN encryption/fingerprint ve revision.
4. Task-scoped moderasyon ve bağımsız ikinci review.
5. Allowlist public projection; VIN/plaka/belge yokluğu.
6. Read-only public rol, sentetik açıklama ve staging `noindex`.
7. Tenant suspension sonrası sıfır public row, session/grant revoke.
8. Hash-chain audit ve redacted export.

Her checkpoint named owner, beklenen kanıt ve checksum taşır. Sekizinin tamamı geçmeden dikey dilim tamamlanmış sayılmaz.

## Uygulama sırası

1. Onaylı provider ve secret referanslarıyla environment manifest gerçek staging değerlerine bağlanır.
2. Disabled SQL tasarımı DBA/security review sonrası yeni executable migration olarak ayrıca üretilir; `.disabled` dosya doğrudan uygulanmaz.
3. Identity adapter, transaction runner ve üç DB rolü entegre edilir.
4. Sentetik seed ve reset job hazırlanır.
5. Dikey dilim evidence runner ile çalıştırılır.
6. Rollback ve fail-closed suspension tatbikatı yapılır.

## Güncel durum

Üç yüzeylik manifest, staging veri sınırı ve sekiz checkpoint hazırdır. Gerçek staging environment, provider, secret, database, identity ve evidence koşumu bulunmadığı için mevcut launch-control durumu değişmez. Production promotion ve gerçek veri kullanımı kapalıdır.
