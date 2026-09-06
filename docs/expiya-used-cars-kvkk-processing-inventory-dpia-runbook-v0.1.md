# Expiya İkinci El — KVKK işleme envanteri ve DPIA runbook v0.1

## İşleme envanteri

Teknik envanter; firma onboarding, erişim güvenliği, stok yönetimi, ihtiyaç eşleştirme, lead handoff, fraud önleme, billing, analytics, canlı iletişim ve AI yardımını ayrı faaliyetler olarak kaydeder. Her faaliyet için amaç, veri kategorisi, ilgili kişi, alıcı, yurt dışı aktarım olasılığı, otomatik karar ve insan inceleme imkânı tutulur.

Hukuki sebep ve retention kimlikleri bilinçli olarak boş bırakılmıştır. Bunlar kod tarafından tahmin edilemez; hukuk ve veri yönetişimi sahiplerinin faaliyet bazlı kararına ihtiyaç duyar.

## DPIA taraması

Aşağıdakiler DPIA/mahremiyet etki incelemesi gerektirir:

- Otomatik eşleştirme veya profilleme
- VIN, plaka veya kalıcı fraud fingerprint'i
- Fraud puanlama ve vaka korelasyonu
- Canlı video ve olası kayıt
- AI konuşma ve pazarlık bağlamı
- Yurt dışı veri aktarımı ihtimali

İnceleme; gereklilik-orantılılık, test edilmiş kontroller, residual risk, privacy/security/hukuk ayrılmış reviewer'ları ve expiry tarihi taşır. Yüksek residual risk, eksik reviewer veya süresi geçmiş DPIA processing'i bloke eder.

## Veri akışı kapısı

İşleme faaliyetinin tanımlanması processing yetkisi değildir. Production öncesinde hukuki sebep, retention, controller/processor rolleri, alıcı matrisi, yurt dışı aktarım mekanizması, DPIA ve records-of-processing onayları birlikte tamamlanır. Onay sonrasında bile launch-control kapsam yetkisi ayrıca gerekir.

## Güncel durum

On faaliyetlik teknik envanter ve DPIA tarama sözleşmesi hazırdır. Hukuki sebepler, kesin retention politikaları, taraf rolleri, alıcılar, aktarım mekanizması ve gerçek DPIA onayları eksiktir. Bu nedenle `DATA_GOVERNANCE` staging, pilot ve production için `NO-GO`; gerçek işleme, yurt dışı aktarım ve otomatik karar yetkileri kapalıdır.
