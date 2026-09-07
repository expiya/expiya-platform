# Sekreter günlük yaşam örnekleri — kapsam raporu

Production source lineage: `bc86ee5d37540e94236303bb8a0704f46509fd52` (`codex/xpy-root-stage1-ux-revision-01`).

Aktif `departmentRegistry` salt okunur tüketildi. Yeni veya paralel bir kategori registry’si oluşturulmadı. Production sözleşmesi 6 aktif bölüm, 54 aktif kategori ve kategori başına 3 örnekle toplam 162 placeholder cümlesi üretir.

## Önce / sonra envanteri

| Kategori | Önce | Sonra (temsilî) |
|---|---|---|
| Akıllı telefon | `Akıllı telefon arıyorum` | Çocuğumun hareketli anlarını uzaktan da net çekebileceğim bir akıllı telefon arıyorum. |
| Dizüstü bilgisayar | `Dizüstü bilgisayar arıyorum` | Her gün yanımda taşıyabileceğim, aynı anda çok sayıda ofis uygulamasında zorlanmayacak bir dizüstü bilgisayar arıyorum. |
| Buzdolabı | `Buzdolabı arıyorum` | Haftalık alışverişimizi düzenli saklayabileceğimiz, dar mutfakta kapısı rahat açılan bir buzdolabı arıyorum. |
| Bebek arabası | `Bebek arabası arıyorum` | Merdivende sık taşıyacağım ve tek elle kolayca katlayabileceğim bir bebek arabası arıyorum. |
| Akülü matkap | `Akülü matkap arıyorum` | Evde duvara raf asarken zorlanmayacağım, bataryası diğer aletlerimle uyumlu bir akülü matkap arıyorum. |

Önceki üretim `publicLabelTr + " arıyorum"` biçiminde kategori başına tek, yüzeysel örnek veriyordu (54 örnek). Yeni veri her cümlede `PURPOSE`, `CONTEXT`, `OUTCOME` işaretlerinden en az ikisini zorunlu tutar; mutlak iddiaları, tek başına jenerik ürün taleplerini, tekrarları, raw kategori ID’lerini ve aktif registry dışındaki örnekleri fail-closed reddeder.

## Aktif kategori kapsamı

| Bölüm | Aktif kategori | Örnek |
|---|---|---:|
| El aletleri | Akülü matkap | 3 |
| Otomobil | Sıfır otomobil | 3 |
| Ev ürünleri | Çamaşır makinesi | 3 |
| Ev ürünleri | Buzdolabı | 3 |
| Ev ürünleri | Bulaşık makinesi | 3 |
| Ev ürünleri | Kurutma makinesi | 3 |
| Ev ürünleri | Kablolu torbasız süpürge | 3 |
| Ev ürünleri | Robot süpürge | 3 |
| Ev ürünleri | Derin dondurucu | 3 |
| Ev ürünleri | Ankastre fırın | 3 |
| Ev ürünleri | Solo fırınlı ocak | 3 |
| Ev ürünleri | Ankastre ocak | 3 |
| Ev ürünleri | Davlumbaz ve aspiratör | 3 |
| Ev ürünleri | Tezgâh üstü mikrodalga fırın | 3 |
| Ev ürünleri | Ankastre mikrodalga fırın | 3 |
| Ev ürünleri | Hava temizleyici | 3 |
| Ev ürünleri | Tam otomatik espresso makinesi | 3 |
| Ev ürünleri | Manuel espresso makinesi | 3 |
| Ev ürünleri | Filtre kahve makinesi | 3 |
| Ev ürünleri | Türk kahvesi makinesi | 3 |
| Ev ürünleri | Airfryer / sıcak hava fritözü | 3 |
| Ev ürünleri | Blender | 3 |
| Ev ürünleri | Mutfak robotu | 3 |
| Ev ürünleri | Elektrikli termosifon | 3 |
| Ev ürünleri | Elektrikli şofben | 3 |
| Ev ürünleri | Ev tipi split klima | 3 |
| Elektronik | Akıllı telefon | 3 |
| Elektronik | Dizüstü bilgisayar | 3 |
| Elektronik | Tablet | 3 |
| Elektronik | Monitör | 3 |
| Elektronik | Televizyon | 3 |
| Elektronik | E-kitap okuyucu | 3 |
| Elektronik | Kulaklık | 3 |
| Elektronik | Taşınabilir hoparlör | 3 |
| Elektronik | Soundbar | 3 |
| Elektronik | Dijital fotoğraf makinesi | 3 |
| Elektronik | Projektör | 3 |
| Elektronik | Oyun konsolu | 3 |
| Elektronik | Wi-Fi router ve mesh sistemi | 3 |
| Elektronik | Ağ depolama (NAS) | 3 |
| Elektronik | Harici depolama | 3 |
| Elektronik | Yazıcı | 3 |
| Elektronik | Web kamera | 3 |
| Elektronik | Masaüstü bilgisayar hoparlörü | 3 |
| Elektronik | Akıllı saat | 3 |
| Elektronik | Aktivite bilekliği | 3 |
| Elektronik | Ev güvenlik kamerası | 3 |
| Elektronik | Görüntülü kapı zili | 3 |
| Elektronik | Akıllı ev merkezi | 3 |
| Elektronik | Kesintisiz güç kaynağı | 3 |
| Bebek & Çocuk | Bebek arabası | 3 |
| Mobilite | Elektrikli scooter | 3 |
| Mobilite | Elektrikli bisiklet | 3 |
| Mobilite | Bisiklet | 3 |

## Contract sonucu

- Aktif registry’ye örneksiz kategori eklemek `SECRETARY_EXAMPLES_MISSING` ile build sırasında durur.
- Örnek kataloğunda inactive kategori bırakmak `INACTIVE_CATEGORY_EXAMPLES` ile durur; public rotasyona girmez.
- Stable key ve public cümle tekrarları reddedilir.
- Rotation bölüm ve kategori sırasını deterministik biçimde interleave eder.
- 162/162 doğal cümle mevcut Sekreter classifier’ında governed kategoriye doğrudan yönlenir.

