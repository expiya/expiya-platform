# Expiya İkinci El — UI ve erişilebilirlik QA raporu v0.1

## Koşum kapsamı

1 Eylül 2026 tarihinde yerel Next.js development ortamında, gerçek veri veya dış servis kullanılmadan tarayıcı tabanlı smoke test yapıldı.

- Mobil B2C: 390 × 844 px; `/ikinciel`, tercihler, eşleştirme ve sentetik araç detayı.
- Masaüstü partner demo: 1440 × 900 px; manifestteki 14 route.
- Kontroller: sayfa başlığı, `lang=tr`, tek `h1`, yatay taşma, kontrol adları, demo açıklaması, partner robots/referrer metadata'sı ve production-auth işareti.

## Sonuç

- Dört B2C route yatay taşma olmadan açıldı ve sentetik/demo sınırını görünür biçimde taşıdı.
- Tercih akışında adım geçişi çalıştı; sayı ve seçim kontrollerine stabil `id`, `name` ve explicit `label[for]` bağlantısı eklendi.
- 14 partner-demo route'unun tamamında tek `h1`, taşmasız masaüstü düzen ve adlandırılmış butonlar doğrulandı.
- Bütün partner-demo sayfalarında `noindex, nofollow, nocache`, `no-referrer` ve `data-production-auth="disabled"` görüldü.
- Ana B2C sayfada bir title, Türkçe document language, isimsiz buton bulunmaması ve alt metinsiz görsel bulunmaması doğrulandı.

## Bilinçli sınırlar

Bu smoke test kapsamlı WCAG 2.2 AA sertifikası değildir. Klavye-only tüm akış, screen reader kombinasyonları, renk kontrastının otomatik/manuel ölçümü, zoom/reflow 200–400%, reduced motion ve gerçek cihaz matrisi production öncesinde ayrıca test edilmelidir. Partner yüzeyi sentetik demo olduğu için auth, gerçek form submission, upload ve veri yazma test edilmedi.

## Tekrarlanabilirlik

Route listesi ve beklenen viewport/metadata güvenlik sonuçları `features/used-cars/readiness/uiSmokeManifest.ts` içinde sürümlenmiştir. Unit test route dosyalarının varlığını ve partner yüzeyi kapsamını kontrol eder. Tarayıcı smoke testi UI veya routing değişikliğinden sonra tekrarlanmalıdır.

## Karar

Sentetik MVP UI smoke kapısı geçti. `productionUiLaunchAuthorized` sabit `false` kalır; sonuç staging, pilot veya production yetkisi değildir.
