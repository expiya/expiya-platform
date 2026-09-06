# Expiya İkinci El — Staging privacy operations bootstrap v0.1

## Başvuru kanalları

Web formu, kayıtlı e-posta, posta ve yüz yüze başvuru dört ayrı intake sınıfıdır. Her kanal alındı teyidi, malware taraması ve gereksiz kimlik belgesi saklamama politikasına tabidir. Endpoint ve owner queue referansları hukuk/operasyon onayı öncesinde boş kalır.

## Güvenli export teslimi

Export üçüncü kişi redaksiyonu, encryption, step-up authentication, tek kullanımlık token ve en fazla 30 dakikalık TTL ister. Ham audit ve güvenlik iç mantığı dışarı verilmez. Storage/KMS referansları ve download kapalıdır.

## Sentetik tatbikat matrisi

Dokuz senaryo hesapsız lead erişimi, yetkisiz temsilci, cross-tenant scope saldırısı, redakte encrypted export, token expiry, lead deletion zinciri, dar legal hold, SLA escalation ve alıcı bildirimi kapsamındadır. Kanıtlar ham PII içermez; privacy ve security reviewer ayrıdır.

## Güncel durum

Kanal, teslim ve tatbikat sözleşmeleri hazırdır. Hukuk onayı, gerçek kanal, ekip/queue, identity verification, storage/KMS, gerçek export/silme veya alıcı bildirimi bulunmaz. Gerçek başvuru işleme, kişisel veri export ve mutation yetkileri kapalıdır.
