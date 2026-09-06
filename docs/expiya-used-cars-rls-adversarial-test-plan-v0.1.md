# Expiya İkinci El — RLS saldırgan test planı v0.1

Durum: Makine-okunur senaryo kataloğu hazır; gerçek PostgreSQL staging koşumu yapılmadı.

Kaynak: `features/used-cars/security/rlsAdversarialMatrix.ts`

## Çalıştırma modeli

Her senaryo ayrı transaction ve temiz connection-pool checkout'u ile koşar. Test fixture'ları en az iki tenant, her tenant'ta iki şube, bütün dealer rolleri, iki moderatör, public reader ve worker rollerini içerir.

## Zorunlu senaryolar

- `RLS-001`: başka tenant stok okuma.
- `RLS-002`: aynı tenant içinde atanmamış şube okuma.
- `RLS-003`: UPDATE ile tenant değiştirme.
- `RLS-004`: cross-tenant composite foreign key.
- `RLS-005`: import tenant spoofing ve batch rollback.
- `RLS-006`: görev dışı moderatör belge/subject erişimi.
- `RLS-007`: public reader ile base/private tablo erişimi.
- `RLS-008`: pool connection context leakage.
- `RLS-009`: tenant askıya almada sıfır public satır.
- `RLS-010`: runtime role table ownership/BYPASSRLS.
- `RLS-011`: report viewer kişi/listing düzeyi lead export.
- `RLS-012`: eksik `app.tenant_id` için fail-closed sonuç.

## Çıkış kapısı

Tüm senaryolar otomatik staging koşumunda beklenen fail-closed sonucu üretmeli. Tek bir eksik veya beklenmedik allow sonucu migration promotion'ını engeller. Testler migration owner ile değil gerçek runtime DB rolleriyle çalıştırılır.

Runtime rol eşlemesi, execution evidence ve public view introspection ayrıntıları `expiya-used-cars-staging-rls-execution-runbook-v0.1.md` içinde tanımlıdır.
