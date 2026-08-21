import type { ProposedBudgetMutation, ValidatedConstraintMutation } from "../interpretation/types";

function scalar(value: ValidatedConstraintMutation["normalizedValue"]): string | undefined {
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (!value || typeof value !== "object" || Array.isArray(value) || !("value" in value)) return undefined;
  const candidate = value.value;
  if (typeof candidate === "string" || typeof candidate === "number") return String(candidate);
  if (Array.isArray(candidate)) return candidate.map(String).join("+");
  return undefined;
}

export function createPreferenceAcknowledgement(input: {
  readonly constraints: readonly ValidatedConstraintMutation[];
  readonly budgets: readonly ProposedBudgetMutation[];
}): string | undefined {
  const constraint = [...input.constraints].reverse().find((item) => !["DECLINE"].includes(item.operation));
  if (constraint?.operation === "CLEAR") return "Bu başlığı açık bırakalım; seni gereksiz yere tek seçeneğe sıkıştırmayacağım.";
  if (constraint) {
    const value = scalar(constraint.normalizedValue);
    if (constraint.fieldId === "usageScenario") return value === "URBAN_DAILY" ? "Şehir içi kullanım net; günlük pratikliği öne alacağım." : value === "FAMILY" ? "Aile kullanımı net; herkesin rahat edeceği tarafa odaklanacağım." : value === "LONG_DISTANCE" ? "Uzun yol odağı net; yolculuk ritmini ve kullanışlılığı birlikte düşüneceğim." : "Kullanım biçimin netleşti; bundan sonraki ayrımları gerçek hayatına göre yapacağım.";
    if (constraint.fieldId === "bodyStyle") {
      if (value?.includes("+")) return "Belirttiğin gövde tiplerini birbirinin alternatifi olarak tutuyorum; herhangi birini karşılayan seçeneklerle ilerleyeceğim.";
      return value?.includes("SUV") || value?.includes("Crossover") ? "SUV/crossover tarafı net; daha yüksek ve güçlü gövde çizgisinde ilerleyelim." : value?.includes("Sedan") ? "Sedan çizgisi net; klasik ve dengeli otomobil formunda kalıyoruz." : value?.includes("Hatchback") ? "Hatchback şehir hayatına yakışan pratik bir yön; kompakt seçeneklere odaklanalım." : value?.includes("Coupe") ? "Coupe seçimi karakterli bir yön verdi; tasarım ve sürüş hissini daha fazla önemseyeceğim." : value?.includes("Panel Van") ? "Kapalı kasa ihtiyacı net; yük alanını binek otomobillerle karıştırmadan ilerleyeceğim." : "Gövde tercihin net; adayları bu çizgide daraltacağım.";
    }
    if (constraint.fieldId === "fuelType") return value?.includes("+") ? "Belirttiğin yakıt türlerini alternatif olarak açık tutuyorum; herhangi birini karşılayan seçeneklerle ilerleyeceğim." : value?.includes("BEV") ? "Elektrikli tarafı seçtin; sessiz ve akıcı kullanım karakterine odaklanalım." : value?.includes("HEV") || value?.includes("PHEV") || value?.includes("MHEV") ? "Hibrit tarafı iyi bir denge arayışı; elektrik desteğiyle günlük kullanımı birlikte değerlendireceğim." : value?.includes("GASOLINE") ? "Benzinli tarafta kalıyoruz; seçenekleri bu kullanım düzenine göre ayıracağım." : value?.includes("DIESEL") ? "Dizel tercihin net; özellikle kullanım mesafesiyle uyumunu gözeterek ilerleyeceğim." : "Yakıt seçeneklerin netleşti; adayları bu aralıkta tutacağım.";
    if (constraint.fieldId === "transmission") return value?.includes("+") ? "Belirttiğin şanzıman türlerini alternatif olarak açık tutuyorum; herhangi birini karşılayan seçeneklerle ilerleyeceğim." : value?.includes("AUTOMATIC") ? "Otomatik net; günlük kullanım rahatlığını öncelikte tutuyoruz." : value?.includes("MANUAL") ? "Manuel net; daha doğrudan sürüş kontrolü istediğini anlıyorum." : "Şanzıman tercihin net; sonraki ayrımı bunun üzerine kuracağım.";
    if (constraint.fieldId === "drivenWheels") return value?.includes("AWD") ? "Dört çeker isteğin net; çekiş ihtiyacını öncelikte tutacağım." : "Çekiş tercihin net; uygun aktarma düzeninde kalacağım.";
    if (constraint.fieldId === "seats") return "Koltuk ihtiyacı netleşti; gereğinden küçük veya büyük araçlara gitmeyeceğim.";
    if (constraint.fieldId === "relativePriceSegment") return "Fiyat seviyesindeki beklentin net; teknik ihtiyaçları bozmadan o gruba yakın seçenekleri öne alacağım.";
    if (constraint.fieldId === "runningCostPreference") return "Kullanım maliyeti senin için önemli; doğrulanmış tüketim verisi olan adaylarda bunu öne alacağım.";
    return "Bu tercih net; sonraki ayrımı buna göre yapacağım.";
  }
  const budget = [...input.budgets].reverse().find((item) => ["PREFERRED_BUDGET", "MAXIMUM_HARD_CEILING", "AVAILABLE_CASH"].includes(item.field));
  if (budget?.field === "MAXIMUM_HARD_CEILING") return "Bütçe tavanın net; seni bunun üzerindeki araçlara yönlendirmeyeceğim.";
  if (budget?.field === "PREFERRED_BUDGET") return "Bütçe çerçeven net; gereksiz yere daha pahalı seçeneklere taşımayacağım.";
  if (budget?.field === "AVAILABLE_CASH") return "Mevcut nakit seviyen net; finansman esnekliğini ayrıca değerlendirerek ilerleyeceğim.";
  return undefined;
}
