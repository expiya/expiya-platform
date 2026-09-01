# Expiya İkinci El — Eşleştirme, Ticari Tarafsızlık ve Foundation Readiness v0.1

Durum: `FOUNDATION COMPLETE / PILOT AND PRODUCTION BLOCKED`
Tarih: `2026-09-01`

## Eşleştirme sınırı

Eşleştirme sırası:

```text
UsedCarPreferenceLedger
→ yaş/km danışmanlık koridoru
→ hard constraint kapıları
→ need/budget/risk/evidence/availability boyutları
→ deterministik organik sıra
→ gerekçe, belirsizlik ve güvenli sonraki adımlar
```

Hard constraint'ler skordan önce uygulanır. Açık bütçe üst sınırı, hard model yılı/km, ağır hasarı kesin dışlama ve operasyonel erişilebilirlik başarısızsa aday sıralamaya girmez. Ağır hasar bilgisi bilinmiyorsa “yok” varsayılmaz.

Yaş/km koridoru `advisoryOnly: true` taşır. Kullanıcı hard sınır vermediyse risk toleransı ve yıllık kullanım üzerinden açıklanabilir başlangıç aralığı üretir; mekanik durum veya satın alma güvenliği garantisi değildir.

Tek birleşik “araç kalitesi” skoru yoktur. Beş boyut korunur: ihtiyaç, bütçe, risk, kanıt hazırlığı ve operasyonel erişilebilirlik. Eksik bakım/hasar bilgisi belirsizlik olarak gösterilir. Her sonuç satıcı beyanını kontrol etme ve bağımsız ekspertiz önerisi taşır.

## Organik ve sponsorlu ayrım

- Organik ranking girdisinde tenant planı, ücret, kampanya veya sponsor alanı yasaktır.
- Üyelik planlarında `organicRankingBenefit: false` değişmezdir.
- Sponsorlu yerleşim ayrı array/stream'dir ve `SPONSORED` etiketi zorunludur.
- Search surface `streamsMixed: false` taşır.
- Organik analitik event'ine campaign/plan alanı eklenemez.
- Sponsorlu impression, `sponsored: true` ve campaign ID olmadan geçerli değildir.
- Ticari ekip organik ağırlıkları runtime'da değiştiremez; policy version owner yönetişimine tabidir.

## Moderasyon yürütmesi

Moderasyon görevi `OPEN → CLAIMED → DECIDED` yolunu izler. Karar subject revision, aktör, decision ve reason code olmadan tamamlanmış sayılmaz. İtiraz `APPEALED → SECOND_REVIEW → CLOSED` yolundadır ve ilk kararı veren aktör ikinci incelemeyi yapamaz.

## Foundation readiness sonucu

Tamamlanan foundation alanları:

- ürün ve mimari sınır,
- domain contracts ve runtime şemaları,
- tenant/RBAC izolasyonu,
- public/private projection,
- medya/fraud kapıları,
- lead/consent/retention,
- taxonomy/klasik yönetişimi,
- matching ve ticari tarafsızlık,
- moderasyon ve audit.

Foundation tamamlanmış olsa da aşağıdakiler bilinçli olarak false kalır:

- `pilotDataWriteAuthorized: false`
- `productionLaunchAuthorized: false`

Bloklayan sonraki program işleri:

1. Hukuk onayı ve kesin retention/recipient metinleri.
2. RLS tasarım owner/DBA/security onayı.
3. Identity/KMS/storage/scanner/SMS/e-posta/ödeme gibi production adapter seçimleri.
4. Migration ve gerçek DB entegrasyonu için ayrıca yetkilendirilmiş uygulama fazı.
5. B2C, partner ve ops UI uygulaması ile erişilebilirlik/E2E.
6. Pilot satıcı sözleşmeleri, operasyon ekibi ve şehir/taxonomy verisi.
7. Pentest, DPIA, incident/DSAR/backup-deletion rehearsal.

Bu belge gerçek pilot veya production açılış onayı değildir.
