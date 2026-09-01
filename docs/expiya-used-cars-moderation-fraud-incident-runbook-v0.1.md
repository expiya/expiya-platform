# Expiya İkinci El — Moderasyon, fraud ve incident runbook v0.1

## Operasyon modeli

Risk dedektörleri hüküm değil sinyal üretir. Standart, öncelikli ve incident-response kuyrukları ayrıdır; fraud sonucu insan incelemesi olmadan kesinleşmez. Moderatör yalnız atanmış vaka, subject revision ve süreli evidence snapshot üzerinde çalışır. Ham lead erişimi ve tenant impersonation yasaktır.

Yüksek etkili kararlar — dealer/ilan askıya alma, fraud teyidi, klasik yüksek riskli iddia veya itiraz reddi — bağımsız ikinci inceleme ister. İlk karar veren ikinci reviewer olamaz. Her karar reason code, evidence checksum, actor, zaman ve revision ile audit zincirine yazılır.

## Karantina

Kritik sinyalde ilan fail-closed kaldırılır; medya URL’leri ve lead aktarımı durdurulur, revision dondurulur, audit/kanıt korunur. Bu işlem kişisel veriyi otomatik silmez. Karantinadan çıkış yalnız çözülmüş çelişki, kapanmış vaka, bağımsız ikinci onay, güncel stok teyidi ve yeni moderation revision ile mümkündür.

## Incident akışı

1. Olay kaydı açılır, severity atanır ve incident commander belirlenir.
2. SEV1 için 15 dakika, SEV2 için 60 dakika containment hedeflenir.
3. Etkilenen session, servis hesabı, public projection, medya ve handoff en dar kapsamda kapatılır.
4. Log/audit/evidence legal hold altında korunur; log redaction sürer.
5. Etki, tenant sınırı, PII/KVKK ve kullanıcı güvenliği incelenir.
6. Kullanıcı, firma, otorite veya kurul bildirimi yalnız hukuk/KVKK kararıyla ve kayıtlı mesajla yapılır; otomatik bildirim yoktur.
7. Recovery sonrası yeni revision/release, ikinci onay ve yoğun izleme gerekir.
8. Post-incident review aksiyonları sahibi ve son tarihiyle kapatılır.

## Zorunlu masa başı tatbikatlar

- Cross-tenant VIN/lead erişimi: SEV1 izolasyon, session ve RLS doğrulama.
- Dealer account takeover: credential/session rotasyonu ve stok karantinası.
- Malware içeren ekspertiz belgesi: medya quarantine, URL revoke ve tarama zinciri.
- Satıcı beyanının yanlışlıkla “Expiya doğruladı” gösterilmesi: projection rollback ve kullanıcı iletişimi.
- Dealer itirazı: delil snapshot, ayrı reviewer ve karar audit’i.

Tatbikat her altı ayda ve büyük auth/RLS/media değişikliğinden sonra tekrarlanır. Süre, karar doğruluğu, eksik audit, fazla veri erişimi ve recovery başarısı ölçülür.

## Açık kapılar

On-call/personel ataması, moderatör eğitimi, gerçek tatbikatlar, hukuk bildirim süreci, güvenlik araç entegrasyonu ve bağımsız review tamamlanmadı. `moderationProductionActionsAuthorized` sabit `false` kalır. Bu belge gerçek hesap askıya alma, veri silme, dış bildirim veya production müdahalesi yetkisi vermez.
