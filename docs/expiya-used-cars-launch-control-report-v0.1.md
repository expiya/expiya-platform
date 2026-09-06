# Expiya İkinci El — Birleşik launch-control raporu v0.1

## Güncel karar

| Aşama | Durum | Açıklama |
|---|---|---|
| Sentetik MVP | Hazır | UI ve domain sözleşmeleri sentetik veriyle doğrulandı; dış yan etki yok |
| Staging integration | NO-GO | Identity provider, gerçek PostgreSQL/RLS ve deployment topolojisi dış kapıları açık |
| Kontrollü pilot | NO-GO | Staging'e ek olarak taxonomy, operasyon ve moderasyon tatbikatları eksik |
| Production | NO-GO | Pilot kapılarına ek olarak ticari ve conversational-commerce dış onayları eksik |

Sentetik MVP'nin hazır olması gerçek veri, kullanıcı, firma, mesaj, ödeme, ilan veya deployment yetkisi değildir.

## Domain özeti

- Identity: principal, MFA, davet, recovery ve servis hesabı kontratları hazır; provider ve gerçek güvenlik tatbikatları eksik.
- Database/RLS: ERD, composite key, adversarial matrix ve disabled staging taslağı hazır; gerçek PostgreSQL koşumu ve bağımsız review eksik.
- Taxonomy: release manifest, provenance, integrity ve özel kimlik kuyruğu hazır; lisanslı veri ve gerçek release incelemesi eksik.
- Pilot operasyonu: şehir/firma/stok seçimi, onboarding ve sağlık ölçütleri hazır; gerçek kohort/onay/personel eksik.
- Moderasyon/incident: triage, vaka kontrolü, karantina ve runbook hazır; kadro, araç entegrasyonu ve tatbikat eksik.
- Ticari: paket, entitlement, billing ve sponsorship ayrımı hazır; fiyat/provider/fatura ve ranking audit'i eksik.
- Conversational commerce: kanal, video, AI mandate, teklif ve handoff sınırları hazır; provider, hukuk, eval ve kill-switch tatbikatı eksik.
- Model governance: sentetik eval, protected-feature, evidence-grounding ve release/drift kapıları hazır; bağımsız fairness review, red-team, shadow eval ve monitoring baseline eksik.
- Product governance: altı mimari karar ile rol/checksum/bağımsız inceleme/supersede sözleşmeleri kayıtlı; pilot ve MVP kapsamını belirleyen on ürün kararı öneri durumunda ve açık owner onayı bekliyor.
- Vendor governance: on iki provider capability için veri sınıfı, kontrol, kesinti ve çıkış gereksinimleri hazır; aday, DPA/KVKK, bölge/aktarım ve güvenlik-hukuk-ticari onayları eksik.
- Data governance: on işleme faaliyeti ve DPIA tarama kapısı hazır; hukuki sebep, retention, taraf rolleri, alıcı/aktarım matrisi ve gerçek DPIA onayları eksik.
- Legal governance: on iki belge sınıfı ile sürüm/checksum/kabul/yeniden kabul kapıları hazır; hukuk onaylı aktif metinler ve gerçek acceptance testi eksik.
- Human operations: kritik roller, görev ayrılığı ve dokuz rehearsal runbook'u hazır; gerçek atama, eğitim, vardiya/yedek, SLA ve tatbikat kanıtları eksik.
- Data quality: stok/fiyat güncelliği, duplicate, taxonomy, evidence ve yanlış doğrulama eşikleri ile correction workflow hazır; production jobs, dashboard, staffing ve rehearsal eksik.
- Experiment governance: deney sözleşmesi, yasak allocation alanları ve sıfır toleranslı guardrail'ler hazır; platform izolasyonu, privacy/fairness review, kill-switch ve monitoring eksik.
- Accessibility: 15 release-blocking requirement ile yüzey/yöntem/kanıt matrisi hazır; kapsamlı automated, keyboard, screen-reader, visual ve cognitive audit eksik.
- Content governance: sekiz canonical güven etiketi, yasak ifade ve dört rollü review kapısı hazır; production copy envanteri ve hukuk/a11y/evidence incelemeleri eksik.
- API governance: public/partner/ops/feed/webhook için 10 disabled endpoint, protokol ve deprecation sözleşmeleri hazır; gateway, auth/tenant integration, replay/idempotency store ve compatibility testleri eksik.
- Supply chain: dependency, signed artifact/SBOM/provenance ve secret inventory sözleşmeleri hazır; CI scans, signing, immutable registry, rotation ve reproducible-build kanıtları eksik.
- Security validation: 10 yüzeyde 18 adversarial senaryo ve bağımsız retest lifecycle'ı hazır; izole ortam, pentest koşumu, bulgu kapatma ve security sign-off eksik.
- Deployment: URL parity, host/cookie/origin sınırı ve migration runbook hazır; DNS/TLS, partner deployment ve SEO/synthetic test eksik.
- Observability: telemetry namespace, redaction, SLO ve stream ayrımı hazır; provider, canary, dashboard, alert/SIEM ve load baseline eksik.
- Feed integration: canonical envelope, mapping, reconciliation ve HMAC sınırı hazır; gerçek provider certification, key/load/reconciliation tatbikatı eksik.
- Resilience: backup sınıfları, restore validation, degraded mode ve backup privacy hazır; provider/KMS, restore/failover ve expiry tatbikatları eksik.
- Privacy operations: hak yaşam döngüsü, requester verification, fulfillment ve alıcı koordinasyonu hazır; hukuk, kanal, secure export/deletion tatbikatı ve privacy kadrosu eksik.

## Promotion kuralı

Her aşama bir öncekinin tamamlanmasını ister. Promotion paketi; immutable evidence manifest, named approver, açık kapsam yetkisi ve checksum'lu rollback planı taşır. Hukuk ve security review bağımsız reviewer gerektirir. Süresi geçmiş veya supersede edilmiş kanıt kullanılamaz.

GO/NO-GO toplantısında readiness ve evidence tamlığı, rollback tatbikatı, yeşil observability, support/incident kadrosu, açık yüksek önem olayları ve kill-switch sonuçları gözden geçirilir. Public listing, partner writes, lead handoff, payments, channels, AI agent ve taxonomy release kill-switch'lerinin tamamı test edilmiş olmalıdır.

## Release ve rollback checklist

1. Kapsam ve aşama açıkça seçildi; scope dışı kabiliyetler kapalı.
2. Her zorunlu domain `ready`; eksik anahtar yok.
3. Evidence checksum ve reviewer bağımsızlığı doğrulandı.
4. Secrets, identity audience, tenant/RLS ve log redaction test edildi.
5. Synthetic monitoring, alert routing ve on-call doğrulandı.
6. Rollback ve bütün kill-switch'ler tatbik edildi.
7. SEV1/SEV2 açık olay yok; hukuk/operasyon sign-off kayıtlı.
8. Named decision maker açık GO verdi.
9. Deployment ayrıca yetkili sistem/insan tarafından başlatıldı; launch-control otomatik deploy etmez.
10. Release sonrası ölçüm penceresi ve durdurma eşikleri aktif.

## Release bundle ve yetki invariant'ı

Her promotion adayı bundle; hedef aşama, 40 karakterli source commit SHA, artifact SHA-256 digest, açık scope authorization, rollback checksum ve 25 launch domain'inin her biri için hedef aşamaya bağlı geçerli kanıt taşır. Evidence ID'leri tekil olmalı; süresi dolmuş, supersede edilmiş, self-review içeren veya başka aşamaya ait kanıt kabul edilmez. Bundle production verisi içeremez ve deployment talebi taşıyamaz; geçerli bundle dahi promotion/deployment'ı otomatik yetkilendirmez.

Ayrı invariant denetimi production deployment/database write, gerçek firma kaydı, ilan yayını, lead ve e-posta aktarımı, ödeme/fatura, canlı mesaj/video, AI satış/pazarlık ve scraping yetkilerinin tamamını `false` bekler. Bunlardan herhangi birinin yanlışlıkla açılması release blocker'dır.

## Sonuç

Bugünkü güvenli kapsam sentetik MVP'dir. Staging, kontrollü pilot ve production NO-GO'dur. Kod içindeki bütün yan etki yetkileri `false` kalır; bu rapor onları açmaz.

EİDS/İETTS ek kapıları: İşletme/şube yetki belgesi ile araç bazlı ilan yetkisi birbirinden ayrı fail-closed kontrollerdir. Gerçek provider credential/çağrısı, resmî EİDS logo kullanımı ve gerçek ilan yayını kapalıdır. Complaint telefon numarası, hukuk müşaviri onaylı galeri sözleşmesi, EİDS/İETTS canlı entegrasyonları ve staging contract testleri yeni launch blocker'larıdır.
