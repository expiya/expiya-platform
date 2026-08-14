# Marketplace kaynak denetimi — 14 Ağustos 2026

Bu denetim katalog adayı keşfi içindir. `RESEARCH_ONLY` kayıtlar production kataloğuna, fiyat motoruna veya kullanıcı arayüzüne otomatik olarak yayınlanmaz.

## İlk pilot

| Kaynak | Yüzey | Durum | Sonuç |
|---|---|---|---|
| Otomerkezi | `https://www.otomerkezi.net/ikinci-el` | `RESEARCH_ONLY` | 15 gözlem, 13 benzersiz aday |
| Otoshops | `https://www.otoshops.com/tum-arabalar` | `RESEARCH_ONLY` | 14 gözlem, 12 benzersiz aday |

Her iki kaynakta yalnızca marka, model, model yılı, yakıt, şanzıman ve görünür olduğunda motor/donanım adı tutuldu. İlan kimliği, tekil ilan URL'si, fiyat, kilometre, satıcı, şehir, açıklama, görsel ve kişisel veri alınmadı.

## Otomatik toplama yapılmayacak kaynaklar

- Arabam.com: arama, filtre ve teknik detay yolları robots politikasında engelli; sözleşmeli feed gerekir.
- Otobid: Sahibinden hizmeti; yazılı feed izni gerekir.
- Otomol: genel koşullar depolama, işleme ve ticari yeniden kullanımı yazılı izne bağlıyor.
- Otokoç 2. El: kullanım koşulları crawler, screen scraping, kopyalama ve başka veritabanında depolamayı açıkça yasaklıyor.
- AutoScout24 Türkiye: AI bot grupları robots politikasında engelli; partner erişimi gerekir.
- Otokoç İhale: kimlik doğrulamalı ihale stoğu yalnızca sözleşmeli erişimle kullanılmalı.

## İnceleme/partner adayı kaynaklar

Ford İkinci El, DOD, Borusan Next, VavaCars Türkiye, Carvak, Otoplus, Arabalar.com.tr, Letgo, Spoticar Türkiye, Otosor, Çetaş, TEB Arval AutoSelect, renew Türkiye, OneClickDrive, İnallar 2, ikinciyeni, Neziroğlu ve Tan Oto 2 için robots erişimi kaydedildi; kullanım koşulları ve yeniden kullanım hakkı tamamlanmadan otomatik production bağlantısı kurulmayacak.

Makine tarafından okunabilir ayrıntılı kayıt `data/research/marketplaceSources.ts` dosyasındadır.
