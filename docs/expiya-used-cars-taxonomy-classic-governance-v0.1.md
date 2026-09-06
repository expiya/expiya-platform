# Expiya İkinci El — Taxonomy ve Klasik Araç Yönetişimi v0.1

Durum: `FOUNDATION / NO TAXONOMY DATA IMPORT / NO PUBLIC CLAIMS`  
Tarih: `2026-09-01`

## Taxonomy release otoritesi

Release zinciri `DRAFT → VALIDATED → OWNER_APPROVED → ACTIVE` şeklindedir. Draft veya yalnız validated içerik aktif olamaz. Active release geçmişten silinmez; yeni release ile `SUPERSEDED` olur veya gerekçeli `WITHDRAWN` durumuna geçer. Aktivasyon için checksum, pozitif entity sayısı, owner kimliği ve approval zamanı zorunludur.

Sıfır araç production katalog release'i ile ikinci el tarihsel taxonomy release'i farklı otoritelerdir. Ortak ID veya otomatik veri transferi yoktur.

## Yeni araç kimliği talebi

Satıcı yalnız kanıt ve açıklama içeren talep oluşturur. Akış:

```text
SUBMITTED → EVIDENCE_REVIEW
→ MATCH_FOUND | NEW_ENTITY_PROPOSED
→ SECOND_REVIEW → RESOLVED
```

Satıcı canonical ad, stable ID veya aktif taxonomy kaydı oluşturamaz. Resolution için moderatör ve ikinci reviewer onayı ile mevcut/yeni taxonomy entity ID zorunludur. Talebin çözülmesi entity'nin aktif release'e otomatik girmesi değildir; sonraki release yönetişimine dahil edilir.

## Kaynak ve lisans kapıları

Public taxonomy kullanımı yalnız `OPEN_LICENSE`, `PUBLIC_FACTS_ONLY` veya geçerli `LICENSED` kaynakla mümkündür. `CONTRACT_REQUIRED`, `PERMISSION_REQUIRED`, `INTERNAL_ONLY` ve `PROHIBITED` public kullanılamaz. Kaynak incelemesi 180 günü aşarsa yenilenir; lisans bitişi ve Türkiye pazar uygulanabilirliği ayrıca kontrol edilir.

Satıcı yüklemesi araştırma girdisidir; canonical kimliği tek başına doğrulayamaz. Otomatik acquisition izni ayrıca ve açıkça verilmiş olmalıdır. Public sayfaya erişilebilmesi scraping/lisans izni anlamına gelmez.

## Klasik araç yüksek riskli iddiaları

`ORIGINAL`, `MATCHING_NUMBERS`, `COLLECTIBLE` ve `PERIOD_CORRECT` yüksek riskli iddialardır.

- Satıcı beyanı yalnız açık “satıcı beyanı” etiketiyle gösterilir.
- Expiya doğrulaması için alan bazlı `EXPIYA_VERIFIED`, uzman incelemesi, kaynak kaydı, arşiv/fabrika referansı ve güncellik gerekir.
- `MATCHING_NUMBERS` ayrıca şasi/seri ile motor/şanzıman kimlik kanıtı ister.
- Eksik veya çelişkili iddia public fact olarak gizlenir.
- Doğrulanmış ifade dahi yalnız belirtilen kanıt kapsamındadır; araç için genel orijinallik veya satın alma garantisi değildir.
- Bütün klasik araç yüksek riskli iddialarında uzman incelemesi önerisi görünür kalır.
- Sistem hiçbir zaman “al/alma” talimatı üretmez.

## Production kapıları

- Pilot taxonomy kapsam listesi ve kaynak/lisans register'ı.
- Stable ID, merge/split/supersede politikası.
- İkinci reviewer bağımsızlık ve SLA kuralı.
- Lisans süresi/territory/display hakları hukuk incelemesi.
- Klasik uzman yeterlilik, çıkar çatışması ve sorumluluk modeli.
- Arşiv belgelerinin kullanım izni ve PII redaksiyonu.
- Release imza/checksum ve rollback rehearsal.

