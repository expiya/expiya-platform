# Expiya İkinci El — Sentetik MVP prototip handoff v0.1

Tarih: 1 Eylül 2026

## Tamamlanan yüzeyler

- B2C: `/ikinciel`, `/ikinciel/tercihler`, `/ikinciel/eslestirme`, `/ikinciel/arac/[id]`
- Partner demo: genel bakış, onboarding, stok oluşturma, taxonomy talebi, klasik araç, talepler, toplu import dry-run, üyelik, analitik, audit, erişim, medya, hazırlık
- Expiya operasyon demosu: moderasyon kararı ve kanıt matrisi

## Uygulanan değişmez sınırlar

- Sıfır araç Motor V3, preference ledger, katalog, exact varyant, rapor ve handoff sözleşmelerine dokunulmadı.
- Sıfır araç verisi somut ikinci el stok olarak kullanılmadı.
- Bütün UI verileri sentetik ve görünür şekilde demo olarak işaretli.
- Gerçek firma, PII, ödeme, lead aktarımı, dosya yükleme ve veri tabanı yazımı yok.
- Pilot data write ve production launch yetkileri kapalı.
- Partner demo rotaları `noindex`, `nofollow`, `no-referrer` metadata sınırı taşır.
- `/ikinciel` alt yollarını gelecekte `/cars/ikinciel` altında bire bir koruyan route sözleşmesi hazırdır; redirect henüz etkin değildir.
- Public/partner host, cookie, origin, auth audience ve deployment sınırları ayrıdır; DNS ve partner production deployment henüz etkin değildir.
- Üyelik organik sıralama avantajı sağlamaz; sponsorlu akış ayrıdır.
- Satıcı canonical taxonomy kimliği oluşturamaz.
- Satıcı beyanı otomatik doğrulanmış bilgiye dönüşmez.
- Klasik araç yüksek riskli iddiaları uzman/kanıt incelemesi olmadan doğrulanmış gösterilmez.

## Kalite kapıları

- `npx eslint app/ikinciel components/used-cars features/used-cars/demo --max-warnings=0`
- `npx tsc -p tsconfig.used-cars-ui.json --pretty false`
- `npx vitest run features/used-cars`

Son hedefli koşum: 188 test dosyası, 547 test başarılı.

Repository kapsamı, unrelated conflict'ler ve güvenli stage allowlist'i `docs/expiya-used-cars-repository-scope-audit-v0.1.md` ile `docs/expiya-used-cars-commit-ready-delivery-manifest-v0.1.md` içinde kayıtlıdır.

## Bilinçli olarak sonraki yetki kapısında kalanlar

Birleşik launch-control kararı: sentetik MVP hazır; staging integration, kontrollü pilot ve production `NO-GO`. Domain bazlı blokajlar ve promotion checklist'i `docs/expiya-used-cars-launch-control-report-v0.1.md` içinde birleştirildi.

- Hukuk/KVKK ve sözleşme metinlerinin yetkili hukuk incelemesi
- Production identity provider seçimi ve gerçek entegrasyonu (provider-neutral principal, MFA, davet, kurtarma ve servis hesabı güvenlik sözleşmeleri hazır)
- PostgreSQL/RLS migration uygulaması ve saldırgan tenant izolasyon testleri
- Gerçek veri lisansları ve ilk taxonomy release onayı (pilot manifest, provenance, integrity, özel kimlik kuyruğu ve release runbook hazır)
- Pilot şehir, firma ve stok seçimi (seçim kapıları, B2B kohort yaşam döngüsü, kalite/stop ölçütleri ve runbook hazır)
- Gerçek moderasyon/fraud operasyonu ve incident runbook tatbikatı (triage, vaka kontrolü, karantina, severity ve tatbikat sözleşmeleri hazır)
- Ödeme sağlayıcısı, faturalama ve production deployment (paket, entitlement, billing state machine, sponsorluk ayrımı ve ticari runbook hazır)
- WhatsApp/kanal entegrasyonu, canlı görüntülü araç oturumu ve satıcı adına çalışan AI satış/pazarlık asistanı (kanal, rıza, video, mandate, teklif, handoff ve safety runbook sözleşmeleri hazır; gerçek kabiliyetler kapalı).
- Model/eval production kapıları (sentetik eval, protected-feature, evidence-grounding ve release/drift sözleşmeleri hazır; bağımsız fairness review, red-team, shadow eval ve monitoring baseline eksik).
- Ürün yönetişimi kararları (altı ADR kayıtlı; pilot ve MVP kapsamını belirleyen on karar öneri statüsünde, ilgili owner onayları bekleniyor).
- Ürün kararı onay/değişiklik kontrolü (rol, checksum, bağımsız inceleme, etki analizi, rollback ve supersede sözleşmeleri hazır; gerçek owner onayı üretilmedi).
- Provider yönetişimi (12 capability için veri sınıfları, teknik kontroller, kesinti/çıkış ve değerlendirme kapıları hazır; provider seçimi ve gerçek veri aktarımı yapılmadı).
- KVKK veri yönetişimi (10 işleme faaliyeti, DPIA tarama ve bağımsız inceleme kapıları hazır; hukuki sebep, retention ve gerçek DPIA onayları bekleniyor).
- Hukuk/sözleşme yönetişimi (12 belge sınıfı, sürüm/checksum, acceptance ve yeniden kabul kapıları hazır; gerçek hukuk onayı veya rıza toplanmadı).
- İnsan operasyonu (kritik roller, görev ayrılığı, eğitim/vardiya/yedek ve dokuz rehearsal kapısı hazır; gerçek atama veya operasyon yetkisi üretilmedi).
- Stok veri kalitesi (freshness, duplicate, taxonomy, evidence ve yanlış doğrulama eşikleri ile revision tabanlı düzeltme akışı hazır; production monitoring kapalı).
- Deney/büyüme yönetişimi (yasak allocation alanları, güvenlik guardrail'leri ve insan onaylı rollout kapısı hazır; canlı deney ve organik sıralama deneyi kapalı).
- Erişilebilirlik release kapısı (15 requirement, yüzey/yöntem matrisi ve checksum'lu audit kanıtı hazır; kapsamlı gerçek cihaz ve yardımcı teknoloji testi bekleniyor).
- Public içerik/güven dili (sekiz canonical kanıt etiketi, yasak içerik gate'i ve dört rollü review sözleşmesi hazır; production copy yayını kapalı).
- API yönetişimi (10 disabled endpoint, tenant/idempotency/rate-limit protokolü ve 90 günlük deprecation kapısı hazır; production API ve webhook processing kapalı).
- Yazılım tedarik zinciri (dependency, SBOM/provenance, artifact attestation ve secret rotation kapıları hazır; CI promotion ve gerçek secret aktivasyonu kapalı).
- Güvenlik doğrulaması (10 yüzeyde 18 adversarial senaryo, bulgu SLA'sı ve bağımsız retest kapısı hazır; gerçek pentest ve security sign-off bekleniyor).
- Kalan iş teslim planı (25 domain ve 176 açık kontrol; karar, staging, doğrulama, pilot ve production olmak üzere beş yürütme dalgasına ayrıldı).
- Staging bootstrap (public/partner/ops için izole manifest, sentetik veri sınırı ve identity→audit sekiz checkpoint'li ilk dikey dilim hazır; gerçek ortam kurulmadı).
- Staging migration promotion (dokuz faz, DBA/security ayrımı, rollback artifact ve çok tenantlı sentetik seed sözleşmeleri hazır; `.disabled` tasarım uygulanmadı).
- Staging identity (ayrı public/partner/ops audience, server-side membership resolution, MFA ve signing-key rotation sözleşmeleri hazır; provider seçimi ve auth enablement yapılmadı).
- Staging RLS execution (altı DB rolü, 12 adversarial koşum ve public projection introspection kapısı hazır; gerçek PostgreSQL grant/view uygulanmadı).
- Staging observability (beş izole sink, sentetik PII redaction canary ve owner/runbook bağlı alert rotaları hazır; dış telemetry ve gerçek notification kapalı).
- Staging backup/restore (altı backup sınıfı, yedi restore/failover tatbikatı ve deletion-suppression güvenlik kapısı hazır; provider ve gerçek backup enablement yapılmadı).
- Staging API gateway (10 internal disabled route, beş replay/idempotency partition ve 14 negatif contract senaryosu hazır; route/store enablement kapalı).
- Staging supply chain (dokuz fail-closed CI işi, üç immutable artifact lane ve yedi kanıt sınıfı hazır; CI/registry/promotion enablement kapalı).
- Staging deployment isolation (public/partner/ops için üç ayrı boundary, dokuz host-isolation ve altı rollback senaryosu hazır; deployment/DNS/redirect kapalı).
- Staging privacy operations (dört intake kanalı, secure export sınırı ve dokuz çift-review tatbikatı hazır; gerçek başvuru/export/silme kapalı).
- Staging pentest (18 senaryolu bağımsız engagement, izole ortam ve rapor/retest gate hazır; gerçek pentest ve production security approval kapalı).
- Staging accessibility (dokuz cihaz/yardımcı teknoloji kombinasyonu, dokuz kritik yolculuk ve bağımsız finding/retest gate hazır; uygunluk iddiası kapalı).
- Staging content review (yedi public copy context'i, dört rol ayrımlı review matrisi ve güven dili regresyon corpus'u hazır; publication kapalı).
- Staging model validation (12 red-team senaryosu, altı fairness ekseni ve sentetik shadow eval gate hazır; live profiling/rollout/model release kapalı).
- Staging experiment governance (beş izole allocation yüzeyi, dokuz kill-switch tatbikatı ve PII-free audit export gate hazır; canlı deney/rollout kapalı).
- Staging feed sandbox (beş validate-only kanal, 16 sertifikasyon senaryosu ve 10 bin satırlık load/reconciliation gate hazır; gerçek feed/write kapalı).
- Staging taxonomy pilot (iki public kapsam katmanlı RC sınırı, yüzde 100 provenance/review gate ve altı rollback senaryosu hazır; dataset acquisition/release kapalı).
- Şehir ve araç eşleşme bildirimleri (81 şehirden en fazla beş hard filtre, ücretsiz seçili şehirler/haftalık ve Pro Türkiye geneli/anlık sınırı hazır; e-posta/ödeme kapalı).

Bu maddeler prototip eksikliği değil; kullanıcının production ve gerçek veri sınırları nedeniyle açık bırakılmış dış onay/yetki kapılarıdır.
