const personas = [
  {
    id: "family-budget",
    label: "Bütçesi kısıtlı aile babası",
    role: "Geniş bagajlı, ekonomik SUV veya MPV arayan, bütçesini dikkatle koruyan bir aile babasısın.",
    facts: ["5 kişilik aileyiz", "bebek arabası ve valiz taşıyorum", "yakıt gideri düşük olsun", "bütçeyi aşamam", "çoğunlukla şehir ve yılda birkaç uzun yol"],
    target: "Asistan ihtiyaçları keşfetmeli; aile, bagaj, ekonomi ve bütçeyi korumalı; SUV/MPV veya gerçek ihtiyaca uygun aile aracında kalmalı.",
  },
  {
    id: "ev-tech",
    label: "Menzil kaygılı teknoloji çalışanı",
    role: "Elektrikli araç isteyen fakat gerçek menzil ve şarj erişimi konusunda kaygılı, teknoloji odaklı bir beyaz yakalısın.",
    facts: ["günde 55 km gidiyorum", "apartmanda oturuyorum", "iş yerinde bazen şarj var", "ayda bir şehirler arası yol yapıyorum", "batarya ve hızlı şarj önemli"],
    target: "Asistan EV kullanımını, günlük mesafeyi ve şarj koşullarını sorgulamalı; menzil garantisi uydurmamalı; uygun elektrikli araçlara yönelmeli.",
  },
  {
    id: "young-city",
    label: "Genç şehir içi sürücüsü",
    role: "İlk aracını alacak, bütçesi düşük, şehir içinde kolay park edilen az yakan otomatik B-segment hatchback arayan genç sürücüsün.",
    facts: ["ilk aracım olacak", "dar sokaklarda kullanacağım", "otomatik şart", "yakıt az olsun", "park kolaylığı ve düşük bütçe önemli"],
    target: "Asistan otomatik, küçük, ekonomik ve bütçe odaklı B-segment hatchback ihtiyacını korumalı; büyük/pahalı araca sapmamalı.",
  },
  {
    id: "aggressive-switcher",
    label: "Agresif ve fikir değiştiren müşteri",
    role: "Sabırsız ve sert konuşan, önce spor otomobil deyip sonra geniş bagaj, aile kullanımı ve ekonomi isteyen sürekli fikir değiştiren müşterisin.",
    facts: ["önce iki kişilik hızlı spor araba istiyorum", "sonra fikrimi değiştirip geniş bagaj istiyorum", "ailem de binecek", "yakıt da önemli", "eski tercihlerimi açıkça iptal ediyorum"],
    target: "Asistan sakin ve saygılı kalmalı, çatışmamalı; son açık düzeltmeleri önceki tercihlerden üstün tutmalı ve güncel aile/bagaj/ekonomi ihtiyacına yönelmeli.",
  },
  {
    id: "cargo-tradesman",
    label: "Şehir içi kargo esnafı",
    role: "Şehir içinde e-ticaret ve kargo dağıtan, az yakan ve geniş hacimli panelvan arayan esnafsın.",
    facts: ["günde çok dur-kalk yapıyorum", "koliler için geniş kapalı hacim lazım", "işletme maliyeti düşük olsun", "manevra önemli", "yük taşımak ana işim"],
    target: "Asistan ticari yük, hacim ve şehir içi maliyeti keşfetmeli; hafif ticari/panelvan yöneliminde kalmalı; binek otomobili ana çözüm yapmamalı.",
  },
  {
    id: "school-shuttle",
    label: "Okul ve personel servisçisi",
    role: "Okul ve personel taşımacılığı için güvenli, konforlu, uygun koltuk kapasiteli minibüs arayan servis şoförüsün.",
    facts: ["öğrenci ve personel taşıyacağım", "koltuk sayısı kritik", "güvenlik öncelikli", "uzun süreli konfor önemli", "mevzuata uygunluk belgesi istiyorum"],
    target: "Asistan minibüs/büyük yolcu taşıma aracında kalmalı; koltuk ve güvenliği sormalı; kesin mevzuat uygunluğu uydurmamalı ve resmi güncel doğrulama gerektiğini söylemeli.",
  },
  {
    id: "village-farmer",
    label: "Dağ köyünde çiftçi",
    role: "Doğu Anadolu'da dağ köyünde yaşayan, tarla ve yük işiyle karlı/çamurlu yollarda kullanacağı dayanıklı araç arayan çiftçisin.",
    facts: ["kış ağır geçiyor", "çamur ve dik köy yolları var", "tarlaya yük götürüyorum", "4x4 şart", "yüksek şasi ve dayanıklılık önemli"],
    target: "Asistan 4x4, yüksek şasi, yük ve ağır kış ihtiyacını korumalı; pickup veya gerçek arazi SUV'una yönelmeli; şehir otomobili önermemeli.",
  },
  {
    id: "sme-multipurpose",
    label: "Çok amaçlı KOBİ sahibi",
    role: "Hafta içi mal sevkiyatı, hafta sonu beş kişilik aile gezisi için tek araç arayan KOBİ sahibisin.",
    facts: ["hafta içi koli taşıyorum", "hafta sonu 5 kişi geziyoruz", "arka koltuk ve camlar gerekli", "konfor da yük hacmi de önemli", "tek araç bütçem var"],
    target: "Asistan ikili kullanımı birlikte değerlendirmeli; kombi/camlı van veya uygun çok amaçlı ticari araçta kalmalı; salt panelvan ya da küçük binek araca sapmamalı.",
  },
  {
    id: "heavy-offroad",
    label: "Ağır arazi doğa tutkunu",
    role: "Hafta sonu ağır off-road rotalarına ve kamp alanlarına giden, çekiş ve arazi geometrisini konfordan önde tutan doğa tutkunusun.",
    facts: ["zorlu taşlı rotalara giriyorum", "çadır ve ekipman taşıyorum", "4x4 ve düşük hız çekişi önemli", "yerden yükseklik ve yaklaşma açısı önemli", "şehir konforu ikinci planda"],
    target: "Asistan safkan arazi aracı veya ağır hizmet pickup yöneliminde kalmalı; arazi kabiliyeti konusunda doğrulanmamış teknik değer uydurmamalı.",
  },
];

const styles = [
  "Kısa ve gündelik konuş; bilgileri tek seferde dökme.",
  "Kararsız görün ve iki seçeneği kıyaslamaya çalış.",
  "Bütçeyi erken söyleme; asistan sorunca açıkla.",
  "Bir ayrıntıyı önce belirsiz, sonraki turda kesin ifade et.",
  "Doğal yazım hataları ve kısa cümleler kullan.",
];

module.exports = personas.flatMap((persona) => Array.from({ length: 25 }, (_, index) => {
  const style = styles[index % styles.length];
  const rotatedFacts = persona.facts.map((_, factIndex) => persona.facts[(factIndex + index) % persona.facts.length]);
  const instructions = `${persona.role}\nVaryasyon ${index + 1}: ${style}\nKonuşma boyunca doğal biçimde ve yalnız soruldukça şu gerçekleri kullan: ${rotatedFacts.join("; ")}.\nAsistan yanlış varsayım yaparsa düzelt. Yeterli keşif yapıldıktan sonra açıkça araç önerisi iste. Asistan öneriyi göstermeden önce onay isterse doğal biçimde onayla. Öneri geldikten sonra ###STOP### yaz. En geç son turda öneri iste.`;
  const rubric = `Bu, Expiya Cars ile simüle edilmiş Türkçe müşteri konuşmasıdır. Şu ölçütlerin TÜMÜNÜ değerlendir: (1) Asistan çok turlu bağlamı ve kullanıcının son düzeltmelerini koruyor. (2) Sorular doğal, ilgili ve gereksiz tekrar içermiyor. (3) Üslup insansı, sabırlı, saygılı ve iç sistem jargonundan uzak. (4) Araç yönlendirmesi şu persona hedefiyle uyumlu: ${persona.target} (5) Uydurma kesin fiyat, donanım, menzil, teknik değer veya yasal uygunluk iddiası yok. (6) Konuşma sonunda ya uygun araç önerisi sunulmuş ya da katalogda uygun araç yoksa bu dürüstçe açıklanmış. Yalnız küçük üslup kusurları varsa geçebilir; yanlış segment, unutulan kritik kriter, saldırgan tepki, halüsinasyon veya başarısız yönlendirme varsa başarısız say.`;
  return {
    description: `${persona.label} / varyasyon ${String(index + 1).padStart(2, "0")}`,
    vars: { caseId: `${persona.id}-${String(index + 1).padStart(2, "0")}`, personaId: persona.id },
    provider: { id: "promptfoo:simulated-user", config: { instructions, maxTurns: 12 } },
    assert: [{ type: "llm-rubric", value: rubric, provider: { id: "openai:responses:gpt-5-nano", config: { reasoning_effort: "minimal", max_output_tokens: 240 } } }],
  };
}));
