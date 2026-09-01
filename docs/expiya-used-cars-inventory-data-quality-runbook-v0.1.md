# Expiya İkinci El — Stok veri kalitesi runbook v0.1

## Ölçülen kalite sinyalleri

Aktif ilanlarda fiyat ve stok güncelliği, zorunlu alan eksikleri, unresolved duplicate, kanıt çelişkisi, geçersiz taxonomy referansı, yanlış doğrulanmış etiketi ve satıldığı halde public kalan araçlar ölçülür. Payda ve ölçüm zamanı her snapshot'ta kaydedilir; boş veya bozuk örnek başarı sayılmaz.

## Durdurma eşikleri

- Yanlış “Expiya doğruladı”, geçersiz taxonomy referansı, unresolved duplicate veya satıldığı halde public ilan: tolerans `0`.
- Süresi geçmiş fiyat: en fazla `%5`.
- Süresi geçmiş stok: en fazla `%10`.
- Zorunlu alan eksiği: en fazla `%1`.
- Açık kanıt çelişkisi: en fazla `%2`.

Eşik ihlalinde yeni yayın durdurulur; sponsorlu veya ücretli firma için istisna uygulanmaz. Kalite waiver otomatik verilemez.

## Düzeltme yaşam döngüsü

`OPEN → QUARANTINED/DEALER_ACTION_REQUIRED → UNDER_REVIEW → CORRECTED/REJECTED → CLOSED`

Kritik ve yüksek vakalarda ilan derhal askıya alınır. Düzeltme eski revision'ı değiştirmez; yeni revision üretir. Corrected kararı iki farklı reviewer ister ve otomatik yeniden yayın yetkisi vermez. SLA aşımı dealer/pilot sağlık skoruna yansır.

## Operasyon

Fiyat freshness, stok freshness, duplicate, taxonomy referansı ve evidence-conflict işlerindeki hata kuyrukları ayrı gözlenir. Satıldı sinyali mümkün olan en kısa SLA ile fail-closed kaldırma üretir. Feed omission satış sayılmaz; yalnız explicit status veya yetkili manuel karar kapanış yapar.

## Güncel durum

Eşikler, correction workflow ve sentetik staging job/rehearsal/dashboard bootstrap sözleşmeleri hazırdır. Gerçek staging/production freshness jobs, calibrated duplicate detection, taxonomy monitor, evidence queue staff, sold-removal SLA koşumu, dashboard review kanıtı ve rehearsal koşumu eksiktir. `DATA_QUALITY` staging, pilot ve production için `NO-GO`; public monitoring, otomatik republish ve waiver yetkileri kapalıdır.
