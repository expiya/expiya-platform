# Expiya İkinci El — EİDS/İETTS ve ilan uyum sözleşmesi v0.1

Durum: Taslak; hukuk müşaviri onayı gerekir. Production aktivasyonu kapalıdır. EİDS başvurusu 2 Eylül 2026 tarihinde `eids@ticaret.gov.tr` adresine gönderilmiştir. Gerçek credential, gerçek servis çağrısı ve gerçek ilan yayını bu paketin kapsamı dışındadır.

## Ayrı fail-closed kapılar

1. İETTS işletme/şube kapısı üyelik kaydı, yenileme ve yayın uygunluğundan önce yetki belgesi numarası, tenant/şube eşleşmesi, sorgu zamanı, geçerlilik ve yenileme durumunu doğrular. Yetki belgesi yoksa, doğrulanamıyorsa, süresi dolmuşsa veya şube eşleşmiyorsa uygunluk verilmez.
2. EİDS araç yetkisi kapısı her inventory/listing için referans, sorgu zamanı, yetkilendirilen tenant/şube, başlangıç-bitiş ve sonucu tutar. İlk yayından hemen önce yeniden doğrulama gerekir. Olumsuz, süresi dolmuş, geri alınmış veya eşleşmeyen yetki ilanı fail-closed kaldırma planına alır.

Sentetik demoda yalnız `IETTS_RESERVED_SYNTHETIC_RESPONSE` ve `EIDS_RESERVED_SYNTHETIC_RESPONSE` kaynakları kabul edilir. Marka, ticari ad ve model yılı EİDS yanıtından geldikten sonra değiştirilemez authoritative alanlardır. Public yüzey yalnız kontrollü “EİDS araç yetkisi doğrulandı” metnini gösterebilir; resmî logo kullanım belgesi gelmeden logo kullanılamaz.

## Yönetmelik m.20–22 alan sözleşmesi

Yayın öncesinde yetki belgesi numarası, işletme adı/unvanı, marka, ticari ad, cins, tip, model yılı, donanım/aksesuar, şasi numarasının son altı hanesi, plaka, yakıt, kilometre, satış fiyatı, boyalı/değişen parçalar, hasar kaydı niteliği, rehin/haciz/takyidat durumu, devam eden üretici/ithalatçı garantisinin kalan süre/km bilgisi ve EİDS doğrulama durumu zorunludur. Eksik, çelişkili veya stale kayıt yayınlanmaz.

Tam VIN, şifreli/fingerprint tanımlayıcılar ve gereksiz belgeler public değildir. Plakanın mevzuat gereği görünürlüğü kontrollü projection alanıdır; erişim/log redaction ve nihai hukuk görüşü ayrıca tamamlanacaktır.

## EİDS API dokümanı geldiğinde mapping

Provider şeması; `authorizationReference`, `checkedAt`, `authorizedTenant`, `authorizedBranch`, `validFrom`, `validUntil`, `result`, `brand`, `tradeName`, `modelYear` alanlarına açıkça eşlenecek. Result/revocation kodları kapalı enum'a çevrilecek; imza, replay/idempotency, timeout ve availability davranışları staging contract testleriyle doğrulanacak. Bilinmeyen değer, timeout veya şema sapması yayın izni değil fail-closed sonuç üretir.

Dayanak: Motorlu Kara Taşıtlarının Ticareti Hakkında Yönetmelik m.20–22; Ticaret Bakanlığının EİDS taşıt yetki doğrulaması duyuruları. Bu belge gerçek hukuk görüşü değildir.
