# Expiya İkinci El — Commit-ready teslim manifestosu v0.1

## Allowlist

Bu teslim yalnız aşağıdaki yollarla stage edilmelidir:

```text
app/ikinciel/**
components/used-cars/**
features/used-cars/**
database/design/used_cars_staging_v0_1.sql.disabled
docs/expiya-used-cars-*.md
tsconfig.used-cars-ui.json
```

`next.config.ts`, `package.json`, `package-lock.json`, sıfır araç kodu/verisi ve mevcut conflict dosyaları bu manifest tarafından otomatik olarak sahiplenilmez. Bir dosyanın başka çalışmalardan değişiklik taşıdığı şüphesinde patch/hunk bazlı inceleme gerekir.

## Envanter özeti

Denetim anında ikinci el kapsamı 20 route/layout dosyası, 19 UI bileşeni, 253 domain/runtime TypeScript dosyası, 188 test dosyası, bir disabled DB design dosyası ve 67 `expiya-used-cars-*.md` belgesi içerir. Sayılar informational snapshot'tır; doğrulama komutları dosya içeriği ve davranış için otoritedir.

## Zorunlu doğrulama

```bash
npx vitest run features/used-cars
npx tsc -p tsconfig.used-cars-ui.json --pretty false
npx eslint features/used-cars --max-warnings=0
git diff --check -- features/used-cars app/ikinciel components/used-cars docs/expiya-used-cars-*.md tsconfig.used-cars-ui.json
```

UI için ayrıca staging/local smoke test: `/ikinciel`, tercihler, eşleştirme, araç detayı ve tüm partner-demo sayfalarında noindex/demo işaretleri, navigation ve responsive görünüm kontrol edilmelidir. Genel repo build'i mevcut unrelated conflict'ler çözülmeden bu teslimin kalite sinyali olarak kullanılamaz.

## Commit bölme önerisi

1. Mimari/domain sözleşmeleri ve testleri.
2. Sentetik B2C/partner-demo UI.
3. Güvenlik/readiness/launch-control paketleri.
4. Belgeler ve disabled DB design.

Her commit öncesinde allowlist diff okunmalı; production yetkilerini `true` yapan değişiklik, executable migration, redirect/DNS activation veya gerçek veri bulunmamalıdır. Commit ve push bu manifest kapsamında otomatik yapılmaz.

## Teslim kararı

İkinci el kapsamı hedefli test/typecheck/lint kapılarından geçmeye adaydır ve allowlist ile commit'e hazırlanabilir. Repository'nin tamamı mevcut unrelated değişiklikler ve conflict'ler nedeniyle temiz değildir. Launch seviyesi yalnız sentetik MVP'dir.
