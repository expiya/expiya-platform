# Expiya Cars Aşama 2 — Satış Danışmanı ve Authority Boundary

Durum: `IMPLEMENTED / FAIL-CLOSED PILOT`

Sürüm: `2.0.0`
Artifact şeması: `variant-content/v2`

Kullanıcı bilgilendirme sürümü: `PHASE2-DISC-2026.08-v1.0`
Bilgilendirme checksum: `sha256:a9057fbc1c65e58fb9ee1c085f66039733cf805fe62fcf5b5af1af03ae49bcfd`

## Ürün sınırı

Aşama 2, Aşama 1'in seçtiği aracı değiştirmez. Filtreleme, sıralama, aday eleme, persona puanlama veya ledger mutation yapmaz. Yalnız `REVEALED` lifecycle durumundaki bir recommendation offer içindeki, kullanıcının ayrı CTA ile seçtiği `exactVariantId` için çalışır. Kullanıcı açıkça marka/model söylediğinde seçili aracı sabit referans tutan, en fazla üç araçlık decision-neutral karşılaştırma yapabilir. Yeni kazanan seçmez; belirsiz “rakipleri” talebinde araç uydurmak yerine kullanıcıdan marka/model ister.

## İmzalı handoff

`POST /api/cars/sales-advisor/handoff` şu üç authority kaydını birlikte doğrular:

1. Aşama 1'in HMAC imzalı V3.8 state token'ı ve `conversationId` bağı,
2. sunucu offer registry'sindeki `REVEALED` kayıt, reveal candidate seti ve recommendation-terms kabulü,
3. güncel aktif katalog release/fingerprint'i ve exact varyantın `ON_SALE` durumu.

Token; conversation ID, decision fingerprint, offer ID, exact variant ID, catalog release/fingerprint, yalnız kullanıcı-explicit/confirmed güçlü ihtiyaçların public-safe özeti, puansız persona eşleşme özeti, koşul sürümü/zamanı, state digest, üretim ve son kullanma zamanını taşır. Token HMAC ile imzalıdır, 24 saat geçerlidir ve aynı offer/variant/revision çağrısı aynı token'ı döndürür. Tampered, expired, cross-conversation, unrevealed, candidate-set dışı veya catalog-stale istekler `409` ile kapanır.

`stateToken` istemci taşıması yalnız transport'tur; güven kaynağı imza doğrulaması ve reveal lifecycle kesişimidir. Aşama 2 hiçbir Aşama 1 state/store yazma fonksiyonu çağırmaz.

## Variant content artifact

Artifact exact varyant ve catalog release'e pinlidir. Kaynak karar gerçeklerinden deterministik olarak materialize edilir; `sourceChecksum` kaynak görünümünü, `checksum` yayın artifact'ını bağlar. Validator şema sürümünü, artifact sürümünü, exact variant ID'yi, release/fingerprint'i, checksum'ı ve kapalı claim disposition vocabulary'sini doğrular.

Yayın kapısı:

- Yalnız `HIGH` confidence, provenance kayıtlı catalog fact `VERIFIED` iddia olur.
- Exact doğrulanmayan `MEDIUM/LOW`, conflict, unknown, silent absence veya pilot dışı evidence public claim listesine girmez (`NO_CLAIM` disposition).
- Family-level, representative ve approximate içerik ancak kapsam etiketiyle gösterilebilir.
- Görseller yalnız mevcut publishable media registry ve rights/identity kapısından gelir.
- Renk yalnız market + model year + exact variant evidence bulunduğunda yayımlanır. Şu an authority sözleşmesinde bu alan olmadığı için fail-closed boş kalır.
- Video yalnız resmî/lisanslı, exact-applicability kaydıyla yayımlanır. Şu an kayıt olmadığı için bölüm gizlenir.
- Fiyat `VERIFIED`, `ESTIMATED` veya `UNAVAILABLE` olarak mevcut V3.4 price authority'den gelir.
- Internal assertion ID, checksum, audit payload ve governance alanları API'nin public artifact projeksiyonunda kullanıcı metnine dönüştürülmez.

## Sayfa ve danışman

`/cars/variant/[exactVariantId]?handoff=...` sayfası hero, ihtiyaç eşleşmesi, günlük karşılık, teknik özellikler, donanım, renk, galeri, opsiyonel video, fiyat, Aşama 3 CTA'ları ve Türkçe danışman sohbetini sunar. Kişisel eşleşme yalnız handoff'taki onaylı ihtiyaçlarla kurulur; bağlam yoksa genel örnek olduğu açıkça söylenir.

Aktif katalogdaki bütün exact varyant kimlikleri `generateStaticParams` ile ortak sayfa şablonuna önceden bağlanır. Büyük ekranda fiyat ve sohbet paneli sticky yan sütunda kalır; küçük ekranda içerik akışına katılır. Bölüm navigasyonu, galeri tab'ları, CTA'lar ve sohbet klavyeyle kullanılabilir. YouTube içeriği yalnız `youtube-nocookie.com/embed`, Vimeo içeriği yalnız `player.vimeo.com/video` allowlist'i ve `VERIFIED` disposition ile iframe içinde oynatılır.

Danışman deterministik ve evidence-bounded'dır. Önce somut fact/fiyat yanıtı verir, kısa mesajlar kullanır, eksikliği açıklar ve sahte kıtlık/aciliyet üretmez. Yeni katalog gerçeği üretmesi için modele yetki verilmez.

Kullanıcıya Aşama 2'nin yapay zekâ destekli fakat bağlayıcı teklif, sipariş, rezervasyon, garanti veya ekspertiz olmadığı; katalog/fiyat/medya kapsamları ve Aşama 3'ün yalnız yan etkisiz handoff olduğu `/satis-danismani-bilgilendirmesi` sayfasında sürümlü ve checksum-bound olarak açıklanır. Bu bilgilendirme yeni sözleşme kabulü, KVKK açık rızası veya ticari elektronik ileti izni değildir.

### Semantik mesajlaşma

Aşama 2'nin birincil soru-anlama katmanı `semantic.server.ts` içindeki structured semantic planner'dır. Planner serbest, çekimli, yazım hatalı ve dolaylı Türkçeyi; o anda yayınlanmış artifact'ın fact ve equipment allowlist'ine eşler. Model yalnız `intent`, izinli fact/equipment anahtarları, cevap modu, açık karşılaştırma araç adları ve gerekirse netleştirme üretir. Değer üretemez. Allowlist dışı tek bir anahtar bütün model planını reddeder ve deterministik fallback devreye girer.

Resolver yalnız seçilmiş exact varyant artifact'ından değeri okur; ardından evidence disposition ve kapsam açıklamasını ekler. Böylece “sekiz kişiyiz, hepimiz binebilir miyiz?” ifadesi `seats` alanına bağlanabilir, fakat koltuk sayısı kabin konforunun kanıtı gibi sunulmaz. Son 12 kısa mesaj yalnız `conversationId + offerId + exactVariantId` anahtarında tutulur; başka conversation veya varyanta taşınmaz ve imzalı Aşama 2 handoff süresi dolduğunda silinir. Sağlayıcı yoksa, zaman aşımına uğrarsa veya geçersiz çıktı verirse mevcut güvenli deterministic çözümleyici çalışır.

OpenAI semantik planlayıcısı ayrıca `CARS_PHASE2_CROSS_BORDER_TRANSFER_READY=true` fail-closed kapısına bağlıdır. OpenAI sözleşme sahibi, veri işleyen/alt işleyen ilişkisi, veri bölgesi ve KVKK m.9 aktarım mekanizması operasyonel olarak doğrulanmadan bu değer etkinleştirilmez. Kapı kapalıyken kullanıcı sorusu OpenAI'ye gönderilmez.

### Satış bilgisi ve araştırma katmanı

`variant-content/v2`, Aşama 1 karar şemasını değiştirmeden satışta sorulan motor hacmi, tork, çekiş, boyut, yükleme, taşıma, çekme, batarya ve şarj alanlarını projekte eder. Soru çözücü Türkçe karakterleri ve gündelik eş anlamlıları deterministik olarak normalize eder; somut değer ilk mesajda verilir.

Katalog dışındaki editoryal araştırma ayrı reviewed-knowledge katmanındadır. Her kayıt market/model yılı/varyant kapsamı, erişim tarihi ve public-safe kaynak bağlantısı taşır. Türkiye exact varyantını kanıtlamayan resmî yabancı-pazar veya model-ailesi verisi yalnız `FAMILY_LEVEL` olarak yayınlanır ve kesin sahiplik diliyle kullanılamaz. Kullanıcı deneyimleri ancak lisans/izin, moderasyon, örneklem ve kişisel veri kontrolleri tamamlanınca ayrı bir artifact'a girebilir; açık web veya forum metni katalog gerçeği yapılmaz.

## Aşama 3 sınırı

Üç CTA `phase3-intent/v1` decision-neutral handoff hazırlar: `REQUEST_QUOTE`, `REQUEST_TEST_DRIVE`, `REQUEST_DEALER_CONTACT`. Payload aynı conversation, decision, offer, exact variant ve catalog release'e bağlıdır; `executionAuthorized: false` taşır ve 30 dakika geçerlidir. Endpoint yalnız hazırlık durumunu public response'a döndürür. Database write, CRM/bayi mesajı, rezervasyon, teklif veya başka bir dış yan etki yoktur.

## Evidence/content blocker ve disposition

- Exact renk authority'si yok: renk iddiası yok, eksiklik görünür.
- Resmî/lisanslı exact video authority'si yok: video alanı gizli.
- Birçok varyantta yalnız temsilî ya da hiç görsel olabilir: kapsam etiketi görünür veya galeri boş.
- `HIGH` confidence/provenance eşiğini geçmeyen teknik ve donanım kayıtları: public claim yok.
- Aşama 2 artifact'ları bugün aktif catalog'dan deterministik materialize edilir. Ayrı immutable disk release'ine precompute/cutover, içerik editoryal onayı gerektiğinde aynı şema ve checksum kapısıyla eklenebilir; runtime hiçbir durumda daha geniş claim üretmez.

## Test ve işletim kapısı

Testler; valid/replay handoff, tamper/expiry/cross-conversation, Aşama 1 state immutability, exact variant/release binding, claim matrisi, renk/video fallback, Türkçe doğal corpus, rakip scope dönüşü ve artifact checksum'ını kapsar. Teslim kapısı scoped Vitest, TypeScript, ESLint, production build ve `git diff --check`'tir.
