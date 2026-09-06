# Expiya İkinci El — Kalan iş ve teslim dalgaları v0.1

## Anlık durum

- İlk tasarım/mimari teslim tamamlandı.
- Sentetik MVP hazır; gerçek dış yan etki yetkisi yok.
- 25 launch domain'inde toplam 176 açık kontrol var.
- Staging 20, kontrollü pilot 23, production 25 domain ister.
- Hiçbir domain gerçek ortam ve bağımsız kanıtlarla henüz `ready` değildir.

Bu tablo “176 yeni özellik eksik” anlamına gelmez. Büyük bölümü provider/hukuk kararı, gerçek ortam entegrasyonu, tatbikat, bağımsız review veya pilot operasyon kanıtıdır.

## W1 — Karar ve dış bağımlılık kilitleme

Product, legal, data ve vendor governance kararları kapatılır. On ürün kararı imzalanır; hukuk/KVKK rolleri, retention, DPIA, sağlayıcı adayları ve veri aktarım sınırları onaylanır. Bu dalga tamamlanmadan altyapı seçimi kalıcılaştırılmaz.

## W2 — Staging foundation

Identity, PostgreSQL/RLS, ayrı partner deployment, API gateway, CI supply chain, observability ve backup altyapısı kurulur. Sentetik staging verisiyle tenant izolasyonu, rollback, idempotency, alert ve restore doğrulanır. Production veya gerçek firma verisi kullanılmaz.

## W3 — Entegrasyon ve bağımsız doğrulama

Privacy request akışları, pentest, erişilebilirlik matrisi, production copy review, model red-team/fairness/shadow eval, experiment kill-switch ve feed sandbox certification tamamlanır. Critical/high bulgu kapanmadan ilerlenmez.

## W4 — Kontrollü pilot hazırlığı

Lisanslı taxonomy pilot release'i, named ekip/vardiya, moderasyon ve incident tatbikatları, data-quality jobs ve sınırlı şehir/firma/stok kohortu hazırlanır. Gerçek pilot ancak ayrı GO kararı, sözleşme ve açık scope authorization ile başlayabilir.

## W5 — Production ölçek

Fiyatlandırma, ödeme/e-fatura/vergi/refund süreçleri ve ranking independence audit tamamlanır. WhatsApp/mesajlaşma, canlı video ve AI satış/pazarlık kabiliyetleri provider, hukuk, safety eval ve insan operasyonu kanıtlarından sonra ayrı ayrı açılır; birlikte veya otomatik açılmaz.

## Owner modeli

Primary owner grupları Product, Engineering, Security, Legal/Privacy, Operations, Data/AI ve Commercial'dır. Her workstream supporting owner ve çıkış kanıtı taşır. Plan, eksik kontrolleri kapatmaz ve production yetkisini değiştirmez.

## Önerilen bir sonraki yürütme sırası

1. Ürün sahibi karar oturumu: UC-PD-001..010.
2. Hukuk/KVKK processing ve belge çalışma oturumu.
3. Provider shortlist ve güvenlik/teknik değerlendirme.
4. Yetkilendirilmiş staging implementation planı ve environment kurulumu.
5. PostgreSQL/RLS + identity + partner app dikey dilimi.
6. Bağımsız test ve kontrollü pilot hazırlığı.

## Repository kapanış notu

Bu dalgaların repository içinde güvenle hazırlanabilecek sözleşme, sentetik test, fail-closed gate ve runbook kapsamı tamamlanmıştır. Güncel 176 açık kontrol, `externalBlockerRegister` ile owner ve çıkış kanıtına bağlanan gerçek ortam/karar/insan kanıtlarıdır. Ayrıntılı handoff `docs/expiya-used-cars-repository-completion-and-external-handoff-v0.1.md` belgesindedir.
