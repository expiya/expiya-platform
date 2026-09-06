import type { ElectronicsCategoryId } from "./architectureBaseline";
import type { ElectronicsRuntimeOutcome } from "./runtimeContracts";
import type { ElectronicsCategoryPolicyArtifact } from "./categoryPolicy";
import { defineXpyWelcomeKnowledge, renderXpyWelcome } from "../xpy/welcomeKnowledge";

const meanings: Readonly<Record<string, string>> = {
  AMBIENT_LIGHT: "aydınlık bir odada görüntünün soluklaşmaması", AUTOFOCUS: "hareketli anlarda netliği hızlıca yakalayabilmesi", BACKHAUL: "mesh noktalarının kendi aralarındaki bağlantıyı güçlü tutması", BATTERY: "şarj etmeden uzun süre kullanabilmeniz", BATTERY_SERVICE: "akünün zamanı geldiğinde kolayca değiştirilebilmesi", BUNDLE_TOPOLOGY: "kutudan çıkan hoparlör düzeninin odanıza uyması", CALLING: "görüntülü görüşmelerde sesinizin ve görüntünüzün anlaşılır olması", CAMERA: "günlük fotoğraf ve videolarda güvenilir sonuç vermesi", CAPACITY: "dosyalarınız için yeterli depolama alanı sunması", CELLULAR_BANDS: "Türkiye'deki mobil şebekelerle sorunsuz çalışması", CELLULAR_SUPPORT: "telefon yanınızda değilken de mobil bağlantı kurabilmesi", CLIENT_LOAD: "aynı anda bağlı çok sayıda cihazda hızın korunması", CODEC_COMPATIBILITY: "telefonunuzla uyumlu ve kaliteli kablosuz ses vermesi", COLOR: "renkleri doğru ve tutarlı göstermesi", CONSUMABLES: "mürekkep veya toner giderinin öngörülebilir olması", CONTENT: "izlediğiniz yayın ve uygulamaları rahatça açabilmesi", DESK_SPACE: "masanızda fazla yer kaplamaması", DEVICE_COMPATIBILITY: "kullandığınız telefon ve bilgisayarlara kolayca bağlanması", DISPLAY: "metin ve görüntüleri gözünüzü yormadan net göstermesi", DISPLAY_COMPATIBILITY: "televizyonunuzun oyun cihazının görüntü özelliklerini desteklemesi", DRIVE_COMPATIBILITY: "kullanacağınız disklerle uyumlu olması", DURABILITY: "taşınırken darbe ve günlük yıpranmaya dayanması", DWELLING: "evinizin büyüklüğü ve duvar yapısında kapsama sağlaması", DWELLING_COMPATIBILITY: "kapınıza ve mevcut zil tesisatınıza uygun olması", ECOSYSTEM: "evinizde kullandığınız akıllı cihazlarla birlikte çalışması", ELECTRICAL_SAFETY: "bağlı cihazları elektrik dalgalanmalarına karşı güvenle koruması", ERGONOMICS: "ekranı rahat bir çalışma pozisyonuna ayarlayabilmeniz", FIT: "uzun kullanımda kulağınıza rahat ve güvenli oturması", FORMAT_ECOSYSTEM: "satın aldığınız veya ödünç aldığınız e-kitapları açabilmesi", FRAMING: "görüşme sırasında sizi kadrajda düzgün göstermesi", GAME_ECOSYSTEM: "oynamak istediğiniz oyunlara ve arkadaş çevrenize erişebilmeniz", HEALTH_LIMITATIONS: "sağlık ölçümlerinin sınırlarını açıkça belirtmesi", HOST_COMPATIBILITY: "bilgisayarınız ve görüşme uygulamalarınızla sorunsuz çalışması", INPUT: "mevcut cihazlarınızı doğru girişlerle bağlayabilmeniz", INSTALLATION: "evinizde güvenli ve pratik biçimde kurulabilmesi", ISP_COMPATIBILITY: "internet sağlayıcınızın bağlantısıyla uyumlu olması", LENS_ECOSYSTEM: "ihtiyaç duyacağınız lenslere erişebilmeniz", LOAD: "bağlayacağınız cihazların toplam gücünü güvenle taşıması", LOCAL_CLOUD: "verilerin evde mi yoksa internet hizmetinde mi tutulacağını seçebilmeniz", LOW_LIGHT: "loş ortamda görüntünüzü temiz gösterebilmesi", MEDIA: "kullanacağınız kâğıt türü ve boyutlarını desteklemesi", MICROPHONE: "telefon ve toplantılarda sesinizi anlaşılır iletmesi", MOTION: "hızlı hareketlerde görüntüyü akıcı göstermesi", MULTI_SPEAKER: "birden fazla hoparlörü birlikte kullanabilmeniz", NETWORK: "ev veya ofis ağınıza uygun hız ve bağlantı sunması", NOISE_CONTROL: "çevre gürültüsünü gerektiğinde azaltması", OS_SUPPORT: "yeni uygulamalarla çalışmaya ve güvenlik güncellemeleri almaya devam etmesi", OUTPUT_CONTEXT: "kullanacağınız oda ve dinleme mesafesinde yeterli ses vermesi", PANEL: "oda ışığında istediğiniz görüntü kalitesini vermesi", PHONE_COMPATIBILITY: "telefonunuzla tüm temel özellikleri kullanabilmeniz", PLATFORM_SUPPORT: "kullandığınız yayın ve cihaz platformlarını desteklemesi", PORTABILITY: "gün içinde rahatça taşıyabilmeniz", POWER: "odanız için yeterli ses gücü sunması", PRIVACY: "görüntülerinize kimlerin erişebileceğini kontrol edebilmeniz", PROTOCOL: "evinizdeki akıllı cihazların bağlantı türleriyle uyumlu olması", REDUNDANCY: "bir disk arızasında verilerin korunabilmesi", ROOM: "kullanacağınız odanın büyüklüğü ve yerleşimine uyması", RUGGEDNESS: "dışarıda suya ve darbeye karşı dayanıklı olması", RUNNING_COST: "sayfa başına baskı maliyetinin bütçenize uyması", RUNTIME: "elektrik kesildiğinde cihazları yeterince uzun süre çalıştırması", SENSOR: "çektiğiniz sahnelerde yeterli görüntü kalitesi sunması", SENSORS: "önemsediğiniz hareket ve aktivite ölçümlerini yapabilmesi", STORAGE: "içerikleriniz ve oyunlarınız için yeterli alan sunması", STORAGE_SUBSCRIPTION: "kayıtları saklamak için ücretli abonelik gerektirmemesi", SUBSCRIPTION_BOUNDARY: "oynamak istediğiniz özellikler için ek abonelik gereksiniminin size uyması", SURROUND: "film ve oyunlarda çevresel ses hissi vermesi", THROUGHPUT: "büyük dosyaları bekletmeden aktarabilmesi", THROW_GEOMETRY: "odadaki mesafeden istediğiniz görüntü boyutunu oluşturabilmesi", TOPOLOGY: "priz ve cihaz düzeninize uygun bağlantılar sunması", TV_CONNECTIVITY: "televizyonunuza uygun bağlantıyla kolayca kurulması", UPGRADEABILITY: "ileride bellek veya depolamayı artırabilmeniz", USE_CASE: "en sık çekeceğiniz sahnelere uygun olması", VIDEO: "ihtiyacınız olan çözünürlükte ve akıcılıkta video çekmesi", VOLUME: "aylık baskı miktarınızı zorlanmadan karşılaması", WATER_RESISTANCE: "su sıçraması veya nemli ortamda güvenle kullanılabilmesi", WORKLOAD: "okul, iş veya üretim ihtiyaçlarınızdaki programları rahatça çalıştırması",
};

const unsafe = /(?:[a-zçğıöşü]+_[a-z0-9_]+|\b(?:runtime|exact|concept|field|policy|support|compatibility|topology|throughput|backhaul|autofocus)\b)/iu;

export function electronicsQuestionText(categoryId: ElectronicsCategoryId, categoryLabel: string, concept: string): string {
  if (categoryId === "HEADPHONES") {
    const headphonesQuestions: Readonly<Record<string, string>> = {
      FIT: "Kulaklığı kulağı çevreleyen baş üstü veya kulak içi açık tasarımda kullanma tercihin ne kadar belirleyici?",
      NOISE_CONTROL: "Aktif gürültü engellemenin bulunması senin için ne kadar önemli?",
      CODEC_COMPATIBILITY: "Telefonunun desteklediği ses kodlayıcılarıyla doğrulanmış uyumluluk senin için ne kadar önemli?",
    };
    const headphonesText = headphonesQuestions[concept];
    if (headphonesText) return headphonesText;
  }
  const meaning = meanings[concept];
  if (!meaning) throw new Error(`PUBLIC_LANGUAGE_MISSING:${categoryId}:${concept}`);
  const subject = categoryId === "TABLET" && concept === "OS_SUPPORT" ? "Tabletin" : `${categoryLabel} seçiminizde`;
  const text = `${subject} ${meaning} ne kadar önemli?`;
  if (unsafe.test(text)) throw new Error("PUBLIC_LANGUAGE_UNSAFE");
  return text;
}

export function projectElectronicsPublicOutcome(outcome: ElectronicsRuntimeOutcome): ElectronicsRuntimeOutcome {
  const message = outcome.message.replace(/exact (?:ürün|yapılandırma)/giu, "doğrulanmış ürün").replace(/Electronics/gu, "Elektronik");
  if (unsafe.test(message)) return { kind: "FAILED_CLOSED", message: "Bu açıklama anlaşılır tüketici diline çevrilemediği için gösterilemiyor." };
  return { ...outcome, message };
}

export const electronicsPublicMeanings = meanings;

export function electronicsWelcomeText(categoryId: ElectronicsCategoryId, categoryLabel: string, policy: ElectronicsCategoryPolicyArtifact["payload"]["categories"][number]): string {
  const questions = categoryId === "HEADPHONES" ? policy.questionPlan.filter(question => question.targetConcept !== "MICROPHONE") : policy.questionPlan;
  const dimensions = questions.slice(0, 3).map((question) => meanings[question.targetConcept]).filter((value): value is string => Boolean(value));
  const opening = questions[0];
  if (!opening || !dimensions.length) throw new Error(`PUBLIC_WELCOME_MISSING:${categoryId}`);
  return renderXpyWelcome(defineXpyWelcomeKnowledge({ source: "DOMAIN_PACK", categoryName: categoryLabel, introduction: `${categoryLabel}, kullanımınıza göre ekran, bağlantı, dayanıklılık ve yazılım ömrü gibi öncelikleri değişebilen bir ürün grubudur.`, needDimensions: dimensions, technologySummary: "Yeni özellikler yararlı olabilir; ancak yalnız günlük ihtiyacınıza karşılığı varsa seçim ölçütü yapılmalıdır.", openingQuestion: electronicsQuestionText(categoryId, categoryLabel, opening.targetConcept), contextMutation: "NONE" }));
}

export function electronicsKnowledgeAnswer(categoryId: ElectronicsCategoryId, categoryLabel: string, policy: ElectronicsCategoryPolicyArtifact["payload"]["categories"][number]): string {
  const questions = categoryId === "HEADPHONES" ? policy.questionPlan.filter(question => question.targetConcept !== "MICROPHONE") : policy.questionPlan;
  const dimensions = questions.slice(0, 3).map((question) => meanings[question.targetConcept]).filter((value): value is string => Boolean(value));
  if (!dimensions.length) throw new Error(`PUBLIC_KNOWLEDGE_MISSING:${categoryId}`);
  return `${categoryLabel}, kullanımınıza göre doğru özellikleri değişebilen bir ürün grubudur. Seçerken ${dimensions.join(", ")} gibi günlük ihtiyaçları düşünmek yararlı olur. Yeni özellikler yalnız günlük ihtiyacınıza karşılığı varsa seçim ölçütü yapılmalıdır. Buradan istersen seçim için tek tek ilerleyebilir veya yalnız bilgi almaya devam edebiliriz.`;
}
