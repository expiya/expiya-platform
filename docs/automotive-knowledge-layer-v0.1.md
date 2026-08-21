# Automotive Knowledge Layer v0.1

## Amaç

Expiya'nın kullanıcıyla araç seçimi dışında da öğretici ve kaynaklı otomotiv sohbetleri yapabilmesini sağlamak. Bu katman karar kataloğundan ayrıdır; tek başına aday filtreleyemez, sıralayamaz veya kullanıcıya belirli bir aracı öneremez.

## Bilgi sınıfları

1. `CURRENT_MARKET_FACT`
   - Yıllık/aylık marka ve model satış veya tescil adetleri
   - Yakıt, gövde, segment ve renk dağılımları
   - Kaynak dönemi, pazar ve yayın tarihi zorunludur
2. `AUTOMOTIVE_CONCEPT`
   - Gövde, motor, yakıt, şanzıman ve sektör terimleri
   - Zamandan görece bağımsız, editoryal olarak kontrol edilen açıklamalar
3. `AUTOMOTIVE_HISTORY`
   - Marka, model, teknoloji ve sektör tarihi
   - Kaynak ve olay tarihi zorunludur
4. `FORECAST_OR_SCENARIO`
   - Elektrifikasyon, fiyat, satış veya teknoloji öngörüleri
   - Gerçek bilgi gibi sunulamaz; yöntem, varsayım, ufuk ve belirsizlik zorunludur

## Kaynak otoritesi

- Birincil: TÜİK, ODMD, EPDK, Sanayi ve Teknoloji Bakanlığı, AB/ACEA gibi resmî kurumlar ve üretici raporları
- İkincil: açık metodoloji taşıyan sektör araştırmaları
- Haber ve yorum: yalnız bağlam; tek başına sayısal otorite değildir
- Her kayıt `sourceUrl`, `sourceTitle`, `publisher`, `publishedAt`, `period`, `market`, `retrievedAt`, `checksum` ve `locator` taşır

## Release modeli

- Immutable veri release'i
- Ayrı active pointer ve generated read-only module
- Kaynak checksum registry
- Dönemsel veri için `effectiveAsOf` ve `supersedes`
- Eski istatistikler yeniden yazılmaz; yeni dönem append-only eklenir

## Konuşma yönlendirmesi

- `EXPIYA_ORIENTATION`: “Siz ne yapıyorsunuz?”, “Bana nasıl yardımcı olursun?”
- `CATALOG_OVERVIEW`: “Ne tür araçlar var?”
- `AUTOMOTIVE_EDUCATION`: “Dizel ne demek?”, “SUV ile crossover farkı ne?”
- `MARKET_STATISTICS`: “Geçen yıl en çok hangi marka satıldı?”
- `AUTOMOTIVE_HISTORY`: “Hibrit araçların tarihi nedir?”
- `FORECAST_DISCUSSION`: “Elektrikli araçlar gelecekte ne olur?”

Bilgi cevabından sonra kullanıcı zorlanmadan araç seçimine yönlendirilebilir: “İstersen bunu kendi kullanımına göre birlikte değerlendirebiliriz.” Bu geçiş açık kullanıcı isteği olmadan filtre veya tercih üretmez.

## Güvenlik sınırı

- Bilgi katmanı Decision Engine'e doğrudan import edilmez
- Pazar popülerliği “daha iyi araç” anlamına gelmez
- Satış adedi güvenlik, kalite veya uygunluk puanı değildir
- Tahminler doğrulanmış gerçeklerle aynı dilde sunulmaz
- Güncel veri bulunamazsa dönem açıkça söylenir; sayı uydurulmaz
- Güvenli/ileri sürüş içeriği kamu yolunda riskli manevra veya performans sürüşü talimatına dönüşmez
- Acil durum kontrol çalışmaları yalnız uygun kapalı alan ve nitelikli eğitmen bağlamında anılır
- Taslak mevzuat yürürlükteki düzenleme gibi sunulmaz
- Geri çağırma kapsamı araç kimliği olmadan doğrulanmış sayılmaz
- Güvenlik yıldızları protokol ve test yılı olmadan araç sıralamasına dönüştürülmez
- Kaza bilgisi kusur/tazminat kararı; erişilebilirlik bilgisi tıbbi veya hukuki uygunluk kararı üretmez

## İlk teslim dalgası

1. Expiya tanıtım ve kapsam cevapları
2. Kontrollü otomotiv kavram sözlüğü
3. Türkiye yıllık marka/model satış veri sözleşmesi
4. Kaynaklı istatistik renderer'ı
5. Tarih ve gelecek senaryosu için citation zorunlu sohbet kapısı
6. Decision Engine import-boundary ve no-ranking regresyon testleri
