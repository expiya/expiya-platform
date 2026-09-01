# Expiya İkinci El — API sözleşmesi ve sürümleme runbook v0.1

## Yüzey ayrımı

Public B2C, partner, ops, service feed ve provider webhook ayrı auth ve rate-limit alanlarıdır. Partner/ops endpoint'i tenant context olmadan çalışamaz. Service feed HMAC, provider webhook sağlayıcı imzası ve replay kontrolü gerektirir. Browser mutation'larında CSRF uygulanır.

## Mutation güvenliği

Tüm POST/PATCH işlemleri idempotency key taşır. Request body boyutu ve dakika başına istek limiti endpoint bazında sınırlıdır. Tenant kimliği yalnız body'den güvenilir kabul edilmez; doğrulanmış principal/service grant ile eşleşmelidir.

## Protokol

API yolları major version içerir. Hatalar correlation ID, kararlı error code ve güvenli field errors taşır; stack trace, SQL, token veya iç detay göstermez. Retryable sonuç `Retry-After` ile tutarlıdır. Liste uçları en fazla 100 kayıtlı opaque cursor pagination kullanır; toplam tenant envanteri enumeration amacıyla açılmaz.

## Deprecation

Güvenlik acili dışında en az 90 gün bildirim, replacement version, checksum'lu migration guide, etkilenen tenant bildirimi ve düşük aktif kullanım kanıtı gerekir. Sunset otomatik değildir ve rollback planıyla named approver ister.

## Güncel durum

On endpoint için disabled v1 registry, hata/pagination ve deprecation sözleşmeleri hazırdır. API gateway, auth audience, gerçek tenant izolasyonu, idempotency/replay store, load test, compatibility suite ve developer documentation review eksiktir. `API_GOVERNANCE` staging, pilot ve production için `NO-GO`; production API, harici partner API ve webhook processing yetkileri kapalıdır.

Staging gateway, replay-store ve negatif contract-suite ayrıntıları `expiya-used-cars-staging-api-gateway-bootstrap-v0.1.md` içinde sürümlenmiştir.
