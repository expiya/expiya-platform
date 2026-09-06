# Expiya İkinci El — Tedarikçi ve provider yönetişimi runbook v0.1

## Kapsam

Identity, database, object storage, malware scanning, KMS, e-posta/SMS, mesajlaşma kanalı, canlı video, ödeme/faturalama, observability/SIEM, AI inference ve backup/recovery ayrı provider kabiliyetleridir. Bir sağlayıcının bir kabiliyette onaylanması diğer kabiliyetlere veya veri sınıflarına yetki vermez.

## Zorunlu değerlendirme

Her aday için en az şu kayıtlar tamamlanır:

- DPA ve KVKK veri sorumlusu/veri işleyen rolü
- İşleme ve yedekleme bölgeleri
- Yurt dışı aktarım mekanizması ve hukuk onayı
- Alt işleyen listesi ve değişiklik bildirimi
- İhlal bildirim SLA'sı
- Silme/retention doğrulaması
- Veri dışa aktarma ve çıkış testi
- Güvenlik, hukuk ve ticari inceleme
- Kabiliyete özel teknik kontroller

Eksik değerlendirme fail-closed sonuç üretir. Aday kaydı veri aktarımı, sözleşme imzası veya production adapter aktivasyonu değildir.

## Veri minimizasyonu

VIN/plaka gibi yüksek riskli kimlikler yalnız zorunlu adapter'a maskeli veya fingerprint formunda gönderilir. Observability akışına lead içeriği, serbest metin, VIN, plaka, belge veya erişim token'ı gönderilmez. AI sağlayıcısında eğitim için yeniden kullanım kapalı, model sürümü denetlenebilir ve gönderilen bağlam amaçla sınırlı olmalıdır.

## Kesinti ve çıkış

Identity, database, storage, scanner, KMS ve payment kesintisinde ilgili yazma/yayınlama işlemleri fail-closed kapanır. Mesaj, telemetry ve bazı bildirimler yalnız sınırlandırılmış kuyrukta tutulabilir. AI ve backup kesintisi güvenli read-only/degraded moda geçebilir; karar veya doğruluk uydurulamaz.

Provider değişikliğinde export bütünlüğü, silme kanıtı, anahtar rotasyonu, webhook iptali, DNS/secret temizliği ve rollback tatbikatı tamamlanır. Eski provider erişimi audit kanıtı olmadan açık bırakılamaz.

## Güncel durum

On iki capability için gereksinim registry'si hazırdır. Gerçek aday envanteri, DPA/KVKK rolleri, işleme bölgeleri, aktarım mekanizması, alt işleyen incelemesi, çıkış/silme testleri ve üçlü onay tamamlanmadığı için `VENDOR_GOVERNANCE` staging, pilot ve production için `NO-GO` durumundadır. Hiçbir provider seçilmemiş ve gerçek veri aktarımı yetkilendirilmemiştir.
