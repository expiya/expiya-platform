# Expiya Cars Aşama 2 — Satış Danışmanı / Tavsiye Motoru çalışma promptu

Expiya Cars için Aşama 2 “Satış Danışmanı — Tavsiye Motoru” çalışmasını başlat ve uçtan uca tamamla.

Repository:
`/Users/serdarakgul/Projects/expiya-platform`

## Ön koşul

Aşama 1 Karar Motoru kilitlidir. Önce `docs/cars-v3-phase-1-lock.md` belgesini ve mevcut V3.8 karar/reveal sözleşmesini incele. Aşama 1'in router, preference ledger, deterministic catalog adapter, filtering, ranking, persona scoring, affordability, recommendation terms, offer governance, persistence, idempotency ve state-token davranışını değiştirme. Mevcut unrelated worktree değişikliklerini koru. Açık talep olmadan commit, push, deployment veya production database write yapma.

## Nihai hedef

Kullanıcı Aşama 1'de gösterilen bir araç kartında “Bu kararı beğendim, aracı daha yakından tanımak istiyorum” eylemini seçtiğinde exact variant kimliğine bağlı, önceden hazırlanmış zengin bir varyant tanıtım sayfasına geçsin. Bu sayfada çalışan ayrı ve versioned Tavsiye Motoru yalnız seçilmiş aracı ayrıntılı biçimde tanıtsın; aracın kullanıcının Aşama 1'de ifade ettiği ihtiyaçlarını nasıl karşılayabileceğini kanıta dayalı, sıcak ve ikna edici bir satış danışmanı diliyle anlatsın.

## Yetki sınırı

- Tavsiye Motoru yeni araç seçmez, aday elemez, ranking yapmaz ve Aşama 1 kararını sessizce değiştirmez.
- Yalnız reveal edilmiş exact variant ve kullanıcı tarafından onaylanmış Aşama 1 karar bağlamıyla çalışır.
- Katalog, fiyat, donanım, renk, görsel, video ve teknik özellik iddiaları yalnız yetkili evidence kaynaklarından gelir.
- Exact variant için doğrulanmamış bilgi kesin sahiplik diliyle sunulmaz.
- Family-level veya temsilî içerik açıkça etiketlenir.
- Conflict, unknown, silent absence ve pilot dışı evidence `NO_CLAIM` üretir.
- Model katalog gerçeği üretmez; yalnız doğrulanmış structured facts'i açıklar ve doğal satış anlatımına dönüştürür.
- Kullanıcının söylemediği yaşam biçimi, kişi sayısı, kullanım amacı veya bütçe uydurulmaz.
- Aşama 1 conversation bilgisi yalnız aynı conversation/decision fingerprint kapsamında kullanılabilir; konuşmalar arasında sızıntı olamaz.

## Giriş sözleşmesi

En az şu alanları taşıyan imzalı ve doğrulanabilir bir handoff tasarla:

- conversationId
- decision fingerprint
- recommendation offer/reveal kimliği
- selected exactVariantId
- catalog release/fingerprint
- kullanıcı tarafından onaylanmış güçlü ihtiyaç ve tercihlerin public-safe özeti
- persona eşleşme özeti (teknik puanları public response'a sızdırmadan)
- recommendation terms kabul sürümü ve zamanı

Stale, değiştirilmiş, başka konuşmaya ait veya reveal edilmemiş handoff fail-closed olmalı.

## Varyant sayfası

Her exact variant için şu bölümleri tasarla:

1. Güçlü hero alanı, doğrulanmış/temsilî görsel etiketi ve araç kimliği.
2. “Neden sana uygun?” bölümü: yalnız sohbet geçmişindeki onaylı ihtiyaçlarla araç gerçeklerini eşleştir.
3. Günlük kullanım örnekleri: kullanıcının bağlamı varsa onu kullan; yoksa açıkça genel örnek ver.
4. Doğrulanmış teknik özellikler ve bunların günlük karşılıkları.
5. Donanım ve konfor özellikleri; exact doğrulama durumları görünür olsun.
6. Renk seçenekleri; yalnız doğrulanmış market/model-year/variant kapsamıyla.
7. Zengin görsel galeri; exact, representative ve approximate ayrımı görünür olsun.
8. Resmî veya lisanslı tanıtım videosu; yoksa alanı gizle, video uydurma.
9. Fiyat alanı; mevcut fiyat authority ve tahmin/verified politikalarına uy.
10. Aşama 3 eylemleri: “Teklif almak istiyorum”, “Test sürüşü randevusu istiyorum”, “Satıcı bayi ile görüşmek istiyorum”. Bunlar bu çalışmada yalnız güvenli handoff/CTA olabilir; gerçek dış işlem veya production write yapma.

## Kart geçişi

Aşama 1 kartına ayrı ve açık bir CTA ekle:

“Bu kararı beğendim, aracı daha yakından tanımak istiyorum.”

Mevcut kartı yalnız ayrıntı görüntüleme amacıyla tıklanabilir tut; Aşama 2'ye geçiş bilinçli kullanıcı eylemi olmalı. CTA idempotent olmalı ve aynı decision/reveal kimliğine bağlanmalı.

## Tavsiye sohbeti

- Her zaman Türkçe konuşur.
- Seçilmiş araç hakkında doğrudan sorulara önce somut yanıt verir.
- Yanıtları kısa mesaj parçalarına bölebilir; uzun duvar metin üretmez.
- İkna edici, sıcak, uzman ve baskısızdır; manipülasyon, sahte kıtlık ve yapay aciliyet kullanmaz.
- Kullanıcının Aşama 1 ihtiyaçlarından örnek verir; aynı bağlamı her mesajda tekrarlamaz.
- Doğrulanmış güçlü yönleri kullanıcı faydasına çevirir; zayıf yönleri veya belirsizlikleri saklamaz.
- Rakip araç veya yeni karar sorusu gelirse kapsamı açıklar ve gerekirse Aşama 1'e geri dönüş sunar.
- Araçta bulunmayan ya da doğrulanmamış özelliği varmış gibi anlatmaz.

## İçerik hazırlama

Önceden hazırlanmış variant-page content artifact sözleşmesi oluştur. Artifact'lar versioned, checksum'lı, catalog-release pinned ve deterministik olarak yeniden üretilebilir olsun. LLM çıktısını doğrudan production gerçeği yapma; source/evidence/provenance doğrulaması ve fail-closed yayın kapısı kur. Public response'a internal assertion ID, checksum, audit payload veya governance alanlarını sızdırma.

## Testler

- Geçerli reveal + beğeni CTA handoff'u.
- Reveal edilmemiş/stale/tampered/cross-conversation handoff reddi.
- Aşama 2'nin Aşama 1 karar fingerprint'i ve ledger'ını değiştirmemesi.
- Exact variant kimlik ve catalog release uyumu.
- Verified/family-level/unknown/conflict claim matrisi.
- Görsel, renk ve video provenance/fallback davranışı.
- Kullanıcı ihtiyacı ile araç gerçeği eşleştirmesinde hallucination yasağı.
- Conversation isolation, replay ve idempotency.
- Türkçe-only ve doğal satış danışmanı corpus'u.
- Aşama 3 CTA'larının gerçek dış yan etki üretmemesi.
- Responsive ve erişilebilir UI; kart, galeri, video ve sohbet için keyboard davranışı.
- Scoped Vitest, TypeScript, ESLint, production build ve `git diff --check`.

## Teslimat

- Aşama 2 mimari ve authority-boundary belgesi.
- İmzalı handoff sözleşmesi.
- Versioned variant content artifact şeması ve doğrulayıcısı.
- Varyant advertorial sayfası.
- Satış Danışmanı / Tavsiye Motoru.
- Kart içi bilinçli geçiş CTA'sı.
- Aşama 3 için decision-neutral CTA handoff sınırı.
- Test corpus'u ve doğrulama sonuçları.
- Kalan evidence/content blocker'ları ve fail-closed disposition.
