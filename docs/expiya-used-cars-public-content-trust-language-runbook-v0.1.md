# Expiya İkinci El — Public içerik ve güven dili runbook v0.1

## Güven dili

Sekiz kanıt durumu için tek canonical Türkçe dil kullanılır: Expiya doğruladı, satıcı beyanı, kullanıcı beyanı, belge yüklendi/içerik doğrulanmadı, doğrulanamadı, eksik, çelişkili ve güncelliğini yitirmiş. Yalnız `EXPIYA_VERIFIED`, alan bazlı kaynak ve tarih mevcutsa olumlu doğrulama iddiası taşıyabilir.

## Yasak içerik

“Kesin al/alma”, hasarsızlık veya kilometre garantisi, kaynaksız piyasa üstünlüğü, üyeliği doğruluk garantisi gibi gösterme ve baskı/acele dili public içerikte yasaktır. Sponsorlu yüzey açıkça “Sponsorlu” etiketi taşır. Klasik araçta orijinal, matching numbers veya koleksiyonluk iddiası kanıtsız yayınlanamaz.

Araç detayı, eşleşme açıklaması, klasik araç ve AI yanıtı güvenli sonraki adım içerir: satıcıdan güncel belge isteme, geçmiş kontrolü ve bağımsız ekspertiz gibi. Bu yönlendirme kesin satın alma talimatı değildir.

## Review ve sürümleme

Public content artifact; locale, sürüm, checksum, içerik tasarımcısı, hukuk, erişilebilirlik ve kanıt reviewer'ı taşır. Dört rol ayrıdır. Review expiry veya supersede sonrasında metin yeniden yayınlanamaz. AI tarafından üretilen metin aynı gate'ten geçer; otomatik publication yoktur.

## Güncel durum

Canonical güven dili ve yasak ifade gate'ine ek olarak yedi-context inventory, ayrık review matrisi ve regresyon corpus'u staging bootstrap sözleşmesi olarak hazırdır. Production içerik kaynağı ile hukuk, erişilebilirlik, evidence, klasik iddia ve sponsorlu etiket imzaları eksiktir. `CONTENT_GOVERNANCE` staging, pilot ve production için `NO-GO`; public veya otomatik copy publication yetkileri kapalıdır. Ayrıntılı staging sınırı `docs/expiya-used-cars-staging-content-review-bootstrap-v0.1.md` içindedir.
