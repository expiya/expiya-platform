# Expiya Cars Motor V3 değerlendirmeleri

Bu klasördeki Aşama 1 paketi Motor V3'ü HTTP kullanmadan, production'a yakın
`runStoredV31Turn -> runV3Turn` zinciri üzerinden değerlendirir.

## Çalıştırma

```bash
npm run cars:eval:deterministic
npm run cars:eval:smoke
```

İki komut da gerçek OpenAI çağrılarını kapatır. `cars:eval:deterministic` ortak
journey sözleşmesini Vitest ile, `cars:eval:smoke` ise aynı otuz yolculuğu Promptfoo
raporlamasıyla çalıştırır. Yerel Next.js sunucusunun açık olması gerekmez.

Son Promptfoo JSON raporu `evals/cars-v3/results/smoke.json` altında oluşur.
Bu dosya çalışma çıktısıdır ve Git'e eklenmez.

## Aşama 2: HTTP sözleşmesi

```bash
npm run cars:eval:http
```

Bu komut yalnız test süresince rastgele boş bir localhost portunda izole HTTP
sunucusu açar ve gerçek `/api/cars/conversation/v3` route handler'ını 10 sözleşme
vakasıyla çağırır. Motor V3 OpenAI provider'ı hem sunucuda hem Promptfoo'da
kapalıdır. İşlem bitince test sunucusu otomatik kapanır. Normal `npm run dev`
sunucusunu başlatmanız veya durdurmanız gerekmez. Sonuç
`results/http-smoke.json` dosyasına yazılır.

## İzolasyon

- Her yolculuk benzersiz bir `conversationId` kullanır.
- Her vaka öncesi ve sonrası conversation ve offer store sıfırlanır.
- Promptfoo tek concurrency ile çalışır; process-local store'lar yarışmaz.
- Pilot arşivleme ve production veritabanı yazımları çağrılmaz.
- Production katalog dosyaları yalnız okunur.
