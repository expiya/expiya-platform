# Expiya İkinci El — Mimari ve ürün karar kaydı v0.1

## Kabul edilmiş mimari kararlar

| Kimlik | Karar |
|---|---|
| UC-ADR-001 | İkinci el ayrı bounded context'tir. |
| UC-ADR-002 | B2C marka ailesinde kalır; partner ve ops ayrı uygulama/güvenlik alanıdır. |
| UC-ADR-003 | Taxonomy kimliği ile fiziksel stok kimliği ayrıdır. |
| UC-ADR-004 | Kanıt bütün ilan için değil atomik alan için tutulur. |
| UC-ADR-005 | Organik eşleştirme ile ticari görünürlük ayrıdır. |
| UC-ADR-006 | Pilot kontrollü kapsamda ve fail-closed açılır. |

Bir mimari karar değiştirilecekse kayıt silinmez; yeni ADR eski kaydı `SUPERSEDED` yapar ve karşılıklı kimlik ilişkisi kurar.

## Ürün sahibi karar kuyruğu

| Kimlik | Konu | Önerilen güvenli varsayılan | Durum |
|---|---|---|---|
| UC-PD-001 | Pilot coğrafyası | Tek şehirde iki kontrollü bölge | Product Owner onaylı |
| UC-PD-002 | Taxonomy/stok kapsamı | Yaygın modern binek/SUV, sınırlı stok | Product Owner onaylı |
| UC-PD-003 | B2C hesap modeli | Oturumsuz tercih; lead öncesi rıza/doğrulama | Öneri |
| UC-PD-004 | Pilot üyelik | Süreli erken erişim, ücret/yenileme kapalı | Product Owner onaylı |
| UC-PD-005 | Ekspertiz | Pilotta yalnız bağımsız yönlendirme | Operations Owner onaylı |
| UC-PD-006 | Klasik araç | Pilot dışında, uzman akışı sonraki sürüm | Product Owner onaylı |
| UC-PD-007 | Partner app | Aynı monorepo, ayrı deployable app/auth audience | Öneri |
| UC-PD-008 | Lead alıcısı | Doğrulanmış şube kullanıcısı ve named ops owner | Öneri |
| UC-PD-009 | Public fiyat geçmişi | Lisanslı/kaynaklı veri gelene kadar kapsam dışı | Öneri |
| UC-PD-010 | Sponsorlu vitrin | MVP dışında, ileride açık etiketli ayrı yüzey | Product Owner onaylı |

Öneriler otomatik onay değildir ve production etkisi yaratmaz. Her karar, ilgili owner rolünün açık onayıyla yeni sürüme geçirilmelidir. Hukuk veya güvenlik sahibi olan kararlar ürün sahibinin tek taraflı onayıyla kapanmaz.

## Karar oturumu çalışma seti

`productDecisionWorkshop` her karar için önerilen değer, en az iki alternatif, gerekçe, etkilenen yüzeyler, owner rolü, bağımsız review ihtiyacı ve yeniden değerlendirme/rollback tetikleyicisi sağlar. On öğenin durumu `AWAITING_OWNER_DECISION` olarak sabittir; çalışma setinin eksiksiz olması kararları onaylamaz.

Oturumda her madde için seçilen değer ve gerekçe karar snapshot'ına yazılır. Owner rolü doğrulanır; Legal ve Security kararlarında farklı bir bağımsız reviewer gerekir. Snapshot checksum'ı, onay zamanı ve varsa bitiş tarihi kaydedildikten sonra approval coverage tekrar hesaplanır. Production kapsamı ayrıca açık promotion kararı olmadan değişmez.

## Readiness etkisi

`PRODUCT_GOVERNANCE`, staging, kontrollü pilot ve production için zorunlu launch domain'idir. Altı owner kararı onaylandı; `UC-PD-003`, `007`, `008` ve `009` için Legal/Security owner ve bağımsız review kayıtları açık kaldığı sürece bu aşamalar `NO-GO` kalır. Sentetik MVP davranışı değişmez ve gerçek veri, firma, ilan, lead, ödeme veya deployment yetkisi verilmez.

Serdar Akgül'ün Product Owner olarak `001`, `002`, `004`, `006`, `010`; Operations Owner olarak `005` karar onayları ayrı checksum'lı receipt'lerle kaydedilmiştir.

## Kurucu kabul kaydı — 1 Eylül 2026

Serdar Akgül, SKYBIT Yazılım ve Bilgi Teknolojileri Danışmanlığı Ltd. Şti. kurucusu ve Expiya.com kurucusu sıfatıyla `UC-PD-001..010` kararlarının önerilen güvenli varsayılanlarının tamamını kabul etmiştir.

- Ratification ID: `UC-RAT-2026-09-01-001`
- Canonical snapshot: `sha256:09b11429422edb89f3808205494cc86c65785093321682e7ba13a7f368adb7f6`
- Kapsam: On önerilen değerin ürün yönü olarak kurucu kabulü
- Yetki sınırı: Operations, Legal ve Security uzman rol imzaları yerine geçmez
- Bağımsız inceleme: Legal ve Security kararları için hâlen zorunludur
- Production etkisi: Yok; staging/pilot/production `NO-GO` korunur

Bu kayıt değiştirilemez snapshot olarak saklanır. Sonraki değişiklik, mevcut kaydı silmek yerine decision change-control ve supersede ilişkisiyle yapılır.

Repository içi dört track incelemesi tamamlanmış ve kritik iç bulgu olmadan `INTERNAL_PASS_EXTERNAL_SIGNOFF_REQUIRED` sonucu verilmiştir. Ayrıntı `docs/expiya-used-cars-founder-decision-internal-review-v0.1.md` belgesindedir. Bu sonuç dış uzman imzalarını kapatmaz.
