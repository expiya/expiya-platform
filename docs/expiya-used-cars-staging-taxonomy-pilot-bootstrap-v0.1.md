# Expiya İkinci El — Staging taxonomy pilot bootstrap v0.1

## Pilot candidate sınırı

İlk release candidate yalnız Türkiye'de yaygın modern araçlar ve son 25 yıldaki seçili kimlikleri public-release eligible kabul eder. Hafif ticari sonraki dilime ertelenir; düşük adetli ithal, klasik ve nadir araçlar uzman kuyruğunda request-only kalır. “Eksiksiz katalog” iddiası ve sıfır araç kataloğunu stok olarak kullanma yasaktır.

Candidate hedefi ilk iki katmanda 2.000 entity'dir ancak payload, checksum ve lisans manifesti veri edinimi/hukuk onayı öncesinde oluşturulmaz.

## Veri ve review kapısı

Public leaf kimliklerin yüzde 100'ü izinli source ve Türkiye pazar kanıtı taşır. Duplicate/cyclic graph hatası sıfır; en az 200 rastgele leaf hatasız; yüksek riskli kimliklerin tamamı incelenmiş olmalıdır. Data, ikinci taxonomy reviewer ve hukuk kullanım reviewer'ı birbirinden ayrıdır.

## Rollback

Altı sentetik senaryo dual-read, activation abort, önceki release restore, cache invalidation, identity-request ve listing-reference sürekliliğini kapsar. On dakika içinde dönüş ve sıfır orphan reference gerekir. Production pointer değişmez.

## Güncel durum

Candidate, sampling/review ve rollback sözleşmeleri hazırdır. Lisanslı kaynak, gerçek dataset, klasik uzman paneli, hukuk onayı, payload veya rollback koşumu yoktur. Dataset acquisition, activation ve public taxonomy release yetkileri kapalıdır.
