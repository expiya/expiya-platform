# Expiya İkinci El — Pilot operasyon kapasitesi ve olay tatbikatları v0.1

## Amaç ve sınır

Kontrollü pilot; şehir, firma ve stok adediyle sınırlandırılır. Bu paket gerçek personel atamaz, satıcı açmaz ve production aksiyonu yetkilendirmez. Moderasyon ve destek kapasitesinin ölçülebilir girişlerle değerlendirilmesini, kritik olayların sentetik ortamda kanıtlı biçimde prova edilmesini tanımlar.

## Kapasite kapısı

Her pilot dalgasında aktif firma/stok, günlük beklenen ilan gönderimi ve lead hacmi kaydedilir. Moderasyon ve destek kapasitesi, hem en az yüzde 20 dolandırıcılık/inceleme rezervini hem en az yüzde 20 devamsızlık rezervini taşımalıdır. Moderasyon kuyruğu hedefi en fazla 24 saat, kullanıcı talebi destek kuyruğu hedefi en fazla 8 saattir. Bu sınırlar aşılırsa yeni firma ve stok kabulü durur; organik sıralama veya güven kontrolleri gevşetilmez.

## Zorunlu tatbikatlar

Cross-tenant erişim, hesap ele geçirme, zararlı belge, yanlış doğrulama, satıcı itirazı, moderasyon kuyruğu taşması, satılmış/bayat stok ve acil pilot durdurma senaryoları zorunludur. Her tatbikat en az iki farklı katılımcı, tamamlanma zamanı, SHA-256 kanıtı, başarılı sonuç ve kapatılmış bulgular ister. Acil durdurma tatbikatında stop authority gerçekten uygulanmış olmalıdır.

## Fail-closed sonucu

İsimlendirilmiş görevler, güncel eğitim/sertifika, vardiya ve yedekler, görev ayrılığı, SLA, escalation directory ve bütün tatbikat kanıtları tamamlanmadan pilot operasyon, moderasyon aksiyonu ve support contact production yetkileri `false` kalır. Kapasite hesabının yeşil olması tek başına launch izni değildir.
