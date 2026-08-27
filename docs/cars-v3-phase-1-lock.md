# Expiya Cars — Aşama 1 Karar Motoru Kilidi

Durum: `LOCKED`

Kilit tarihi: 2026-08-27

Pilot: `v3.8`

## Kilitlenen ürün sınırı

Aşama 1 yalnız kullanıcı niyetini ve tercihlerini toplar, doğrulanmış karar girdilerini deterministik katalog adapter'ına aktarır, adayları filtreler/sıralar ve kullanıcı onayından sonra en fazla üç araç kartı gösterir.

- Varsayılan bütçe modu `NEEDS_ONLY`'dir.
- Bütçe yalnız kullanıcı görünür toggle'ı açtığında ve kesin üst sınırı girdiğinde `BUDGET_AS_DECISION_FILTER` olarak aday elemede kullanılır.
- Bütçe sıralama, donanım gerçeği, persona skoru veya offer sırası üretmez.
- Doğrulanmamış donanım bilgisi gizli filtre veya sıralama sinyali değildir; yalnız kart açıklaması/uyarısı olabilir.
- Persona katkısı bounded soft-ranking sinyalidir ve en fazla `0.75` puandır.
- Araç kartı ancak güncel öneri koşulları açıkça kabul edildikten sonra gösterilir.
- Kart kimliği, görsel durumu ve temsilî görsel açıklaması ayrıntı sayfasına taşınır.
- Conversation state, revision, replay, state-token ve görüşme izolasyonu korunur.

## Değişiklik politikası

Aşama 1 dosyalarında bundan sonra yalnız şu gerekçelerle değişiklik yapılabilir:

1. Güvenlik veya veri sızıntısı düzeltmesi.
2. Katalog/evidence sözleşmesi uyumluluğu.
3. Kanıtlanmış regresyon ve beraberindeki deterministik test.
4. Aşama 2 entegrasyonu için geriye uyumlu, decision-neutral bir çıkış sözleşmesi.

Yeni satış anlatımı, advertorial içerik, araç tanıtım sohbeti, teklif veya bayi aksiyonları Aşama 1'e eklenmez.

## Aşama 2 sınırı

Aşama 2 yalnız reveal edilmiş ve kullanıcı tarafından “Bu kararı beğendim” eylemiyle seçilmiş exact variant üzerinde çalışır. Aşama 2, Aşama 1 ledger'ını, aday listesini, ranking'i veya karar fingerprint'ini değiştiremez. Yeni araç seçimi gerektiğinde kullanıcı Aşama 1'e geri yönlendirilir.
