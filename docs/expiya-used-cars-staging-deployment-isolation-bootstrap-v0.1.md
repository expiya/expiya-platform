# Expiya İkinci El — Staging deployment isolation bootstrap v0.1

## Ayrı deployment sınırı

Public, partner ve ops yüzeyleri ayrı host, deployment project, runtime service account, WAF policy ve rate-limit namespace ister. Session cookie domain paylaşılmaz; hiçbir yüzey diğerinin session bilgisini okuyamaz. Partner ve ops, public uygulamanın route veya auth düzleminde çalışmaz.

Manifest provider bağımsızdır. Project, service account ve WAF referansları boş; internet erişimi ve deployment creation kapalıdır. Gerçek DNS/TLS değişikliği yapılmaz.

## Host izolasyonu

Dokuz sentetik negatif senaryo host-header poisoning, cross-surface session, cross-origin erişim, cache çakışması, yanlış audience, public write, yanlış hostta partner/ops route ve CSP report-only davranışını kapsar. Her sonuç checksum ve bağımsız reviewer kimliği taşır.

## Rollback kanıtı

Public, partner ve ops release rollback; DNS abort; legacy redirect rollback ve session-key rollback ayrı tatbikatlardır. Sentetik staging hedefi 15 dakika içinde geri dönüştür. Rollback hiçbir production değişikliği veya silinmiş kişisel verinin geri yüklenmesini yetkilendirmez.

## Güncel durum

Deployment boundary, host isolation ve rollback sözleşmeleri hazırdır. Gerçek project, DNS/TLS, identity audience, CSP ölçümü, host testi veya rollback koşumu yoktur. Deployment creation, host exposure, redirect activation ve production change yetkileri kapalıdır.
