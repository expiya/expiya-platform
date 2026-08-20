# Equipment Public Explanation Pilot — Owner Review

## Karar özeti

Bu paket yalnız iki açılmış araç kartı için, kullanıcı açıkça donanım açıklaması istediğinde kullanılabilecek dar bir authority adayıdır. Global Equipment authority değişmez ve bu candidate aktive edilmemiştir.

## Pilot araçlar

- BYD Dolphin Comfort MY2025 (`6cb56615-37ef-51a8-9202-a73e59d4e14b`): 30 confirmed included özellik, 3 verified not available özellik.
- Nissan Qashqai Platinum Premium e-POWER MY2026 (`90e65f94-6fdb-5eea-ad7e-0b4e18435427`): 32 confirmed included özellik, verified negative yok.

BYD için verified negative özellikler: panoramik cam tavan, havalandırmalı ön koltuklar ve kablosuz telefon şarjı. Bunlar yalnız kullanıcı exact açılmış BYD kartı hakkında doğrudan soru sorarsa “sunulmadığı doğrulandı” yanıtına adaydır; proaktif satış metninde kullanılamaz.

## Kullanılabilecek örnek yapı

> Bu araçta kör nokta izleme standart olarak bulunuyor. Kör nokta izleme, şerit değiştirirken aynalarda görülmesi zor araçlar için ek uyarı sağlayabilir. Ayna ve omuz kontrolünün yerini almaz; motosiklet veya hızlı yaklaşan araçları her zaman algılamayabilir.

Post-reveal teklif metni:

> Bu aracın günlük kullanımda işine yarayabilecek donanımlarını anlatmamı ister misin?

Bu teklif yeni recommendation consent, pazarlama izni veya KVKK rızası değildir; ranking ya da yeni offer üretmez. Kullanıcı reddederse tekrar sunulmaz.

## Yasak anlatımlar

- “Güvenliği garanti eder.”
- “Kazayı önler.”
- “Hata yapmaz.”
- “Kesin korur.”
- “Sınıfının en iyisi.”
- “Rakiplerinden üstündür.”
- “Stoktaki her araçta vardır.”
- Evidence’ın desteklemediği teknik ayrıntı, raw kaynak metni veya locator.

## No-claim davranışı

- Optional: somut araç ve konfigürasyon teyidi gerekir.
- Package-dependent: paket kapsamı teyit edilmelidir.
- Association-only: listelenmiş olabilir; provision doğrulanmalıdır.
- Legacy provision unresolved: standart olduğu söylenemez.
- Unknown/silent absence: “yok” deneme; doğrulanamadığını söyle.
- Conflict: açıklama verme, ayrıca teyit iste.
- Pilot dışı araç: public pilot authority yok.

## Comparison güvenliği

Bir araçta confirmed, diğerinde unknown ise “birinde var, diğerinde yok” denmez. Kontrollü ifade: “İlk araç için özellik doğrulandı; ikinci araç için elimizde yeterli doğrulama yok.” Feature sayısı kalite puanı veya ranking sinyali değildir.

## Hukuki sınırlar

REC-2026.08-v1.1 kart kabul kapısı değişmez. Pilot açıklama recommendation terms’in yerine geçmez; garanti veya güvenlik taahhüdü değildir; stok/opsiyon kapsamını genişletmez; yeni pazarlama izni veya KVKK rızası oluşturmaz.

## Rollback / deactivation

Candidate henüz active pointer’a bağlı değildir. Aktivasyon yapılırsa ayrı owner approval ve activation kaydı gerekir. Acil durdurma; dar authority selector’ını devre dışı bırakıp global `SHADOW_AND_EXPLANATION_DISABLED` ve Daily-Life `EXPLANATION_ONLY` durumuna dönmekten ibarettir. Evidence, catalog ve Daily-Life release’leri değiştirilmez.
