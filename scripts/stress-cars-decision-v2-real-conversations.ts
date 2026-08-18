import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";

import { getOpenAIClient } from "../lib/openai";
import { createCarsDecisionV2ProductionComposition } from "../features/decision/v2/composition/production.server";
import { InMemoryGovernedOfferStore } from "../features/decision/v2/offer/store";
import { createHmacOfferSigner } from "../features/decision/v2/offer/signer.server";
import { InMemoryV2ConversationStore } from "../features/decision/v2/orchestrator/store";
import { runCarsDecisionTurnV2 } from "../features/decision/v2/orchestrator/runCarsDecisionTurnV2";
import { validatePublicDecisionTurnOutput } from "../features/decision/v2/orchestrator/publicOutput";
import { createOpenAIStructuredProviderTransport, readCarsDecisionV2ProviderConfig } from "../features/decision/v2/provider/openaiTransport.server";
import { createStructuredProviderAdapters, type StructuredProviderTransport } from "../features/decision/v2/provider/structuredProvider";

type Journey = { readonly id: string; readonly messages: readonly string[] };
type Trace = Readonly<Record<string, unknown>>;

const journeys: readonly Journey[] = [
  { id: "typo-01", messages: ["slm araba alcam ama hiç bişi bilmiyom", "şeihr içi kullancam otomatik olsun"] },
  { id: "typo-02", messages: ["elektirikli bi suv bakıom 2m civarı", "sarjda ömür çürümesin ama"] },
  { id: "typo-03", messages: ["aile içn genis bagajlı bişi lazım", "7 kşi değiliz ya 4 kişiyiz"] },
  { id: "typo-04", messages: ["köye gidip gelcem yolar pert", "4 çeker olsa ii olur dizel de olabilir"] },
  { id: "typo-05", messages: ["sedn benzn otmatk 3m max", "ama çok ruhsuz olmasın be"] },
  { id: "typo-06", messages: ["ilk arabm olcak park edemem die korkuom", "ufak ama ezik durmasın"] },
  { id: "typo-07", messages: ["uzn yolda basınca gitsin istiom", "0 100 kaç olmalı bilmiyom sen anla"] },
  { id: "typo-08", messages: ["eşime süpriz araba alıcam", "günlük işe gidip gelcek şık bişi"] },
  { id: "typo-09", messages: ["ticari lazm koli dagıtıoz", "cady gibi ama kocaman olmasın"] },
  { id: "typo-10", messages: ["hibirt mi benzin mi bilemedm", "az yaksın ama fişe takmayalım"] },

  { id: "short-01", messages: ["araba", "günlük"] },
  { id: "short-02", messages: ["ilk", "şehir"] },
  { id: "short-03", messages: ["eşime", "hediye"] },
  { id: "short-04", messages: ["köy", "çamur"] },
  { id: "short-05", messages: ["iş için", "koli"] },
  { id: "short-06", messages: ["hızlı", "otoyol"] },
  { id: "short-07", messages: ["ucuz", "satın alırken"] },
  { id: "short-08", messages: ["premium", "gösterişsiz"] },
  { id: "short-09", messages: ["clio", "olabilir"] },
  { id: "short-10", messages: ["bilmiyorum", "sen sor"] },

  { id: "jargon-01", messages: ["5 kapı, eli yüzü düzgün bi araba bakıyorum", "şehir içi, hanım da kullanacak"] },
  { id: "jargon-02", messages: ["az yakan çok kaçan bi şey var mı", "şaka bi yana otoyolda üzmesin"] },
  { id: "jargon-03", messages: ["teneke hissi vermesin, tok dursun", "aile sedanı olabilir"] },
  { id: "jargon-04", messages: ["yerden yüksek olsun altını vurmayalım", "köy yolu var ama offroad yapmam"] },
  { id: "jargon-05", messages: ["makas atmalık değil ama diri olsun", "günlük kullanacağım benzinli"] },
  { id: "jargon-06", messages: ["baba arabası gibi olmasın", "4 kişiyiz yine de bagaj lazım"] },
  { id: "jargon-07", messages: ["piyasası olan araba istiyorum", "ama bunu kazanan seçmek için kullanma, sadece ne demek onu sor"] },
  { id: "jargon-08", messages: ["full paket olsun deniyor ya o ne", "ben aslında güvenlik donanımı istiyorum"] },
  { id: "jargon-09", messages: ["ara hızlanması iyi olsun", "0-100 takıntım yok uzun yol sollama için"] },
  { id: "jargon-10", messages: ["şehirde kıvrak, yolda oturaklı olsun", "hatchback de suv da olabilir"] },

  { id: "correction-01", messages: ["SUV istiyorum", "yok yok sedan diyecektim"] },
  { id: "correction-02", messages: ["elektrikli olsun", "vazgeçtim tam hibrit, şarjla uğraşamam"] },
  { id: "correction-03", messages: ["bütçe 2 milyon", "3 yapalım ama son kuruş 3"] },
  { id: "correction-04", messages: ["otomatik şart", "manuel de olur aslında fark etmez"] },
  { id: "correction-05", messages: ["pickup istiyorum", "açık kasa gereksizmiş kapalı ticari olsun"] },
  { id: "correction-06", messages: ["7 koltuk kesin", "çocuklar gelmeyecekmiş 5 yeter"] },
  { id: "correction-07", messages: ["prestij önemli", "boşver gösterişi en mantıklısı olsun"] },
  { id: "correction-08", messages: ["dizel", "benzin veya hibrit de olur dizeli sil"] },
  { id: "correction-09", messages: ["Clio alacağım", "Clio'ya kilitlenmeyelim alternatif de bak"] },
  { id: "correction-10", messages: ["bütçe önemli değil", "dur ya 4 milyonu aşmasın"] },

  { id: "budget-01", messages: ["1 milyonum var araba istiyorum", "kredi yok kesin tavan bu"] },
  { id: "budget-02", messages: ["2m nakit var gerisi kredi olur", "toplam tavan söylemedim daha"] },
  { id: "budget-03", messages: ["ucuz bi şey olsun", "ucuz derken satın alma fiyatı"] },
  { id: "budget-04", messages: ["ekonomik olsun", "yakıt ve kullanım masrafını diyorum"] },
  { id: "budget-05", messages: ["bütçe mühim değil", "ama Rolls falan da getirme mantıklı ol"] },
  { id: "budget-06", messages: ["1.5 milyon max elektrikli suv", "yoksa açıkça yok de bütçeyi delme"] },
  { id: "budget-07", messages: ["3 milyon civarı", "biraz üstü dediğim yüzde beş on gibi"] },
  { id: "budget-08", messages: ["param yettiği kadar premium", "önce ihtiyacımı çöz sonra fiyatı konuş"] },
  { id: "budget-09", messages: ["fiyatı belli olmayanları da kaybetme", "ama tahmini rakamı bana söyleme"] },
  { id: "budget-10", messages: ["en ucuz yüzde yirmilik gruptan olsun", "sedan otomatik benzinli"] },

  { id: "technical-01", messages: ["kW ne hacı hiç anlamıyorum", "beygir gibi günlük anlat"] },
  { id: "technical-02", messages: ["400 litre bagaj ne alır", "bebek arabası iki bavul mesela"] },
  { id: "technical-03", messages: ["L yüz km olayı nedir", "az orta çok diye anlat sayı sorma"] },
  { id: "technical-04", messages: ["awd fwd rwd bunlar büyü mü", "karda hangisi işime yarar"] },
  { id: "technical-05", messages: ["mhev hev phev çorba oldu", "fişe takmadan hangisi gidiyor"] },
  { id: "technical-06", messages: ["menzil 500 yazıyor gerçekten 500 mü", "uzun yol düşünüyorum"] },
  { id: "technical-07", messages: ["dc şarj kaç dakika iyi sayılır", "kahve molası örneğiyle anlat"] },
  { id: "technical-08", messages: ["torku yüksek ne demek", "sollamada mı rampada mı hissederim"] },
  { id: "technical-09", messages: ["0-100 3.5 istiyorum", "günlük kullanacağım maliyet umrumda değil"] },
  { id: "technical-10", messages: ["payload ne ya", "arkaya yük koyacağım ticari bakıyorum"] },

  { id: "social-01", messages: ["selam kral nasılsın", "iyiyim ben de araba bakıcaz bugün"] },
  { id: "social-02", messages: ["ilk arabam olacak heyecan yaptım :) ", "şehir içinde sürücem"] },
  { id: "social-03", messages: ["eşime hediye alıyorum evlilik yıldönümü", "şık ve kolay kullanılan olsun"] },
  { id: "social-04", messages: ["babalık zor iş oğlana araba bakıyoruz", "ilk araç şehir içi otomatik"] },
  { id: "social-05", messages: ["bugün moralim bozuk beni uğraştırma", "hızlıca aile suv bakalım"] },
  { id: "social-06", messages: ["önce bi kahve söyle de konuşalım", "şaka şaka araba işine dönelim"] },
  { id: "social-07", messages: ["maçı kim alır sence", "neyse boşver sedan arıyordum"] },
  { id: "social-08", messages: ["çok tatlı konuşuyormuşsun doğru mu", "hadi görelim ilk arabamı seçelim"] },
  { id: "social-09", messages: ["sana güveniyorum beni rezil etme :) ", "arkadaşlara havalı dursun ama abartmasın"] },
  { id: "social-10", messages: ["orda mısın acil", "işe gidip gelmek için araç lazım"] },

  { id: "rough-01", messages: ["lan bi araba sorcaz cevap ver", "köy yolu 4x4 pickup dizel"] },
  { id: "rough-02", messages: ["bu teknik soruları salak gibi bilmiyorum", "beni küçümsemeden günlük anlat"] },
  { id: "rough-03", messages: ["saçmalama elektrik demedim hibrit dedim", "hibrit tercihim geçerli devam et"] },
  { id: "rough-04", messages: ["yine aynı soruyu sorarsan kızarım", "şehir içi dedim zaten"] },
  { id: "rough-05", messages: ["hadi be çok uzattın araba öner", "önceki tercihlerimle devam"] },
  { id: "rough-06", messages: ["defol", "tamam sinirlendim arabaya dönelim"] },
  { id: "rough-07", messages: ["sen beni anlamıyon galiba", "aile için geniş sedan diyorum"] },
  { id: "rough-08", messages: ["bu da soru mu tabi 4 koltuk lazım", "kalabalık değiliz dört kişiyiz"] },
  { id: "rough-09", messages: ["boş yapma net konuş", "3 milyon otomatik hatchback"] },
  { id: "rough-10", messages: ["aq göster artık", "öneri hazırsa paylaş"] },

  { id: "models-01", messages: ["Clio mu Civic mi", "şehir içi otomatik hangisi mantıklı"] },
  { id: "models-02", messages: ["BMW olabilir mi", "aile için geniş sedan istiyorum 5m"] },
  { id: "models-03", messages: ["Micra sıfırı var mı", "yoksa küçük otomatik alternatif bul"] },
  { id: "models-04", messages: ["Caddy tarzı lazım ama Caddy şart değil", "şehir içi koli dağıtımı"] },
  { id: "models-05", messages: ["Model Y mi Ioniq 5 mi", "uzun yol şarj önemli"] },
  { id: "models-06", messages: ["Egea istemiyorum", "aynı ihtiyaca başka sedan bak"] },
  { id: "models-07", messages: ["208 önerme bana", "daha zarif küçük hatchback istiyorum"] },
  { id: "models-08", messages: ["Duster gibi ama daha şehirli", "bozuk yola da girecek"] },
  { id: "models-09", messages: ["Hilux mu Ranger mı", "yük yok köy yolu için düşünüyorum"] },
  { id: "models-10", messages: ["Mercedes C ile BMW 3 arasında kaldım", "stereotip anlatma aile kullanımıma bak"] },

  { id: "unusual-01", messages: ["kız arkadaşım gibi zarif ama güçlü araba olsun :) ", "bunu cinsiyet varsayımı yapmadan tasarım olarak anla"] },
  { id: "unusual-02", messages: ["uzay gemisi gibi teknolojik bişi", "elektrikli olabilir şehir içi"] },
  { id: "unusual-03", messages: ["mafya arabası istemiyorum ama heybetli olsun", "nötr tasarım diliyle ilerle"] },
  { id: "unusual-04", messages: ["iki köpek bir çadır bir de ben", "kamp için bagaj ve bozuk yol önemli"] },
  { id: "unusual-05", messages: ["annem binecek eşiği yüksek olmasın", "teknik veri yoksa iddia etme uygun gövdeyi sor"] },
  { id: "unusual-06", messages: ["gece vardiyasından çıkınca sessiz sakin gideyim", "sessizlik kanıtın yoksa kazanan seçme"] },
  { id: "unusual-07", messages: ["arabada bazen uyurum", "uzun yol kamp ama güvenli ve yasal çerçevede"] },
  { id: "unusual-08", messages: ["plaza otoparkı dar tek derdim bu", "ölçü verin yoksa park kolay deme"] },
  { id: "unusual-09", messages: ["rengi mor olsun başka şart yok", "renk kataloğunda yoksa uydurma, daha anlamlı ihtiyacımı sor"] },
  { id: "unusual-10", messages: ["hem coupe hem 7 kişilik hem pickup olsun", "olmazsa çelişkiyi açıkça söyle"] },

  { id: "offer-01", messages: ["şehir içi otomatik hibrit hatchback 3m max önerini hazırla", "$CONSENT"] },
  { id: "offer-02", messages: ["uzun yol elektrikli suv bütçe önemli değil seçenek hazırla", "$CONSENT"] },
  { id: "offer-03", messages: ["aile sedan benzinli otomatik 5m tavan artık seç", "$CONSENT"] },
  { id: "offer-04", messages: ["köy yolu pickup dört çeker dizel bütçe 4m öner", "$CONSENT"] },
  { id: "offer-05", messages: ["şehir içi küçük otomatik ilk araba 2.5m öner", "$CONSENT"] },
  { id: "offer-06", messages: ["prestijli sedan aile otomatik 6m önerini hazırla", "$CONSENT"] },
  { id: "offer-07", messages: ["koli dağıtımı kapalı kasa dizel otomatik 3m öner", "$CONSENT"] },
  { id: "offer-08", messages: ["hızlı elektrikli coupe 10m tavan öner", "$CONSENT"] },
  { id: "offer-09", messages: ["ucuz satın alma grubunda benzinli hatchback öner", "$CONSENT"] },
  { id: "offer-10", messages: ["günlük suv elektrikli kesin 1.5m varsa öner yoksa açıkça söyle", "$CONSENT"] },
] as const;

assert.equal(journeys.length, 110);

async function runJourney(journey: Journey, index: number, adapters: ReturnType<typeof createStructuredProviderAdapters>) {
  const store = new InMemoryV2ConversationStore();
  const offerStore = new InMemoryGovernedOfferStore();
  const traces: Trace[] = [];
  const signer = createHmacOfferSigner({ secret: randomBytes(48).toString("base64url"), now: () => new Date("2026-08-20T00:05:00.000Z") });
  const composition = createCarsDecisionV2ProductionComposition({ store, offerStore, signer, interpreter: adapters.interpreter, realizer: adapters.realizer, smokeObserver: (trace) => traces.push(trace) });
  let offerToken: string | undefined;
  const transcript: { role: "user" | "assistant"; text: string }[] = [];
  const turnResults: Record<string, unknown>[] = [];
  let revision = 0;
  for (const [turnIndex, rawMessage] of journey.messages.entries()) {
    const message = rawMessage === "$CONSENT" ? (offerToken ? "evet göster bakalım" : "devam et, eksik ne varsa sor") : rawMessage;
    transcript.push({ role: "user", text: message });
    const output = await runCarsDecisionTurnV2({ conversationId: `real-stress-${index}-${journey.id}`, messageId: `${journey.id}-${turnIndex + 1}`, idempotencyKey: `${journey.id}-${turnIndex + 1}`, expectedConversationRevision: revision, userMessage: message, ...(rawMessage === "$CONSENT" && offerToken ? { offerToken } : {}), requestTime: `2026-08-20T00:${String(turnIndex).padStart(2, "0")}:00.000Z` }, composition);
    revision += 1;
    offerToken = output.offer?.token ?? offerToken;
    transcript.push({ role: "assistant", text: output.message });
    const decision = traces.filter((trace) => trace.phase === "DECISION").at(-1) ?? {};
    const publicErrors = validatePublicDecisionTurnOutput(output);
    assert.ok(output.message.trim(), `${journey.id}:EMPTY_RESPONSE`);
    assert.equal(publicErrors.length, 0, `${journey.id}:PUBLIC_OUTPUT_INVALID`);
    assert.ok(Number(decision.materialQuestionCount ?? 0) <= 1, `${journey.id}:MULTIPLE_MATERIAL_QUESTIONS`);
    assert.doesNotMatch(output.message, /runtime|fingerprint|authorization|internal estimate|discriminator|evidence/iu, `${journey.id}:INTERNAL_JARGON`);
    if (turnIndex > 0) assert.notEqual(transcript.at(-2)?.text, transcript.at(-4)?.text, `${journey.id}:ASSISTANT_REPEAT`);
    turnResults.push({ turn: turnIndex + 1, action: decision.action, readiness: decision.recommendationReadiness, question: decision.selectedQuestionKey, candidateBuckets: decision.technicalBuckets, offer: Boolean(output.offer), cards: output.cards.length, options: output.options.map((option) => option.label) });
  }
  const memory = (await store.load(`real-stress-${index}-${journey.id}`))?.memory;
  return { id: journey.id, status: "PASS", vehicleIntent: memory?.vehicleIntentEstablished ?? false, transcript, turns: turnResults };
}

async function main() {
  if (!process.env.OPENAI_API_KEY?.trim()) throw new Error("OPENAI_API_KEY_REQUIRED");
  const config = readCarsDecisionV2ProviderConfig(process.env);
  const baseTransport = createOpenAIStructuredProviderTransport(getOpenAIClient(), config);
  const minimumProviderIntervalMs = Number(process.env.CARS_REAL_STRESS_PROVIDER_INTERVAL_MS ?? "7000");
  assert.ok(Number.isInteger(minimumProviderIntervalMs) && minimumProviderIntervalMs >= 1_000 && minimumProviderIntervalMs <= 60_000);
  let lastProviderCallAt = 0;
  let providerStartGate: Promise<void> = Promise.resolve();
  const scheduleProviderStart = async () => {
    const previous = providerStartGate;
    let release!: () => void;
    providerStartGate = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    const wait = Math.max(0, lastProviderCallAt + minimumProviderIntervalMs - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastProviderCallAt = Date.now();
    release();
  };
  const throttledTransport: StructuredProviderTransport = { execute: async (input) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await scheduleProviderStart();
      try {
        return await baseTransport.execute(input);
      } catch (error) {
        if (!(error instanceof Error) || error.message !== "V2_PROVIDER_RATE_LIMIT" || attempt === 4) throw error;
        process.stdout.write(`${JSON.stringify({ type: "PROVIDER_BACKOFF", attempt: attempt + 1, waitMs: 45_000 })}\n`);
        await new Promise((resolve) => setTimeout(resolve, 45_000));
      }
    }
    throw new Error("V2_PROVIDER_RATE_LIMIT");
  } };
  const adapters = createStructuredProviderAdapters({ transport: throttledTransport, timeoutMs: Math.max(config.timeoutMs, 240_000) });
  const results: Record<string, unknown>[] = [];
  const failures: Record<string, unknown>[] = [];
  const journeyLimit = Number(process.env.CARS_REAL_STRESS_LIMIT ?? String(journeys.length));
  assert.ok(Number.isInteger(journeyLimit) && journeyLimit >= 1 && journeyLimit <= journeys.length);
  const selectedJourneys = journeys.slice(0, journeyLimit);
  const reportPath = process.env.CARS_REAL_STRESS_REPORT_PATH ?? "/tmp/expiya-cars-v2-real-stress-report.json";
  const checkpoint = async () => writeFile(reportPath, JSON.stringify({ total: selectedJourneys.length, passed: results.length, failed: failures.length, failures: [...failures], results: [...results].sort((a, b) => String(a.id).localeCompare(String(b.id))) }, null, 2), "utf8");
  let cursor = 0;
  const workerCount = Number(process.env.CARS_REAL_STRESS_WORKERS ?? "1");
  const pauseMs = Number(process.env.CARS_REAL_STRESS_PAUSE_MS ?? "750");
  assert.ok(Number.isInteger(workerCount) && workerCount >= 1 && workerCount <= 4);
  assert.ok(Number.isInteger(pauseMs) && pauseMs >= 0 && pauseMs <= 10_000);
  const workers = Array.from({ length: workerCount }, async () => {
    while (true) {
      const index = cursor++;
      const journey = selectedJourneys[index];
      if (!journey) return;
      try {
        const result = await runJourney(journey, index + 1, adapters);
        results.push(result);
        await checkpoint();
        process.stdout.write(`${JSON.stringify({ type: "JOURNEY_COMPLETED", index: index + 1, id: journey.id })}\n`);
      } catch (error) {
        const rawCode = error instanceof Error ? error.message : "UNKNOWN";
        const code = /^[A-Z0-9_:,-]{1,160}$/u.test(rawCode) ? rawCode : "UNCLASSIFIED_FAILURE";
        failures.push({ index: index + 1, id: journey.id, code });
        await checkpoint();
        process.stdout.write(`${JSON.stringify({ type: "JOURNEY_FAILED", index: index + 1, id: journey.id, code })}\n`);
      }
      if (pauseMs > 0) await new Promise((resolve) => setTimeout(resolve, pauseMs));
    }
  });
  await Promise.all(workers);
  await checkpoint();
  process.stdout.write(`${JSON.stringify({ type: "RUN_COMPLETED", total: selectedJourneys.length, passed: results.length, failed: failures.length, failures, reportPath })}\n`);
  process.exitCode = failures.length === 0 ? 0 : 1;
}

void main();
