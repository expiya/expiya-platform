# Expiya İkinci El — Repository kapsam ve bütünlük denetimi v0.1

## Teslim kapsamı

- `app/ikinciel/**`: sentetik B2C ve partner-demo route'ları.
- `components/used-cars/**`: ikinci el demo UI bileşenleri.
- `features/used-cars/**`: bounded context sözleşmeleri, politikalar, readiness ve testler.
- `database/design/used_cars_staging_v0_1.sql.disabled`: çalıştırılamaz şema taslağı.
- `docs/expiya-used-cars-*.md`: mimari, güvenlik, operasyon ve launch belgeleri.
- `tsconfig.used-cars-ui.json`: izole typecheck kapsamı.

## Korunan sıfır araç sınırı

İkinci el domain kodu `features/decision`, `features/vehicle-data`, `data/**` veya `components/cars` iç nesnelerini import etmez. Korunan sıfır araç domain/UI/veri dizinleri de ikinci el modüllerini import etmez. Bu kural `usedCarsBoundedContextIntegrity.test.ts` ile iki yönde doğrulanır.

İkinci el demo kataloğu sentetiktir. Mevcut Motor V3, preference ledger, 549 varyant kataloğu, exact varyant, danışman, teklif/test sürüşü/bayi handoff'u, 349 TL rapor ve analitik sözleşmelerinde bu teslim adına değişiklik yapılmamıştır.

## Çalışma ağacı gözlemi

Repository bu çalışmadan bağımsız çok sayıda staged, modified ve untracked dosya içeriyor. Aşağıdaki merge conflict'ler ikinci el kapsamı dışındadır ve bilinçli olarak değiştirilmemiştir:

- `app/decision/[id]/page.tsx`
- `data/production/vehicleMediaAssets.ts`
- `features/vehicle-data/vehicleMediaCoverage.test.ts`

Bu nedenle bütün repository için temiz `git diff --check`, genel typecheck veya tek commit iddiası üretilemez. Teslim doğrulaması yalnız yukarıdaki ikinci el kapsamına yönelik komutlarla yapılır. Commit hazırlanırken `git add .` kullanılmamalı; allowlist ile yalnız manifestteki yollar stage edilmelidir.

## Yasak teslim işlemleri

- Conflict çözmek veya unrelated değişiklikleri geri almak.
- `git reset --hard`, geniş checkout, toplu silme veya stash ile kullanıcı çalışmasını taşımak.
- Disabled SQL'i `database/migrations` altına almak.
- Redirect, DNS, production deployment veya gerçek provider bağlantısını aktive etmek.
- Gerçek firma, PII, stok, lead, ödeme veya mesaj işlemek.

## Denetim sonucu

İkinci el kapsamı bounded-context, test ve belge düzeyinde ayrıştırılmıştır. Çalışma ağacının bütünü commit-ready değildir; ikinci el teslimi allowlist ile seçilebilir durumdadır. Mevcut launch-control kararı sentetik MVP hazır, diğer aşamalar NO-GO'dur.
