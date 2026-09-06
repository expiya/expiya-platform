# Expiya İkinci El — Deney ve büyüme yönetişimi runbook v0.1

## İlke

Deneyler kullanıcı karar kalitesini, açıklama anlaşılırlığını veya operasyon verimliliğini ölçebilir; güvenlik, kanıt doğruluğu, rıza, erişilebilirlik veya organik tarafsızlık pahasına dönüşüm optimize edemez. Satış dönüşümü tek başarı metriği olamaz.

## Deney sözleşmesi

Her deney; hipotez, yüzey, birincil metrik, guardrail'ler, zaman aralığı, owner, privacy/fairness review ve checksum'lu rollback planı taşır. Tenant, üyelik paketi, ödeme, sponsorlu statü, korunan özellik, VIN veya plaka allocation key olamaz.

Organik sıralama üzerinde deney varsayılan olarak kapalıdır. Sponsorlu sonuçlar organik kohorta karıştırılamaz ve deney etiketi sponsorlu etiketinin yerine geçemez.

## Sıfır toleranslı durdurma koşulları

Cross-tenant olay, rıza hatası, yanlış doğrulama, “kesin al/alma” yanıtı veya sponsorlu-organik karışması tek olayda deneyi durdurur. Erişilebilirlik regresyonu `%1`, şikâyet `%3`, hata oranı `%2` üstünde durdurma üretir. Yeterli örnek yoksa deney devam edebilir fakat kazanan ilan edilemez.

## Rollout

Kazanan varyant otomatik rollout edilemez. Bağımsız review, tam regresyon, güncel risk değerlendirmesi ve named approver gerekir. Başarısız veya durdurulmuş sonuçlar silinmez; audit ve öğrenme kaydı olarak saklanır.

## Güncel durum

Deney sözleşmesi ve guardrail'lere ek olarak beş yüzeyli allocation boundary, dokuz kill-switch senaryosu ve audit export gate staging bootstrap sözleşmesi olarak hazırdır. Allocation platform/provider privacy review, gerçek teknik izolasyon, fairness personeli, accessibility monitoring, kill-switch koşumu, audit export ve bağımsız review eksiktir. `EXPERIMENT_GOVERNANCE` staging, pilot ve production için `NO-GO`; canlı deney, otomatik rollout ve organik sıralama deneyi yetkileri kapalıdır. Ayrıntılı staging sınırı `docs/expiya-used-cars-staging-experiment-governance-bootstrap-v0.1.md` içindedir.
