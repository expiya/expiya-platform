# Expiya Cars — Manufacturer Image Usage Policy v0.1

## Amaç

Üretici ve distribütör web sitelerindeki araç görsellerini Expiya Cars kartlarında güvenli, kaynak gösteren ve geri alınabilir biçimde kullanmak. Bu politika, görsel lisansını teknik araç bilgisi otoritesinden ayrı tutar.

## Temel kural

Bir görselin üreticinin web sitesinde yayınlanması, Expiya’nın onu indirip yeniden yayınlama hakkı vermez. Önizleme de bir kamuya açık lisans yerine geçmez.

## Kullanım seviyeleri

### Seviye A — Açıkça izinli medya

Üretici/distribütör media kit’i veya yazılı lisans açıkça üçüncü taraf ticari web/app tanıtımına izin veriyorsa:

- Görsel Expiya kartında gösterilebilir.
- Lisans belgesi, kapsamı, geçerlilik tarihi, kaynak URL’si ve dosya SHA-256’sı kaydedilir.
- Üretici attribution’ı ve gerekli disclaimer aynen uygulanır.
- Marka/logo kullanım şartları ayrıca kontrol edilir.

### Seviye B — Şartları önizlemeye izin veren kaynak

Kaynak sitenin kullanım şartları, embed/thumbnail/remote preview kullanımına açıkça izin veriyorsa:

- Görsel yalnız uzaktan önizleme olarak gösterilir.
- Expiya görseli kalıcı olarak indirip CDN’inde barındırmaz.
- Kaynak sayfasına tıklanabilir bağlantı verilir.
- `referrer` ve hotlink kuralları ihlal edilmez.
- Kaynak kaldırılırsa veya izin geri çekilirse önizleme derhal kapatılır.

### Seviye C — İzin belirsiz veya yok

- Yalnız üretici/distribütör sayfasına metin bağlantısı gösterilir.
- Görsel kopyalanmaz, proxy edilmez, cache’lenmez ve ekran görüntüsü kullanılmaz.
- Kartta nötr placeholder kullanılabilir.

## Teknik uygulama kuralları

- Görsel kullanım kaydı `sourceUrl`, `sourceType`, `licenseState`, `permissionReference`, `observedAt`, `attributionText`, `assetSha256` ve `revocationStatus` alanlarını taşımalıdır.
- Lisans belirsizliği `UNVERIFIED_MEDIA_RIGHTS` olarak işaretlenir; teknik araç fact’lerini doğrulamaz.
- Remote preview için kalıcı binary depolama yapılmaz; tarayıcı cache’i veya sağlayıcının CDN’i dışında Expiya cache’i kullanılmaz.
- Sağlayıcı `X-Frame-Options`, `Content-Security-Policy`, robots veya kullanım şartlarıyla embed/hotlink’i engelliyorsa önizleme kullanılmaz.
- Görsel URL’si geçici ise (ör. imzalı/7 günlük URL), süre dolduğunda otomatik olarak gizlenir; yeniden edinim lisans koşullarına bağlıdır.
- Lisans/izin kanıtı olmadan görsel production release’ine alınmaz.

## Kullanıcıya gösterim

Önizlemenin yanında kısa bir kaynak etiketi ve üretici/distribütör bağlantısı bulunur. Görsel, aracın exact trim veya donanımının kanıtı olarak sunulmaz; teknik fact authority’si değildir.

## Geri alma ve ihlal bildirimi

Hak sahibi bildirimi, lisansın sona ermesi veya kaynak kaldırılması halinde görsel derhal pasifleştirilir. Olay append-only provenance kaydına işlenir; asset dosyası silinmeden önce hukuki saklama gereksinimi kontrol edilir.

## Karar motoru sınırı

Görsel varlığı, kalitesi veya lisans durumu aday filtreleme, sıralama, soru üretimi, uygunluk veya offer-order kararlarını değiştiremez. Görseller yalnız bilgilendirme/facet katmanında kullanılabilir.

## Onay kapısı

Her üretici görseli için production kullanımı öncesi şu dört koşul birlikte sağlanmalıdır:

1. Kaynak ve hak sahibi belirli.
2. Kullanım seviyesi A veya B için yazılı/açık izin kanıtı mevcut.
3. Attribution ve geri alma yolu kayıtlı.
4. Asset kapsamı ve checksum immutable provenance kaydına bağlı.

Bu koşullardan biri yoksa Seviye C uygulanır.

## 2026-09 global kaynak değerlendirmesi

Üretici basın galerilerinin kamuya açık olması tek başına Seviye A veya B kanıtı değildir. Aşağıdaki kaynaklar bu nedenle **Seviye C / UNVERIFIED_MEDIA_RIGHTS** olarak sınıflandırılmıştır: Audi A6 fotoğraf albümü, BMW Global PressClub M4 arşivi, Toyota Global/USA RAV4 galerisi, Ferrari 12Cilindri içerikleri, Renault Global Media Kangoo arşivi ve Stellantis Media Opel Vivaro sayfası. Bu kaynaklar yalnızca araştırma ve kaynak bağlantısı için kullanılabilir; görsel indirme, kalıcı barındırma, proxy veya hotlink production’da etkinleştirilmez.

Bir kaynak sayfası açıkça üçüncü taraf ticari embed/thumbnail kullanımına izin verirse, izin metni ve URL’si `permissionReference` alanına kaydedilmeden Seviye B’ye yükseltilemez. Her model-body önizlemesi temsilîdir; exact varyant, donanım, renk veya Türkiye pazarı kanıtı değildir.
