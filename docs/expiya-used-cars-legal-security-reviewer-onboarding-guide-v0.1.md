# Expiya İkinci El — Hukuk ve güvenlik incelemecisi bulma/onboarding rehberi v0.1

## Hukuk müşaviri nasıl bulunur?

Türkiye'de teknoloji, KVKK, elektronik ticaret, tüketici hukuku ve platform sözleşmeleri alanlarında çalışan bir avukat veya hukuk bürosundan teklif alın. Arama/teklif metninde ürünün yalnız kurumsal ikinci el satıcılara açık olduğu; lead aktarımı, ücretli üyelik/bildirim, belge-fotoğraf işleme ve ileride mesaj/video/AI özellikleri bulunduğu belirtilmelidir.

İlk görüşmede şu deneyimler sorulur: KVKK veri sorumlusu–veri işleyen rolleri, yurt dışı veri aktarımı, ETK/İYS ayrımı, mesafeli hizmet/abonelik ve iptal-iade, platform–satıcı sorumluluk paylaşımı, otomotiv ilan/iddia dili ve provider DPA incelemesi. Çıkar çatışması ve mesleki yetki doğrulanır; kapsam, ücret, teslim tarihi ve revizyon turu yazılı teklif olur.

Hukukçuya verilecek paket: ürün mimarisi, processing inventory/DPIA, retention matrisi, 12 hukuk belgesi registry'si, lead/rıza sınırı, üyelik–ödeme runbook'u, conversational-commerce vizyonu ve `UC-PD-003/008/009`. Beklenen çıktı; redline edilmiş metinler, rol/hukuki sebep/aktarım matrisi, risk notu, imzalı onay ve her belge için sürüm/checksum'dır.

## Security reviewer nasıl bulunur?

Uygulama güvenliği, multi-tenant SaaS, PostgreSQL RLS, OAuth/OIDC-MFA, dosya yükleme, webhook/feed ve tercihen LLM güvenliği tecrübesi olan bağımsız danışman veya pentest firması seçilir. Geliştirmeyi yapan kişi/firma ile aynı incelemeci olmamalıdır.

Teklifte white-box architecture review, izole staging pentest, 18 zorunlu senaryo, retest, önem dereceli bulgu raporu, veri saklama/redaction ve yazılı sign-off istenir. Production testi yetkilendirilmez. Firma/personel referansı, yöntem, sorumluluk sigortası, gizlilik sözleşmesi, veri konumu ve test başlangıç/bitiş tarihleri doğrulanır.

Reviewer'a verilecek paket: threat model, tenant/RBAC/RLS tasarımı, API ve identity manifestleri, media/feed güvenliği, security test planı, logging/redaction, backup/incident/kill-switch runbook'ları ve `UC-PD-007`. Beklenen çıktı; kapsam/checksum, senaryo sonuçları, bulgu/retest tablosu, açık riskler ve bağımsız security sign-off'tur.

## Kabul sınırı

Yalnız “uygundur” e-postası yeterli değildir. İncelemecinin kimliği/rolü, kapsamı, incelenen sürüm/checksum, tarih, bulgular, istisnalar ve imzası kaydedilir. Critical/high güvenlik bulgusu veya çözümsüz hukuk belirsizliği varken readiness kapanmaz. Codex veya kurucu, bağımsız hukuk/güvenlik imzası yerine geçmez.
