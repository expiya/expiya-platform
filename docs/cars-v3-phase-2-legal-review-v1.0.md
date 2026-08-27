# Expiya Cars Aşama 2 — bounded hukuk ve kullanıcı metni incelemesi

Tarih: 28 Ağustos 2026
İnceleme sürümü: `PHASE2-LEGAL-REVIEW-v1.0`
Disposition: `CONDITIONALLY_IMPLEMENTED_FAIL_CLOSED`

> [DIŞ HUKUK DANIŞMANI İNCELEMESİ BEKLENİYOR] Bu çalışma teknik ve sınırlı iç hukuk değerlendirmesidir; nihai dış hukuk görüşü değildir.

## Uygulanan sınırlar

- Aşama 2, Aşama 1 seçimini değiştirmeyen ve yalnız reveal edilmiş exact varyantı açıklayan karar desteği olarak tanımlandı.
- Tavsiye; bağlayıcı teklif, sipariş, rezervasyon, garanti, ekspertiz veya satın alma taahhüdünden ayrıldı.
- Exact, family-level, representative ve approximate kapsamlar açıklandı; unknown, conflict ve silent absence için `NO_CLAIM` korundu.
- Fiyatın kaynak tarihi/koşullarıyla sınırlı olduğu; stok, kampanya, konfigürasyon ve teslimatın yetkili satıcıdan doğrulanacağı belirtildi.
- Görsel/video kapsam etiketi ve üçüncü taraf bağlantısının ortaklık/onay anlamına gelmediği açıklandı.
- Aşama 3 CTA'ları yalnız süreli handoff hazırlar; başvuru, rezervasyon, teklif, bayi aktarımı veya ticari ileti izni oluşturmaz.
- Sahte kıtlık, yapay aciliyet ve doğrulanmamış üstünlük iddiaları yasaklandı.
- Aşama 2 geçmişi conversation + offer + exact variant ile sınırlandı; 12 kısa mesaj ve handoff expiry üst sınırı uygulandı.
- OpenAI semantik planlayıcısı `CARS_PHASE2_CROSS_BORDER_TRANSFER_READY=true` olmadığı sürece fail-closed kapalıdır. Bu durumda deterministik yerel çözümleyici çalışır.

## Hukuki dayanak ve resmî kaynaklar

- KVKK Aydınlatma Tebliği m.4-5; veri sorumlusu kimliği, amaç, alıcı grubu, toplama yöntemi/hukuki sebep ve ilgili kişi haklarının açıkça bildirilmesini; amaçların belirli, açık ve meşru olmasını ve aydınlatma ile açık rızanın ayrılmasını gerektirir: https://www.kvkk.gov.tr/Icerik/4132/aydinlatma-yukumlulugunun-yerine-getirilmesinde-uyulacak-usul-ve-esaslar-hakkinda-teblig
- KVKK'nın yurt dışına aktarım rehberi ve güncel madde 9 mekanizmaları: https://www.kvkk.gov.tr/Icerik/8143/Kisisel-Verilerin-Yurt-Disina-Aktarilmasi-Rehberi ve https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim
- Ticaret Bakanlığı'nın 1 Ağustos 2026'da yürürlüğe giren değişikliklere ilişkin açıklaması; hedefli reklam şeffaflığı, yapay zekâ ile oluşturulan reklamlar ve aldatıcı ticari uygulama sınırları: https://www.ticaret.gov.tr/haberler/aldaticici-reklam-ve-haksiz-ticari-uygulamalarla-mucadelede-yeni-donem-basliyor

## Kalan zorunlu blocker'lar

1. `BLOCKED_OPENAI_TRANSFER_MECHANISM`: OpenAI sözleşme sahibi, veri işleyen/alt işleyen listesi, işleme bölgesi ve KVKK m.9 aktarım mekanizması belgelenmeden Aşama 2 model planlayıcısı etkinleştirilemez.
2. `BLOCKED_HOSTING_LOG_RETENTION`: Vercel bölgesi ve log süresi ile altyapı sağlayıcılarının sözleşmesel saklama ayarları doğrulanmalıdır.
3. `BLOCKED_PILOT_ARCHIVE_RETENTION`: Kimlik doğrulanmış pilot transcript arşivinin kesin saklama ve periyodik imha süresi belirlenmelidir.
4. `BLOCKED_MEDIA_RIGHTS_PER_ASSET`: Her temsilî görsel ve video için lisans/izin, atıf ve exact/family kapsam kaydı doğrulanmalıdır.
5. `BLOCKED_COMPANY_CONTACT_COMPLETENESS`: Telefon, KEP ve alternatif KVKK yazılı başvuru kanalı tamamlanmalıdır.

Bu blocker'lar nedeniyle dış sağlayıcı aktarımı ve üçüncü kişiye veri ileten Aşama 3 işlemleri fail-closed kalmalıdır. Aşama 2'nin kanıtla sınırlı, deterministik ve dış işlem üretmeyen temel açıklama işlevi bu sınırlar içinde çalışabilir.
