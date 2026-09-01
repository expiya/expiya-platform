# Expiya İkinci El — Hukuk, sözleşme ve kabul yönetişimi runbook v0.1

## Zorunlu belge seti

B2C koşullar ve aydınlatma, kurumsal üyelik sözleşmesi, dealer DPA, lead aktarım açıklaması, iletişim rızası, video bildirimi, AI asistan açıklaması, sponsorluk koşulları, taxonomy veri lisansı, provider DPA ve cookie bildirimi ayrı sürümlü belgelerdir. Bir belgenin onayı diğerinin yerine geçmez.

## Aktivasyon kriterleri

Aktif belge; içerik checksum'u, sürüm, `tr-TR` locale, hukuk onayı, yürürlük tarihi ve gerekiyorsa sona erme/supersede ilişkisi taşır. Draft, süresi geçmiş, henüz yürürlüğe girmemiş veya checksum'u olmayan metin kullanılamaz. Bu registry gerçek bir hukuk onayı üretmez.

## Kabul kanıtı

Kabul kaydı belge kimliği/sürümü/checksum'u, ilgili kişi veya firma referansı, amaç, yöntem, locale ve zamanı taşır. Serbest veya belirsiz “tüm koşulları kabul” kaydı farklı amaçları birleştiremez. Pazarlama, araç özelindeki iletişim ve video kaydı ayrı seçimlerdir.

İçerik değişirse değişiklik önem sınıfı değerlendirilir. Yeni amaç, alıcı, veri sınıfı veya maddi koşul yeniden kabul gerektirir. Eski kabul yeni metne otomatik taşınmaz; önceki receipt audit kanıtı olarak korunur.

## Fail-closed etkiler

- Aktif üyelik sözleşmesi yoksa firma publishing-eligible olamaz.
- Lead açıklaması ve amaç bazlı receipt yoksa lead aktarılamaz.
- Kanal/video/AI bildirimi ve gerekli consent yoksa ilgili kabiliyet açılmaz.
- Veri lisansı yoksa taxonomy kaynağı release'e giremez.
- Provider DPA yoksa gerçek veri provider'a gönderilemez.

## Güncel durum

On iki belge sınıfı ile sürüm, kabul ve yeniden kabul sözleşmeleri hazırdır. Metinler draft durumundadır; hukuk onayı, checksum, yürürlük ve gerçek acceptance testi yoktur. `LEGAL_GOVERNANCE` staging, pilot ve production için `NO-GO`; metin yayını, sözleşme aktivasyonu ve gerçek rıza toplama yetkileri kapalıdır.
