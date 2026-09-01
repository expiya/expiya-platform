# Expiya İkinci El — Erişilebilirlik release runbook v0.1

## Kapsam

B2C mobil/masaüstü, partner ve ops yüzeyleri ayrı test edilir. Klavye, odak sırası, programatik ad/rol/durum, form hataları, kontrast, zoom/reflow, reduced motion, dokunma hedefleri, görsel alternatifleri, tablo ilişkileri ve session timeout davranışı release-blocking gereksinimlerdir.

Güven durumu yalnız renkle anlatılamaz. “Satıcı beyanı”, “doğrulanmadı”, “eksik”, “çelişkili” ve “süresi geçti” etiketleri metin ve yardımcı teknolojiyle anlaşılır olmalıdır. Sponsorlu içerik görsel ve programatik olarak organik sonuçtan ayrılır.

## Kanıt matrisi

Her requirement/surface çifti PASS sonucu, gerekli test yöntemlerinin tamamı, named tester, zaman, checksum'lu kanıt, expiry ve sıfır açık bulgu taşır. Otomatik tarama tek başına yeterli değildir; keyboard-only, screen reader, görsel ve bilişsel review birlikte kullanılır.

Önerilen screen-reader/device matrisi en az iOS VoiceOver + Safari, Android TalkBack + Chrome ve desktop NVDA/VoiceOver kombinasyonlarını içerir. 200–400% zoom/reflow ve reduced-motion gerçek tarayıcıda doğrulanır.

## Release ve regresyon

UI, design token, form component, routing veya güven etiketi değişikliğinde etkilenen matris yeniden koşulur. Açık kritik/majör bulgu varken promotion yoktur. Deney sonucu erişilebilirlik regresyonunu başarı metriğiyle telafi edemez.

## Güncel durum

15 release-blocking requirement'a ek olarak dokuz cihaz/yardımcı teknoloji kombinasyonu, dokuz kritik yolculuk ve finding/retest gate staging bootstrap sözleşmesi olarak hazırdır. Önceki sentetik smoke testi korunur ancak kapsamlı uygunluk iddiası değildir. Gerçek otomatik audit, keyboard, screen reader, kontrast, zoom/reflow, reduced-motion, bilişsel review ve bağımsız inceleme eksiktir. `ACCESSIBILITY` staging, pilot ve production için `NO-GO`; uygunluk iddiası ve production UI launch yetkileri kapalıdır. Ayrıntılı staging sınırı `docs/expiya-used-cars-staging-accessibility-validation-bootstrap-v0.1.md` içindedir.
