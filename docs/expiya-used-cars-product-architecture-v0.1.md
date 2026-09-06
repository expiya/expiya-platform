# Expiya İkinci El — Ürün, Tasarım ve Mimari Başlangıç Belgesi

Durum: `PROPOSAL / IMPLEMENTATION BLOCKED PENDING OWNER APPROVAL`  
Sürüm: `0.1`  
Tarih: `2026-08-31`  
Kapsam: Türkiye'deki doğrulanmış kurumsal ikinci el satıcılar ve bu stoklarla ihtiyaç/risk eşleştirmesi  
Kapsam dışı: production yayını, gerçek üyelik/ödeme, gerçek ilan/lead, scraping, production veri tabanı yazımı

## 0. Yönetici özeti ve karar ilkeleri

Expiya İkinci El, Expiya Cars'ın yeni araç kataloğuna eklenen bir `condition=USED` filtresi değildir. Üç ayrı otoriteyi birleştiren, ancak birbirine karıştırmayan yeni bir ticari platformdur:

1. Kullanıcının ihtiyacı ve ikinci el risk toleransı.
2. Sürümlü Türkiye tarihsel otomotiv taxonomy/index'i.
3. Doğrulanmış kurumsal satıcıların somut ve zaman duyarlı stokları.

Önerilen mimari, kullanıcı yüzeyini Expiya Cars marka ailesinde; satıcı ve moderasyon yüzeylerini ayrı authentication, authorization ve veri erişim sınırlarında tutar. Sıfır araç Motor V3, preference ledger, katalog, exact varyant, satış danışmanı, 349 TL rapor, handoff ve analitik sözleşmeleri değişmeden kalır. İkinci el hiçbir zaman sıfır araç `TurkeyVehicleVariant` veya `PriceObservation` kaydını somut stok aracı gibi kullanmaz.

Temel ürün vaadi: “İhtiyaçlarına ve kabul edebileceğin belirsizlik düzeyine göre uygun model ailelerini, yaş/km aralığını ve mevcut kurumsal stokları gerekçeleriyle göster; beyanı doğrulanmış bilgi gibi sunma; güvenli sonraki adımı açıkla.”

Kesin ürün ilkeleri:

- Karar sonucu satın alınamaz; üyelik ve organik sıralama bağımsızdır.
- Sponsorlu içerik ayrı yüzey, ayrı etiket ve ayrı analitik sözleşmesi taşır.
- Kurumsal üyelik güvenilir araç garantisi değildir.
- Satıcı beyanı doğrulama değildir.
- Eksiklik ve çelişki, sessizce skor düşürülmek yerine kullanıcıya açıklanır.
- Sonuç “al/alma” değil, uyum, belirsizlik ve kontrol planıdır.
- Firma kapanır, ödeme/sözleşme/doğrulama kapısı düşer veya tenant askıya alınırsa tüm stok fail-closed yayından kalkar.

## 1. İnceleme bulguları ve korunacak sistem sınırı

### 1.1 Canlı ürün

31 Ağustos 2026 kontrolünde `https://www.expiya.com/ikinciel` 404 dönmektedir. Mevcut ana sayfa; beyaz/taş tonları, geniş siyah tipografi, düşük doygunluklu araç görseli, yeşil aksan ve “ihtiyacı anla → araçları karşılaştır → kararı netleştir” anlatısını kullanır. B2C ikinci el yüzeyi bu dili sürdürmeli; klasik ilan portalı gibi yoğun filtre duvarıyla açılmamalıdır.

### 1.2 Repository

Mevcut sıfır araç sistemi şu otorite ve sözleşmelere sahiptir ve korunacaktır:

- `features/decision/v3/`: Motor V3, yeni araç product scope'u ve ledger.
- `features/vehicle-data/`: sürümlü/kaynaklı yeni araç kataloğu ve exact varyant kanıtları.
- `features/sales-advisor/` ve `features/sales-request/`: exact varyant sonrası güvenli, imzalı ve yürütme yetkisiz handoff.
- `app/cars/variant/[exactVariantId]`: exact yeni araç ayrıntısı.
- `app/cars/sales-request/[intent]`: teklif/test sürüşü/bayi iletişimi.
- `app/api/product-events`: mevcut ürün analitiği.
- Yeni araç fiyatlarında görünürlük, provenance ve realization-safe sınırları.

Mevcut `PriceObservation.condition = USED` alanı yeni ürünün stok omurgası olarak kullanılmamalıdır. Bu alan gözlem/kanıt amaçlı kalabilir; somut ikinci el araç kimliği, tenant sahipliği, VIN, yayın yaşam döngüsü ve moderasyon için yeterli değildir.

### 1.3 Mimari karar kayıtları

| ID | Karar | Gerekçe |
|---|---|---|
| UC-ADR-001 | İkinci el ayrı bounded context | Yeni araç varyantı ile tekil fiziksel araç farklı yaşam döngülerine sahiptir. |
| UC-ADR-002 | B2C aynı marka ailesi, B2B ayrı uygulama/güvenlik alanı | Kullanıcı devamlılığı korunurken tenant ve operasyon riski ayrılır. |
| UC-ADR-003 | Taxonomy kimliği ile stok kimliği ayrıdır | Canonical model bilgisi fiziksel aracın doğruluğunu garanti etmez. |
| UC-ADR-004 | Kanıt atomik alan bazındadır | Bir belge veya üyelik tüm ilanı doğrulanmış yapamaz. |
| UC-ADR-005 | Organik eşleştirme ve ticari görünürlük ayrıdır | Tarafsızlık ve denetlenebilirlik için. |
| UC-ADR-006 | Pilot tek bölge/az satıcı/az stokla fail-closed açılır | Moderasyon, veri kalitesi ve lead operasyonu ölçülmeden ulusal ölçek risklidir. |

## 2. Güncellenmiş bilgi mimarisi

### 2.1 Platform haritası

```text
expiya.com
├── /                         Platform giriş (gelecek)
├── /cars                     Expiya Cars — sıfır araç
│   ├── /catalog
│   ├── /variant/:id
│   └── /ikinciel             Expiya İkinci El — B2C
│       ├── /                 ihtiyaç/risk görüşmesi
│       ├── /sonuclar/:id     model/yaş/km + stok eşleşmeleri
│       ├── /arac/:listingId  somut araç ve güven dosyası
│       ├── /karsilastir      stok karşılaştırması
│       └── /talep/:intent    güvenli handoff
└── /ikinciel                 geçiş dönemi canonical; sonra kalıcı redirect

partner.expiya.com
├── /login
├── /onboarding
├── /dashboard
├── /inventory
├── /leads
├── /team
├── /branches
├── /membership
└── /audit

ops.expiya.internal (public DNS zorunlu değil)
├── /dealer-verification
├── /taxonomy
├── /moderation
├── /fraud
└── /audit
```

### 2.2 B2C navigasyon

Ana navigasyon: `Sıfır Araç` · `İkinci El` · `Nasıl çalışır?` · `Güven yaklaşımı`  
İkinci el alt navigasyon: `İhtiyacımı anlat` · `Stokları keşfet` · `Karşılaştır` · `Kontrol rehberi`

“Stokları keşfet” erişilebilir olmalı, fakat ürünün birincil CTA'sı sohbet/rehberli karar olmalıdır. Filtreler sonuç daraltma aracı; ürünün karar otoritesi değildir.

## 3. Kullanıcı, satıcı ve moderatör yolculukları

### 3.1 Kullanıcı

1. İkinci el bağlamı ve güven sınırı anlatılır.
2. Toplam bütçe, peşinat ve finansman üst sınırı ayrı alınır.
3. Kullanım amacı, yıllık km, şehir/uzun yol oranı, gövde/yakıt/şanzıman tercihleri öğrenilir.
4. Model yılı, km, hasar/boya/değişen/ağır hasar, bakım, garanti ve beklenmedik masraf toleransı öğrenilir.
5. Klasik araç ilgisinde günlük kullanım/koleksiyon ayrımı açılır.
6. Önce model aileleri ve makul yaş/km koridoru gerekçelendirilir.
7. Yalnız yayınlanabilir, güncel ve tenant kapıları açık stoklar eşleştirilir.
8. Her araçta alan bazlı kaynak/güven durumu, eksikler ve çelişkiler gösterilir.
9. Kullanıcı stokları karşılaştırır; reklam organik sonuçtan ayrı görünür.
10. Satıcı görüşmesi, geçmiş kontrolü, belge incelemesi ve bağımsız ekspertiz kontrol listesi sunulur.
11. Açık rıza/hukuki sebep ve kanal seçimiyle minimum veri içeren lead oluşturulur.

### 3.2 Kurumsal satıcı

1. Firma hesabı talebi → tüzel kişi ve yetkili kişi ön kontrolü.
2. Vergi/ticaret sicili bilgileri ve belgeler → doğrulama kuyruğu.
3. Sözleşme → paket seçimi → ödeme durumu; hiçbiri tek başına yayın yetkisi vermez.
4. Firma sahibi MFA kurar, şube ve kullanıcıları tanımlar.
5. Taxonomy'den araç kimliği seçilir; yoksa canonical isim değil “yeni kimlik talebi” açılır.
6. Fiziksel araç bilgisi, fotoğraf ve belgeler taslak olarak girilir.
7. Veri kalite/duplicate/güvenlik ön kontrolleri çalışır.
8. Yayına gönderilir; moderasyon onayı ve bütün kapılar sonrası yayınlanır.
9. Fiyat, km ve stok durumu değişiklikleri sürümlenir; önemli değişiklik yeniden moderasyon gerektirebilir.
10. Lead yalnız yetkili şube/rol tarafından, amaçla sınırlı görülür ve işlenir.

### 3.3 Expiya moderatörü

1. Risk ve SLA öncelikli kuyruk görür.
2. Firma, taxonomy talebi, ilan, belge veya çelişki dosyasını ayrı görev olarak açar.
3. Alan bazında onay/reddet/düzeltme iste/uzman incelemesine yönlendir kararı verir.
4. Karar gerekçe kodu ve değiştirilemez audit olayı üretir.
5. Yüksek riskli iddiaları (“matching numbers”, “orijinal”, ağır hasarsız vb.) kanıt yoksa public doğrulanmış hale getiremez.
6. Fraud sinyalinde ilanı/tenant'ı askıya alır; stoklar fail-closed olur.
7. İtirazı ilk kararı veren kişiden bağımsız ikinci göz inceler.

## 4. B2C ve B2B ekran envanteri

### 4.1 B2C

| Ekran | MVP | Ana amaç |
|---|---:|---|
| İkinci El landing | Evet | Değer önerisi, kurumsal stok ve güven sınırı |
| İhtiyaç/risk görüşmesi | Evet | Yapılandırılmış ledger + doğal dil |
| Ara özet/onay | Evet | Kullanıcının yanlış anlaşılan tercihleri düzeltmesi |
| Model/yaş/km önerileri | Evet | Stoktan bağımsız uygunluk katmanı |
| Stok eşleşme sonuçları | Evet | Organik araç eşleşmeleri ve açıklama |
| Somut araç detayı | Evet | Kanıt, eksik, güncellik, satıcı/şube, CTA |
| Karşılaştırma | Evet | Uyum + risk + belirsizlik; sadece özellik tablosu değil |
| Güvenli sonraki adımlar | Evet | Kontrol ve ekspertiz checklist'i |
| Lead/izin formu | Evet | Teklif, test sürüşü, iletişim |
| Favoriler/kayıtlı arama | Sonraki | Hesaplı deneyim |
| Fiyat geçmişi/gözlem | Sonraki | Yalnız kaynaklı ve yanıltıcı olmayan görünüm |

### 4.2 Partner paneli

| Ekran | MVP | Ana amaç |
|---|---:|---|
| Giriş/MFA/kurtarma | Evet | Kurumsal güvenli erişim |
| Firma onboarding durumu | Evet | Doğrulama/sözleşme/ödeme/moderasyon kapıları |
| Dashboard | Evet | Stok sağlığı, bekleyen görevler, lead özeti |
| Firma ve şubeler | Evet | Tenant yapısı |
| Ekip ve roller | Evet | En az ayrıcalık |
| Stok listesi | Evet | Durum, kalite, güncellik, fiyat |
| Araç ekleme sihirbazı | Evet | Taxonomy + fiziksel araç + kanıt |
| Araç düzenleme/geçmiş | Evet | Sürümlü değişiklik |
| Medya ve belgeler | Evet | Güvenli yükleme ve görünürlük sınıfı |
| Moderasyon sonucu | Evet | Gerekçe ve düzeltme |
| Lead inbox/detay | Evet | Şube/rol bağlı takip |
| Üyelik/fatura | Evet | Paket ve durum; yayın yetkisinden ayrı |
| Audit geçmişi | Evet | Kim, neyi, ne zaman yaptı |
| Analitik | Sınırlı | Stok eşleşmesi ve lead kalitesi |
| Feed/API yönetimi | Sonraki | Entegrasyon, mapping ve hata kuyruğu |

### 4.3 Expiya operasyon

Firma doğrulama, taxonomy editörü, kimlik talepleri, ilan moderasyonu, fraud vakaları, belge erişim kaydı, üyelik/yayın kapıları, itiraz ve tenant kapatma ekranları ayrı admin rolleriyle sunulur.

## 5. Mobil kullanıcı wireframe'leri

### 5.1 Landing ve başlangıç

```text
┌──────────────────────────────┐
│ EXPIYA  CARS       ☰         │
│ İKİNCİ EL                     │
│                              │
│ Sana uygun ikinci el aracı   │
│ belirsizlikleriyle birlikte  │
│ bul.                         │
│                              │
│ Yalnız doğrulanmış kurumsal  │
│ satıcı stokları              │
│                              │
│ [ İhtiyacımı anlat  → ]      │
│ [ Stokları keşfet      ]     │
│                              │
│ 01 İhtiyacını anlar          │
│ 02 Risk sınırını görünür kılar│
│ 03 Somut stokla eşleştirir   │
└──────────────────────────────┘
```

### 5.2 Görüşme

```text
┌──────────────────────────────┐
│ ← İkinci el görüşmesi  3/7   │
│ Bütçe ve kullanım             │
│ ━━━━━━━━━━━░░░░░░░░          │
│                              │
│ Beklenmedik masraf konusunda │
│ ne kadar esneksin?           │
│                              │
│ ○ En düşük belirsizlik       │
│ ○ Kontrollü risk alabilirim  │
│ ○ Fiyat avantajı için esneğim│
│                              │
│ [ Neden soruyoruz? ]         │
│                              │
│ [ Devam et ]                 │
└──────────────────────────────┘
```

### 5.3 Sonuç ve araç detayı

```text
┌──────────────────────────────┐
│ Sana uygun koridor            │
│ C-SUV · 2021–2024 · ≤70 bin km│
│ Neden: aile + uzun yol + ... │
│ [Tercihlerimi düzenle]        │
│                              │
│ 8 kurumsal stok eşleşti      │
│ ┌──────────────────────────┐ │
│ │ [foto] 2022 Model X      │ │
│ │ 48.200 km · 1.450.000 TL │ │
│ │ Uyum: güçlü              │ │
│ │ Güven: 6 doğrulanmış     │ │
│ │        3 satıcı beyanı   │ │
│ │ Eksik: bakım faturaları  │ │
│ │ [Aracı ve kanıtı gör]    │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘

┌──────────────────────────────┐
│ ← Somut araç                 │
│ [fotoğraf galerisi]          │
│ 2022 ... · 48.200 km         │
│ 1.450.000 TL                 │
│ Kurumsal Satıcı · Şube       │
│                              │
│ Sana uyumu                   │
│ ✓ bütçe  ✓ kullanım          │
│ △ km hedefinin üst sınırında │
│                              │
│ Bilginin kaynağı             │
│ ✓ Expiya doğruladı           │
│ ◇ Satıcı beyanı              │
│ ! Belge var, içerik doğrulanmadı│
│ ? Eksik / çelişkili          │
│                              │
│ [Kontrol planını aç]         │
│ [Satıcıyla görüş]            │
└──────────────────────────────┘
```

## 6. Masaüstü satıcı paneli wireframe'leri

### 6.1 Dashboard

```text
┌───────────────┬────────────────────────────────────────────────────────┐
│ EXPIYA PARTNER│ Firma: Örnek Otomotiv        Şube ▾      Kullanıcı ▾  │
├───────────────┼────────────────────────────────────────────────────────┤
│ Genel bakış   │ YAYIN KAPILARI                                        │
│ Stok          │ Firma ✓  Sözleşme ✓  Ödeme ✓  Moderasyon ✓           │
│ Talepler      │                                                        │
│ Şubeler       │ 42 aktif  6 taslak  3 incelemede  2 güncelliği geçti │
│ Ekip          │                                                        │
│ Üyelik        │ [Stok sağlığı] [Eşleşme görünümü] [Lead kalitesi]     │
│ Analitik      │                                                        │
│ Audit         │ YAPILACAKLAR                                          │
│               │ • 3 moderasyon düzeltmesi                             │
│               │ • 2 aracın stok teyidi bugün                          │
│               │ • 4 yeni kullanıcı talebi                             │
└───────────────┴────────────────────────────────────────────────────────┘
```

### 6.2 Araç oluşturma

```text
┌───────────────┬────────────────────────────────────────────────────────┐
│ Stok          │ Yeni araç          Taslak otomatik kaydedildi          │
│               │ 1 Kimlik ─ 2 Araç ─ 3 Durum ─ 4 Medya ─ 5 İnceleme   │
│               │                                                        │
│               │ Yönetilen araç kimliği                                │
│               │ Marka [Seç] Model [Seç] Nesil [Seç]                  │
│               │ Motor [Seç] Şanzıman [Seç] Donanım [Seç]             │
│               │ Kimlik bulunamadı mı? [Yeni kimlik talebi oluştur]   │
│               │                                                        │
│               │ VIN [••••••••••••••1234]  Public gösterilmez         │
│               │ Plaka [•• ••• 12]          Public varsayılan kapalı  │
│               │                                                        │
│               │ [Taslağı kaydet]                         [Devam →]    │
└───────────────┴────────────────────────────────────────────────────────┘
```

### 6.3 Moderasyon sonucu

```text
┌───────────────┬────────────────────────────────────────────────────────┐
│ Stok > #A124  │ YAYINLANAMAZ · düzeltme gerekli                       │
│               │                                                        │
│               │ Kritik: VIN aynı tenant içinde başka araçta mevcut   │
│               │ Belge: ekspertiz tarihi ile km beyanı çelişkili      │
│               │ Fotoğraf: 2 görselde plaka maskelenemedi              │
│               │                                                        │
│               │ [Alanları düzelt] [Kanıt ekle] [Karara itiraz et]     │
│               │                                                        │
│               │ Karar geçmişi: kim · zaman · gerekçe kodu             │
└───────────────┴────────────────────────────────────────────────────────┘
```

## 7. Kurumsal üyelik ve onboarding

Onboarding bir state machine olmalıdır:

```text
APPLICATION
→ IDENTITY_REVIEW
→ LEGAL_ENTITY_VERIFIED
→ CONTRACT_PENDING
→ CONTRACT_ACTIVE
→ PAYMENT_PENDING
→ MEMBERSHIP_ACTIVE
→ OPERATIONAL_REVIEW
→ PUBLISHING_ELIGIBLE
```

Her kapı ayrı karar, kanıt, aktör ve zaman damgası taşır. `MEMBERSHIP_ACTIVE`, `PUBLISHING_ELIGIBLE` anlamına gelmez. Risk/fraud/ihlal halinde `SUSPENDED` bütün durumların önüne geçer.

Gerekli hazırlık alanları: ticaret unvanı, vergi/MERSİS veya sicil bilgisi, faaliyet adresi, yetkili kişi ve temsil yetkisi, KEP/kurumsal iletişim kanalı, şubeler, fatura bilgisi, KVKK rolü/iletişimi, sözleşme sürümü, banka/ödeme eşleşmesi, yaptırım/fraud iç kontrol notları.

İlk firma sahibi davetinin süresi sınırlı, tek kullanımlık olması; MFA tamamlanmadan ekip veya stok yönetilememesi önerilir.

## 8. Stok oluşturma ve düzenleme akışı

1. Şube ve sahiplik bağlamı seçilir.
2. Taxonomy resolver ile canonical kimlik seçilir.
3. VIN normalize edilir, şifreli/sınırlı erişimli saklanır; tenant içi ve izinli platform-geneli duplicate fingerprint kontrolü yapılır.
4. Plaka varsayılan public kapalıdır; arama/fraud amacı için ayrı korunmuş değer kullanılır.
5. Model yılı, ilk tescil, km, renk, fiyat, stok no, sahiplik türü girilir.
6. Hasar/boya/değişen, ağır hasar, bakım, garanti, ekspertiz alanları yapılandırılmış olarak girilir. “Bilmiyorum/belge yok” geçerli ve görünür bir durumdur.
7. Fotoğraf/belge yüklenir; quarantine → MIME/size → malware → EXIF/PII → görsel kalite/duplicate → erişim sınıfı hattından geçer.
8. Açıklama allowlist/uzunluk/DLP ve yasak kesin iddia kontrollerinden geçer.
9. Yayın önizlemesi, alan bazlı provenance etiketleriyle satıcıya gösterilir.
10. Otomatik kalite ve fraud kontrolleri sonrası moderasyona gönderilir.
11. Onaylanan revision immutable olur; sonraki değişiklik yeni revision üretir.

Önemli değişiklikler: taxonomy kimliği, VIN, km düşüşü, fiyat anomalisi, hasar/ağır hasar, şube/sahiplik, kritik belge değişimi. Bunlar yayını bekletebilir veya yeniden incelemeye alabilir. Fiyat ve stok durumu hızlı yol kullanabilir, ancak geçmişi kaybolmaz.

Durumlar: `DRAFT`, `READY_FOR_REVIEW`, `IN_REVIEW`, `CHANGES_REQUESTED`, `APPROVED`, `PUBLISHED`, `RESERVED`, `SOLD`, `WITHDRAWN`, `EXPIRED`, `SUSPENDED`, `REJECTED`. Public sonuç yalnız `PUBLISHED` + tüm kapılar açık + freshness geçerli olduğunda üretilebilir.

## 9. Türkiye tarihsel otomotiv taxonomy/index mimarisi

### 9.1 Kimlik hiyerarşisi

```text
Make
└── ModelLine
    └── Generation
        ├── BodyDerivative
        └── PowertrainDerivative
            └── MarketVariant / Trim
                └── ModelYearApplicability
```

Her düğüm stable, anlam taşımayan ID kullanır; adlar değişebilir, ID değişmez. Alias ayrı kayıt olmalı; canonical adın üzerine yazılmamalıdır.

### 9.2 Çekirdek varlıklar

- `taxonomy_release`: semver, yayın zamanı, kapsam, checksum, durum.
- `taxonomy_entity`: stable ID, entity type, canonical name, lifecycle.
- `taxonomy_relation`: parent/child, applicability, tarih aralığı.
- `taxonomy_name`: dil, pazar, yazım, alias türü, geçerlilik.
- `taxonomy_specification`: motor, hacim, güç, tork, yakıt, şanzıman, çekiş, gövde, kapı/koltuk.
- `taxonomy_market_presence`: TR, satış/ithalat türü, üretim/model yılı aralığı.
- `taxonomy_evidence`: kaynak, erişim/yayın tarihi, lisans/izin, alıntı sınırı, hash.
- `taxonomy_assertion`: alan/değer, güven, çatışma grubu, moderasyon.
- `taxonomy_supersession`: merge/split/correction ilişkisi.
- `taxonomy_change_event`: actor, before/after, reason, release.
- `taxonomy_identity_request`: satıcı talebi, önerilen eşleşmeler, kanıtlar, SLA.

### 9.3 Kaynak politikası

Öncelik: resmî üretici arşivi → tip onay/homologasyon kaynağı → üretici kullanım kılavuzu → resmî parça kataloğu → lisanslı veri sağlayıcı → izinli güvenilir ikincil kaynak. Robots/erişim izni, kullanım şartı, lisans ve veri alanı kayıt altına alınır. İzinsiz scraping veya ilan görseli kopyalama kapsam dışıdır.

### 9.4 Kademeli kapsama

| Dalga | Kapsam | Yayın iddiası |
|---|---|---|
| T0 | İlk pilot marka/model/nesiller | Yalnız listelenen kapsam |
| T1 | Yaygın modern binek araçlar | Pilot şehir stok ihtiyacı odaklı |
| T2 | Son 20–25 yıl | Marka/model/nesil kapsaması ölçülür |
| T3 | Hafif ticari/ticari | Ayrı kullanım ve vergi semantiği |
| T4 | Düşük adetli/ithal | Kaynak güveni görünür |
| T5 | Klasikler | Uzmanlık ve özel iddia modeli |
| T6 | Nadir/özel üretim | Vaka bazlı moderasyon |

Kapsama metriği “dünyadaki araçların yüzdesi” değil; hedef pilot stokların canonical eşleşme oranı, belirsiz kimlik oranı ve kaynak kalitesidir.

## 10. Klasik otomobil veri modeli

`ClassicVehicleProfile`, normal stok kaydına eklenen yaş bayrağı değil, ayrı bir aggregate component olmalıdır:

- kesin/tahmini üretim yılı ve dönem aralığı,
- şasi/kasa serisi ve üretim numarası (public maskeli),
- orijinallik sınıflandırması: `UNASSESSED`, `DECLARED`, `DOCUMENTED`, `EXPERT_REVIEWED`,
- restorasyon durumu, tarihleri, yapan kurum/uzman ve kapsam,
- matching numbers beyanı ve motor/şanzıman kimlik kanıtı,
- motor/şanzıman/gövde değişikliği,
- dönem doğruluğu ve sonradan eklenen parçalar,
- sahiplik/koleksiyon geçmişi,
- arşiv belgeleri ve provenance,
- ithalat, gümrük ve tescil durumu,
- parça bulunabilirliği için kaynaklı değerlendirme,
- kullanım, saklama ve koruma koşulları,
- uzman incelemesi gereksinimleri.

Public iddia matrisi:

| İddia | Satıcı beyanıyla gösterim | Doğrulanmış etiketi için asgari kapı |
|---|---|---|
| Orijinal | “Satıcı beyanı” | Uzman raporu + alan bazlı kanıt |
| Matching numbers | “Satıcı beyanı” | İlgili numaralar, fabrika/arşiv referansı, uzman incelemesi |
| Koleksiyonluk | Pazarlama iddiası olarak kısıtlı | Nesnel tanım ve uzman kurul politikası |
| Restorasyonlu | Beyan + tarih | Fatura/fotoğraf/iş emri kanıtı |

## 11. İkinci el karar motoru ve stok eşleştirme sınırı

Yeni motor, Motor V3'ü çağıran bir “used mode” olmamalıdır. Önerilen boru hattı:

```text
UsedCarPreferenceLedger
→ Need & Risk Policy
→ Taxonomy Family Eligibility
→ Age/Mileage Corridor
→ Published Inventory Retrieval
→ Hard Safety/Policy Gates
→ Fit Scoring
→ Evidence Completeness Projection
→ Diversification
→ Governed Explanation
```

### 11.1 Ayrı skor boyutları

- `needFit`: kullanım, gövde, enerji, şanzıman, servis erişimi.
- `budgetFit`: toplam fiyat ve açıkça verilen finansman sınırı.
- `riskFit`: yaş/km/hasar/bakım/garanti/beklenmedik masraf toleransı.
- `evidenceReadiness`: kritik alanların kanıt/güncellik durumu.
- `operationalAvailability`: yayın, stok teyidi, şube erişimi.

Tek opak skor yerine bu boyutlar gösterilir. `evidenceReadiness`, aracın mekanik kalitesi değildir. Düşük kanıt, kötü araç demek değildir; belirsizlik demektir.

Hard gate örnekleri: bütçe üst sınırı (kullanıcı açıkça hard yaptıysa), ağır hasar kesin dışlama, model yılı alt sınırı, km üst sınırı, firma/yayın kapısı, süresi geçmiş stok. Soft tercih örnekleri: renk, yeniden satış önceliği, boya toleransı.

Model ailesi önerisi stok varlığından bağımsız açıklanmalıdır. Stok azlığı modeli “uygunsuz” yapmamalı; “uygun model, şu an eşleşen stok yok” sonucu mümkündür. Ticari paket, `needFit` veya organik sıra girdisi olamaz.

## 12. Kanıt ve güven seviyesi sistemi

### 12.1 Zorunlu durum sözlüğü

```text
EXPIYA_VERIFIED
DEALER_DECLARED
USER_DECLARED
DOCUMENT_UPLOADED_UNREVIEWED
UNVERIFIABLE
MISSING
CONFLICTING
STALE
```

Her somut araç alanı `value + assertionStatus + sourceRef + assertedBy + observedAt + validUntil + reviewer + limitations` taşımalıdır. Tek ilan seviyesinde “doğrulandı” rozeti yasaktır.

### 12.2 Public sunum

- Yeşil onay: yalnız bağımsız kaynak/uygun doğrulama prosedürü.
- Nötr elmas: kurumsal satıcı beyanı.
- Belge ikonu: belge yüklendi, içerik doğrulanmadı.
- Sarı uyarı: eksik, süresi geçmiş veya doğrulanamayan.
- Kırmızı çelişki: birbiriyle uyuşmayan kayıtlar; kritikse yayın bloke edilir.

“Güven seviyesi” üç ayrı kavramı karıştırmamalıdır: kaynak otoritesi, doğrulama durumu ve güncellik. Kullanıcıya kısa özet; ayrıntıda alan bazlı dosya sunulur.

## 13. Moderasyon sistemi

Moderasyon görev türleri: firma, kullanıcı/rol, taxonomy talebi, listing, önemli revision, belge, klasik iddia, fraud, kullanıcı şikâyeti, itiraz.

Kararlar: `APPROVE`, `APPROVE_WITH_LIMITATIONS`, `REQUEST_CHANGES`, `REJECT`, `ESCALATE_EXPERT`, `SUSPEND`. Her karar reason code, serbest olmayan ana gerekçe, opsiyonel iç not, aktör, tarih ve hedef revision taşır.

Önerilen otomasyon sınırı:

- Otomatik sistem zararlı dosyayı, duplicate'ı, bozuk fiyat/km değerini veya zorunlu eksik alanı bloke edebilir.
- Otomatik sistem satıcı beyanını doğrulanmış yapamaz.
- Yüksek riskli ret ve tenant askıya alma insan incelemesi/itiraz kanalı taşır.
- Moderatör belgeye eriştiğinde audit olayı oluşur; toplu indirme varsayılan kapalıdır.

SLA risk bazlıdır: yayın blokajı ve fraud önce; kozmetik içerik sonra. Dört göz ilkesi firma doğrulama, klasik yüksek değer iddiaları, fraud kaldırma ve sistem yöneticisi işlemlerinde uygulanır.

## 14. Ücretli üyelik paket alternatifleri

### 14.1 Paket modeli

| Paket | Uygun segment | Ölçüm ekseni |
|---|---|---|
| Başlangıç | Tek şube küçük galeri | aktif stok kotası + temel lead |
| Büyüme | Çok kullanıcılı/şubeli firma | şube + aktif stok + ekip |
| Kurumsal | Filo/kiralama/ulusal zincir | yüksek stok, SSO, feed/API, SLA |
| Analitik eklentisi | Tüm paketler | eşleşme içgörüsü, veri dışa aktarımı kontrollü |
| Entegrasyon eklentisi | ERP/DMS kullananlar | feed/API hacmi ve destek |
| Kurumsal vitrin | Marka sayfası | açıkça ticari yüzey; organik sıradan ayrı |

Lead kotası yalnız operasyon/ücretlendirme olabilir; lead kalitesi veya organik görünürlük satın alınamaz. “Tamamlanmış aksiyon” faturalaması uyuşmazlık/fraud teşviki yarattığı için pilotta önerilmez.

### 14.2 Tarafsızlık duvarı

- Organik ranking servisi paket/ödeme/sponsorluk alanlarını okuyamaz.
- Sponsorlu servis ayrı endpoint ve UI slotu kullanır.
- Sponsorlu kart “Sponsorlu” etiketi ve “neden görüyorum?” açıklaması taşır.
- Organik/sponsorlu impression ve conversion event'leri ayrı şemadır.
- Ticari ekip ranking ağırlığını değiştiremez; değişiklikler versioned owner approval gerektirir.

## 15. Türkiye pazara çıkış ve B2B onboarding planı

### 15.1 Segmentler ve pilot

Öncelik segmentleri:

1. Süreçleri dijital, stok kalitesi yüksek yetkili satıcı ikinci el birimleri.
2. Çok şubeli kurumsal ikinci el zincirleri.
3. Filo/kiralama şirketlerinin belgeli çıkış stokları.
4. Yerel itibarı ve operasyon ekibi doğrulanabilen galeriler.

Pilot önerisi: İstanbul Avrupa + Anadolu yakası tek operasyon bölgesi olarak değil, en fazla iki kontrollü şehir bölgesi; alternatif olarak İstanbul + Ankara. 5–8 firma, firma başına 25–100 aktif stok, toplam 250–500 araç. İlk dalgada 10–15 yaygın model ailesi/taxonomy yeterlilik kapısı.

Pilot satıcı kriterleri: tüzel kişi doğrulanabilirliği, en az 12 aylık operasyon izi, kurumsal alan adı/iletişim, atanmış stok sorumlusu, 48 saat stok/fiyat teyidi, minimum fotoğraf standardı, yapılandırılmış hasar/bakım beyanı, lead SLA'sı, eğitim ve audit kabulü.

### 15.2 Erken erişim teklifi

- 60–90 günlük ücret indirimli/ücretsiz kontrollü pilot; açık son tarih.
- Ücretsiz dönem sıralama avantajı vermez.
- Onboarding ve veri temizlik desteği.
- Demo tenant ve sentetik stoklarla panel eğitimi.
- CSV/XLSX şablonu, mapping önizlemesi, dry-run ve satır bazlı hata raporu.
- Büyük firma için idempotent SFTP/API/feed; önce sandbox.

### 15.3 Başarı ölçütleri

Satıcı: taxonomy eşleşme ≥ %95, kritik alan tamlığı ≥ %90, stok teyit SLA ≥ %95, moderasyon ilk geçiş oranı, lead ilk yanıt medyanı, satıldı durumuna geçiş gecikmesi, şikâyet oranı.

Kullanıcı/lead: nitelikli lead oranı, kullanıcı tarafından onaylanan eşleşme gerekçesi, satıcıya ulaşma başarısı, ekspertiz/sonraki adım niyeti, yanlış/eksik bilgi bildirimi, spam oranı. Satış dönüşümü tek başarı metriği olmamalıdır; agresif yönlendirmeyi teşvik eder.

## 16. Güvenlik tehdit modeli

| Tehdit | Kontrol | Fail-closed davranış |
|---|---|---|
| Tenantlar arası veri sızıntısı | `tenant_id` zorunlu, DB RLS, servis policy, object key namespace, analitik tenant projection testleri | İstek reddi ve alarm |
| Rol yükseltme | Merkezi RBAC/ABAC, davet sınırı, MFA, kritik işlem step-up | Yetki yok |
| Oturum ele geçirme | kısa erişim, rotate refresh, cihaz/oturum iptali, secure/httpOnly/sameSite cookie | Oturum iptali |
| CSRF | same-origin, CSRF token, mutasyonda Origin/Host kontrolü | Mutasyon reddi |
| Credential stuffing | rate limit, MFA, risk sinyali, güvenli kurtarma | challenge/lock |
| Zararlı dosya | quarantine, AV/CDR, MIME magic byte, boyut/sayfa limiti | Public/işleyici erişimi yok |
| EXIF/PII sızıntısı | metadata strip, plaka/yüz/konum kontrolü, public rendition | Orijinal private kalır |
| VIN/plaka ifşası | field encryption, maskeleme, log/DLP, export allowlist | Public projection yok |
| Duplicate/fake listing | normalized VIN/plaka fingerprint, perceptual image hash, fiyat/km anomaly, belge tekrar kontrolü | İncelemeye al |
| Import replay/bozulma | idempotency key, source row ID, checksum, dry-run, atomic batch | Çift kayıt yok/rollback |
| Yetkisiz export | rol/amaç, satır limiti, watermark, async approval, audit | Export reddi |
| Log PII | yapılandırılmış allowlist log, body/query redaction | Event minimum metadata |
| Firma kapanması | tenant lifecycle event + yayın projection gate | Tüm stok yayından kalkar |
| Insider/moderatör kötüye kullanımı | least privilege, dört göz, immutable audit, belge view log | Erişim iptali/olay |
| Ranking manipülasyonu | paket alanı ranking şemasında yok, versioned policy, offline audit | Release bloke |

RBAC başlangıç matrisi:

- Firma sahibi: tenant ayarları, owner atama, üyelik; kritik işlem MFA.
- Firma yöneticisi: şube/ekip/stok/lead; owner devri yok.
- Şube yöneticisi: yalnız bağlı şubeler.
- Stok editörü: stok yazma; lead/üyelik yok.
- Satış danışmanı: atanmış lead; stok publish yetkisi yok.
- Rapor görüntüleyici: agregalar; PII ve export varsayılan yok.
- Expiya moderatörü: tenant dışı görev bazlı içerik; ödeme/sistem ayarı yok.
- Sistem yöneticisi: platform operasyonu; belge/lead PII varsayılan erişim yok.

## 17. KVKK, sözleşme ve veri işleme ihtiyaçları

Bu bölüm hukuki görüş değildir; production öncesi hukuk danışmanı onayı gerektiren ihtiyaç envanteridir.

### 17.1 Roller ve belgeler

- Expiya, satıcı ve teknoloji sağlayıcılarının veri sorumlusu/veri işleyen rolleri amaç bazında belirlenmeli.
- Kurumsal üyelik sözleşmesi, yayın/moderasyon politikası, kabul edilebilir kullanım, veri doğruluğu yükümlülüğü, SLA ve fesih etkisi.
- Kullanıcı aydınlatması; karar görüşmesi, analitik, lead aktarımı, güvenlik ve saklama amaçları ayrı.
- Lead aktarımında KVKK m.5/m.8 hukuki sebebi ve alıcı kategorisi; pazarlama izni ayrı ve boş varsayılan.
- Ticari elektronik ileti için 6563/İYS süreçleri.
- Yurt dışı aktarım için hosting, e-posta/SMS, malware tarama, analitik, support ve log tedarikçileri dahil m.9 mekanizması.
- Satıcı belgelerinde üçüncü kişi verileri için minimizasyon, maskeleme ve yükleme talimatı.

### 17.2 Veri yaşam döngüsü

Envanter: firma yetkilisi, ekip, VIN/plaka, belge, fotoğraf metadata'sı, lead, iletişim izni, audit, fraud sinyali, fatura. Her kategori için amaç, hukuki sebep, erişim, alıcı, ülke, retention, silme/anonimleştirme ve legal hold yazılmalıdır.

DSAR akışı tenant verisi ve kullanıcı verisi için ayrı kimlik doğrulama taşır. Firma kapanınca public stok hemen kalkar; finansal/hukuki kayıt retention'a göre ayrıştırılır; yedeklerden silme takvimi belgelenir. Audit log “sonsuz saklama” varsayamaz.

### 17.3 Özel dikkat

- VIN ve plaka public değildir; kişisel veri niteliği vaka/bağlama göre hukukça değerlendirilir ve yine yüksek koruma sınıfında tutulur.
- Ekspertiz/ruhsat/fatura görselleri gereksiz kimlik, adres, imza ve üçüncü kişi verisi içerebilir; otomatik + manuel redaksiyon gerekir.
- Ham görüşme transcript'i satıcıya aktarılmaz. Kullanıcı kontrollü, allowlist alanlı kısa özet ayrı izin/temel ile aktarılır.
- Profil çıkarma/otomatik karar anlatısı, itiraz/düzeltme ve insanla temas seçenekleri değerlendirilmelidir.

## 18. MVP, pilot ve sonraki sürümler

### MVP — kapalı sentetik ortam

- Bounded context sözleşmeleri ve threat-model testleri.
- İlk taxonomy release ve identity request iş akışı.
- Sentetik tenant/onboarding/RBAC/MFA.
- Manuel stok girişi, taslak, moderasyon, revision ve publish projection.
- Medya quarantine hattı prototipi.
- Used preference ledger, model koridoru ve açıklanabilir stok eşleştirme.
- Alan bazlı güven etiketleri.
- Sentetik lead handoff; dış aktarım kapalı.
- B2C ve partner responsive prototipleri.

### Pilot — kontrollü gerçek operasyon

- 5–8 doğrulanmış firma, 250–500 araç, sınırlı şehir/model.
- Hukuk ve sözleşme kapıları tamamlanmış gerçek onboarding.
- CSV bulk import + idempotency/dry-run.
- Gerçek moderasyon ve fraud operasyonu.
- Kullanıcı lead'i yalnız güvenli portal üzerinden; satıcı SLA takibi.
- Paket/fatura görünümü; ödeme tahsilatı ancak ayrıca onaylanırsa.
- Haftalık kalite, güvenlik, yanlış bilgi ve tarafsızlık gözden geçirmesi.

### Sonraki

- DMS/API/feed, SSO/SCIM, gelişmiş analitik.
- Daha geniş taxonomy dalgaları ve klasik uzman ağı.
- Favori/kayıtlı arama ve kontrollü bildirimler.
- Kaynaklı fiyat geçmişi/valuation; lisans ve metodoloji kapısından sonra.
- Bağımsız ekspertiz partner entegrasyonu; çıkar çatışması görünürlüğüyle.

## 19. Sıfır araç sistemiyle olası çakışmalar

| Çakışma | Risk | Önlem |
|---|---|---|
| `condition=USED` mevcut tipi | Gözlemi stok sanma | Ayrı `UsedVehicleUnit` aggregate; adapter yok |
| Motor V3 ledger | Kullanıcı tercihlerinin semantiğini bozma | `UsedCarPreferenceLedger`; cross-import deny rule |
| Exact variant ID | Taxonomy ile fiziksel aracı karıştırma | `taxonomyVariantId` ve `inventoryUnitId` ayrı |
| Yeni araç teklif akışı | Kullanılmış stok lead'ine yetkisiz reuse | `used-lead-handoff/v1`, ayrı recipient ve consent |
| 349 TL rapor | Ücretli ürün vaadinin bulanması | İlk aşamada ayrı SKU/rapor yok; açık ürün kararı gerekir |
| Katalog tarayıcısı | İkinci el stok filtresi gibi görünme | Ayrı IA ve route; ortak yalnız tasarım tokenları |
| Analitik event'leri | Funnel ve tenant PII karışması | `used_b2c.*`, `used_partner.*`, `used_ops.*` namespace |
| Satış danışmanı | Sıfır araç kanıtını kullanılmış araca taşıma | Ayrı advisor policy ve evidence projection |
| Sentry/log | VIN/plaka/lead sızıntısı | used-car redaction sözleşmesi ve fixtures |

Önerilen import kuralı: `features/used-cars/**`, `features/decision/v3/**` ve yeni araç `features/vehicle-data/**` içinden runtime aggregate import edemez. Yalnız açık, nötr primitives veya sürümlü read-only taxonomy bridge kullanılabilir.

## 20. URL ve uygulama ayrıştırma planı

### Aşama A — mevcut marka altında

- `www.expiya.com/ikinciel` B2C canonical.
- Kod içinde gelecekte taşınabilir `usedCarsBasePath` ve URL builder.
- B2C aynı Next uygulamasında route group olabilir; veri/context yine ayrıdır.
- `partner.expiya.com` ayrı deployment, ayrı auth client/audience/cookie scope/CSP.
- Ops yüzeyi internete doğrudan açık genel panel olmamalı; ayrı workforce identity ve network kontrolleri.

### Aşama B — platform dönüşümü

- Yeni canonical: `https://www.expiya.com/cars/ikinciel`.
- Eski `/ikinciel` → query allowlist ile `308`; VIN, token veya PII query taşınmaz.
- Sitemap, canonical, analytics attribution ve consent scope güncellenir.
- Redirect zinciri tek adım ve süresiz korunur.

Cookie önerisi: B2C session `www.expiya.com` host-only; partner session `partner.expiya.com` host-only. `.expiya.com` geniş cookie kullanılmaz. Auth issuer/audience ve CSRF origin allowlist'leri ayrıdır.

### Uygulama seçenekleri

| Seçenek | Karar |
|---|---|
| Tek Next uygulaması, tüm yüzeyler | Reddedilen varsayılan; güvenlik ve release blast radius yüksek |
| B2C mevcut app + ayrı partner app + ayrı ops app | Önerilen |
| Tam mikroservis başlangıcı | Erken; bounded modüler monolith + ayrı DB şemalarıyla başlanabilir |

## 21. Uygulama öncesi teknik yol haritası

> Gelecek notu: WhatsApp handoff, araç başında canlı görüntülü tanıtım ve satıcı adına çalışan yapay zekâ satış/pazarlık asistanı için bounded-context ve yetki sınırları `expiya-used-cars-conversational-commerce-vision-v0.1.md` belgesinde ayrıca tanımlanmıştır. Bu vizyon MVP veya production yetkisi değildir.

### Faz 0 — karar ve sözleşmeler (şimdi)

1. Bu belgenin ürün sahibi, güvenlik, hukuk ve operasyon tarafından onayı.
2. ADR-001..006 kararları ve açık soruların kapanması.
3. Domain sözlüğü ve durum makineleri.
4. Veri sınıflandırma/retention/recipient matrisi.
5. Pilot şehir, firma, stok ve taxonomy kapsamı.

Çıkış kapısı: kodlanacak MVP kapsamı ve kabul kriterleri imzalı.

### Faz 1 — iskelet ve izolasyon

1. `features/used-cars/` paket sınırları ve import kuralları.
2. Ayrı migration/schema planı; tüm tenant tablolarda `tenant_id`, RLS testleri.
3. Identity, RBAC, MFA ve tenant lifecycle sözleşmeleri.
4. Audit event ve log redaction şeması.
5. B2C/partner/ops deployment ve secret boundary tasarımı.

Çıkış kapısı: cross-tenant negatif testleri ve sıfır araç regresyon paketi geçer.

### Faz 2 — taxonomy ve inventory

1. Sürümlü taxonomy registry ve kaynak/lisans kaydı.
2. Identity request/moderasyon.
3. Inventory aggregate, revision ve lifecycle.
4. Upload quarantine ve private/public rendition.
5. CSV dry-run/import/idempotency/duplicate.

Çıkış kapısı: sentetik uçtan uca stok oluşturma→moderasyon→publish; hiçbir gerçek ilan yok.

### Faz 3 — karar ve güven UX'i

1. Used preference ledger ve risk politikası.
2. Family/corridor ve stock matching policy.
3. Alan bazlı evidence projection.
4. B2C responsive ekranlar ve erişilebilirlik.
5. Fairness/sponsorship separation tests.

Çıkış kapısı: açıklama doğruluğu, “al/alma” yasakları, eksik/çelişkili bilgi testleri.

### Faz 4 — partner ve moderasyon

1. Onboarding gate engine.
2. Partner stok/ekip/şube/lead ekranları.
3. Moderasyon/fraud/itiraz operasyonu.
4. Paket görünümü; billing adapter kapalı.

Çıkış kapısı: tabletop fraud, tenant suspension ve firmayı kapatınca fail-closed testi.

### Faz 5 — pilot hazırlık

1. Hukuk metinleri, sözleşmeler, DPA/tedarikçi değerlendirmeleri.
2. Pentest, DPIA, incident/DSAR/backup deletion runbook.
3. Pilot satıcı eğitimi, support ve SLA.
4. Sentetik rehearsal → sınırlı gerçek veri migration dry-run.

Çıkış kapısı: ayrı owner onayı olmadan gerçek üyelik, ücret, ilan, lead veya production write açılmaz.

## 22. Önerilen kod sınırı

```text
features/used-cars/
├── taxonomy/       # canonical tarihsel index, releases, identity requests
├── dealer/         # firma/şube profili ve doğrulama
├── tenancy/        # tenant context, lifecycle, isolation policies
├── memberships/    # paket/sözleşme/ödeme kapıları; ranking dışı
├── inventory/      # fiziksel araç aggregate ve revisions
├── listing/        # public projection ve yayın lifecycle
├── evidence/       # alan bazlı assertion/provenance/freshness
├── moderation/     # görev, karar, reason code, appeal
├── matching/       # family/corridor/inventory fit
├── risk/           # kullanıcı toleransı ve güvenli açıklama
├── media/          # quarantine, scan, rendition, access policy
├── lead-handoff/   # ayrı consent/recipient/idempotency sözleşmesi
└── analytics/      # B2C/B2B/Ops ayrımı ve privacy budget
```

Paylaşıma uygun tek katman `features/automotive-knowledge` içindeki gerçekten nötr kavramlar olabilir; mevcut yeni araç davranışına çift yönlü bağımlılık eklenmemelidir. Yeni ortaklık gerekiyorsa önce sürümlü port tanımlanır, ardından iki context adapter yazar.

## 23. Onay öncesi açık ürün kararları

1. İlk pilot şehirleri: İstanbul+Ankara mı, tek şehirde iki bölge mi?
2. Pilot taxonomy model ailesi ve hedef stok adedi.
3. B2C kullanıcı hesabı MVP'de var mı, yoksa oturumsuz görüşme/lead mi?
4. Üyelik pilotta ücretli mi, süreli erken erişim mi?
5. Bağımsız ekspertiz entegrasyonu pilot kapsamı mı, yalnız yönlendirme mi?
6. Klasik araçlar pilot dışında mı; öneri T5'e bırakılmasıdır.
7. Partner uygulamasının aynı repository monorepo içinde ayrı app mi, ayrı repository mi olacağı.
8. Lead alıcısının hukuki rolü ve güvenli portal operasyon sahibi.
9. Public fiyat geçmişi/valuation tamamen sonraki sürüme bırakılacak mı?
10. Sponsorlu vitrin MVP dışında mı; öneri evet.

## 24. İlk teslim kabul kriterleri

Bu belge onaylandığında yalnız mimari yön onaylanmış sayılır. Aşağıdakiler ayrıca ve açıkça yetkilendirilmeden başlamaz:

- geniş kapsamlı kod geliştirme,
- production deployment veya production database write,
- gerçek firma/üyelik/ödeme,
- gerçek ilan yayını veya kullanıcı lead aktarımı,
- otomatik scraping veya üçüncü taraf içerik/görsel kopyalama.

Onay sonrası ilk güvenli teknik teslim; schema yazmak değil, ADR'ler + domain contracts + tenant izolasyon test planı + sıfır araç regresyon koruma paketi olmalıdır.
