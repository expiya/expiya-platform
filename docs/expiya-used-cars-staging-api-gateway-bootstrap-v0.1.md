# Expiya İkinci El — Staging API gateway bootstrap v0.1

## Route manifesti

On v1 endpoint public B2C, partner, ops, service feed ve provider webhook hostlarına eşlenir. Gateway registry'deki auth, body-size ve rate-limit değerlerini aynen uygular. Client tarafından gönderilen tenant header'ları silinir; doğrulanmış principal context yalnız gateway/auth adapter tarafından eklenir.

Staging route'ları internal ve disabled başlar. Upstream ref, identity/provider ve security review tamamlanmadan atanmaz. Manifest route enablement veya dış internet erişimi yetkisi değildir.

## Replay ve idempotency store

Idempotency, webhook nonce, feed nonce, OIDC JTI ve one-time handoff code ayrı namespace/TTL partition'larına sahiptir. Store encrypted ve atomic insert-if-absent destekli olmalıdır. Raw request/webhook payload saklanmaz. Üyelik paketi rate limit veya idempotency davranışını değiştiremez.

## Negative contract suite

Yanlış host/audience, eksik tenant context, tenant-header spoof, eksik CSRF/idempotency, aynı key ile farklı payload, bozuk webhook imzası/replay, büyük body, rate-limit, error leakage, cursor tamper ve cross-tenant object ID olmak üzere 14 sentetik senaryo zorunludur.

Her sonuç endpoint, expected/observed status ve checksum'lu evidence taşır. İç detay sızıntısı tek başına suite'i başarısız yapar.

## Güncel durum

Gateway, replay-store ve contract-suite manifestleri hazırdır. Upstream/provider/KMS refs, gerçek gateway/store, route enablement, load/replay koşumu ve compatibility kanıtları yoktur. Route/store enablement ve external API yetkileri kapalıdır.
