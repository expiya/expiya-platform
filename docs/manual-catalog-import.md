# Manuel araç indeksi aktarımı

`outputs/manual-vehicle-index/Expiya_Manuel_Arac_Indeksi.xlsx` dosyasındaki **Arac Indeksi** sayfası doldurulur.

## Veri sınırı

Her satır tek bir marka, model, motor, şanzıman ve donanım kombinasyonunu temsil eder. İlan kimliği, tekil ilan URL'si, ilan başlığı, fiyat, satıcı, telefon, açıklama, fotoğraf veya kişisel veri eklenmez. Aynı kombinasyon birden fazla kez görülmüşse yalnızca anonim `Görülme Sayısı` artırılır.

Dosya katalog adayı üretir; doğrudan üretim araç varyantı veya teknik doğruluk kanıtı oluşturmaz. Adaylar eşleştirme ve resmî kaynak doğrulamasından sonra yayın kataloğuna alınabilir.

## Dışa aktarma

Excel'de **Arac Indeksi** sayfası seçilir ve `CSV UTF-8 (Comma delimited) (.csv)` biçiminde kaydedilir. Başlık adları ve sırası değiştirilmez.

## Kuru doğrulama

```sh
npm run db:import:catalog-candidates -- --file=/tam/yol/arac-indeksi.csv
```

Reddedilen satırlar düzeltilmeden veritabanı aktarımı yapılmaz.

## PostgreSQL aktarımı

```sh
node --env-file=.env.vercel.local --import tsx scripts/import-manual-catalog-candidates.ts \
  --file=/tam/yol/arac-indeksi.csv \
  --supplied-by="Serdar Akgül" \
  --apply
```

Aynı içerikteki dosyanın yeniden yüklenmesi `content_sha256` üzerinden etkisizdir. Farklı platform veya toplama tarihleri ayrı CSV dosyaları olarak teslim edilir.
