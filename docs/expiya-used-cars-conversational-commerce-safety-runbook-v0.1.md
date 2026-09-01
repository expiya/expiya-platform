# Expiya İkinci El — Conversational-commerce safety runbook v0.1

## Aşamalı aktivasyon

Kabiliyetler tek bayrakla açılmaz. C1 izinli mesajlaşma, C2 canlı araç videosu, C3 açıklayıcı AI asistan, C4 kontrollü teklif asistanı ayrı release ve kill-switch alanlarıdır. Bir üst aşama alt aşamayı otomatik yetkilendirmez. WhatsApp ve görüntülü görüşme sağlayıcısı değiştirilebilir adaptörlerdir; Expiya'nın rıza, tenant, retention ve audit sorumluluğu sağlayıcıya devredilmez.

## Kanal ve video

Her oturum kullanıcı rızası, belirli satıcı tenant/şubesi, araç, ilan revision'ı ve amaçla bağlanır. Telefon numarası kanal kasasında kalır; matching, analitik ve model prompt'una girmez. Provider oda/webhook kimlikleri opaque, tokenlar kısa ömürlü ve tek kullanımlıdır. Kayıt, transkripsiyon ve model eğitimi varsayılan kapalıdır.

Canlı tanıtım öncesi danışman yetkisi ve stok güncelliği doğrulanır. VIN, plaka, ruhsat, kimlik ve üçüncü kişi yüzlerinin gösterilmemesi için uyarı verilir. Görüşme bağımsız ekspertiz, kilometre/hasar garantisi veya araç doğrulaması değildir.

## AI temsil ve teklif sınırı

Asistan her konuşmada AI olduğunu ve hangi kurumsal satıcı adına konuştuğunu açıklar. Yalnız public listing projection, alan bazlı evidence durumu ve sürümlü satıcı mandate'i kullanılabilir. Prompt içeriği policy, tenant veya araç bağlamını değiştiremez.

Deterministik policy engine izinli teklif aralığını üretir; dil modeli yalnız sonucu açıklar. Gizli fiyat tabanı modele veya kullanıcıya açıklanmaz. Bağlayıcı satış, ödeme/kapora, finansman onayı, kesin araç garantisi ve “al/alma” talimatı yasaktır. Zarf dışı teklif, belirsizlik, kanıt çelişkisi, ödeme/sözleşme veya kullanıcı isteği human handoff doğurur.

## Audit, retention ve güvenlik

Disclosure, consent, tool çağrısı, kullanılan listing/evidence revision, teklif sonucu, refusal ve handoff olayları redakte audit şemasına yazılır. Ham konuşmalar varsayılan analitik/eğitim verisi değildir. Retention kanal/amaç bazlıdır; rıza geri çekilince yeni iletişim durur, yasal saklama ve silme kuyruğu ayrı işler.

Kill switch tenant, kanal, provider, model, stok ve ülke seviyesinde çalışmalıdır. Cross-tenant içerik, gizli fiyat sızıntısı, yetkisiz teklif, disclosure kaybı veya ödeme yönlendirmesi acil durdurma nedenidir.

## Production öncesi eval

- Türkçe disclosure ve human handoff anlaşılabilirliği.
- Satıcı beyanı ile Expiya doğrulamasını karıştırmama.
- Prompt injection, cross-tenant exfiltration ve tool escalation.
- Fiyat tutarlılığı, ayrımcılık ve korumalı özelliklerden etkilenmeme.
- Yanlış garanti, baskı/kıtlık, taciz ve off-platform ödeme reddi.
- Provider outage, webhook replay, kayıt rızası ve kill-switch tatbikatı.

Provider adaptörleri mesajlaşma, canlı video ve AI modeli için ayrıdır; opaque kimlik, kısa ömürlü tek kullanımlık token, imzalı/timestamp'li webhook ve replay koruması ister. Provider kodu, DPA, veri konumu ve production bayrağı bugünkü bootstrap'ta boş/kapalıdır.

Sertifikasyon 17 sentetik senaryoyu kapsar ve her birinde sıfır unsafe tool-call, sıfır cross-tenant disclosure, başarılı insan devri, en az iki reviewer, checksum'lı kanıt ve kapalı bulgu ister. Pazarlık fairness denetimi kohort başına en az 100 teklif, aynı girdide en az yüzde 99 tutarlılık, kohort farkında en fazla yüzde 1 ve korumalı özellik kullanımında sıfır tolerans uygular.

Kill switch tenant, kanal, provider, model, stok ve ülke olmak üzere altı kapsamda prova edilir. Aktif oturumlar ve yeni tool-call'lar kapanır, bekleyen teklifler geçersizleşir, audit korunur ve insan fallback'i gösterilir. Otomatik restart yasaktır.

## Açık kapılar

Kanal/video sağlayıcı seçimi ve DPA, KVKK/tüketici hukuku onayı, AI safety eval'leri, pazarlık fairness audit'i, insan operasyon kadrosu ve kill-switch tatbikatı tamamlanmadı. `realChannelMessageAuthorized`, `liveVideoAuthorized`, `aiSellerAgentAuthorized` ve `aiNegotiationAuthorized` sabit `false` kalır. Bu paket gerçek mesaj, çağrı, teklif, sözleşme veya ödeme yetkisi değildir.
