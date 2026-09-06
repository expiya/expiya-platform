# Expiya İkinci El — Model yönetişimi ve eval runbook v0.1

## Amaç ve sınır

Bu runbook, ikinci el eşleştirme ve açıklama kabiliyetlerinin güvenli sürüm kapısını tanımlar. Sıfır araç Motor V3 veya preference ledger bu değerlendirme kapsamına girmez. Sentetik eval başarısı production model yayını, canlı kullanıcı profilleme ya da otomatik rollout yetkisi vermez.

## Zorunlu eval sınıfları

1. Sert bütçe, model yılı, kilometre ve risk sınırlarının sessizce gevşetilmemesi.
2. Satıcı beyanı, doğrulanmamış belge, eksik, çelişkili ve süresi geçmiş bilginin doğru etiketlenmesi.
3. “Kesin al/alma”, hasarsızlık veya kilometre garantisi ve kaynaksız fiyat iddiasının reddi.
4. AI satış asistanının mandate dışı ödeme, bağlayıcı satış ve pazarlık eylemlerinde durup insana aktarması.
5. Korunan özelliklerin veya bunların proxy'lerinin karar girdisi olmaması.
6. Klasik araç iddialarında uzman/kanıt sınırının korunması.

İlk paket yalnız sentetik fixture kullanır. Gerçek konuşma veya lead verisi ancak KVKK amacı, saklama süresi, erişim yetkisi, anonimleştirme ve hukuk onayı kaydedildikten sonra ayrı bir veri setine alınabilir.

## Release kapısı

- Sert kısıt doğruluğu: `%100`
- Kanıta bağlı açıklama doğruluğu: en az `%98`
- Zorunlu human-handoff recall: en az `%95`
- Önceden tanımlı karşılaştırma kohortları arası azami kalite farkı: `%5`
- Kritik politika ihlali: `0`
- Eval suite checksum, model/policy/taxonomy sürümleri ve rollback release kimliği zorunlu
- Bağımsız fairness review, red-team ve production shadow eval zorunlu
- Named human approver olmadan rollout yok; otomatik rollout kapalı

## Drift ve olay yönetimi

Canary/shadow ölçümleri onaylı baseline ile karşılaştırılır. Grounding veya handoff metriğinde iki puandan fazla mutlak düşüş, eşik ihlali, yeni kohort farkı ya da tek kritik ihlal release durdurma nedenidir. İlgili model/prompt/policy sürümü dondurulur, güvenli önceki sürüme rollback yapılır, olay ve etkilenen karar kimlikleri redacted audit kaydına yazılır. Kullanıcıya açık yanlış iddia varsa hukuk, moderasyon ve incident ekipleri birlikte değerlendirme yapar.

## Değişiklik yönetimi

Model, prompt, policy, taxonomy veya feature set değişikliği yeni manifest ve tam regresyon koşumu gerektirir. Bilinmeyen feature fail-closed reddedilir. Ücretli üyelik, reklam veya sponsorlu statü organik eşleştirme girdisi olamaz. Eval sonucu manipüle edilemez; failed koşum silinmez, supersede ilişkisiyle saklanır.

## Mevcut karar

Sentetik senaryolar, protected-feature yasağı ve grounding'e ek olarak 12 red-team senaryosu, altı fairness ekseni ve shadow eval gate staging bootstrap sözleşmesi olarak hazırdır. Onaylı değerlendirme veri seti, bağımsız fairness koşumu, AI provider onayı, gerçek red-team, production shadow eval ve monitoring baseline eksiktir. Bu nedenle `MODEL_GOVERNANCE` staging, pilot ve production için `NO-GO` durumundadır. Ayrıntılı staging sınırı `docs/expiya-used-cars-staging-model-validation-bootstrap-v0.1.md` içindedir.
