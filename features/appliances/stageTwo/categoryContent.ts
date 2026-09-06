import type { AppliancesProductType } from "../contracts";

export interface AppliancesStageTwoCategoryContent {
  readonly eyebrow: string;
  readonly chartTitle: string;
  readonly chartDimensions: readonly [string, string, string];
  readonly dailyLifeTitle: string;
}

const content = <T extends Readonly<Record<AppliancesProductType, AppliancesStageTwoCategoryContent>>>(value: T) => value;

/** Category-owned labels only. Values always come from an authorized decision projection. */
export const APPLIANCES_STAGE_TWO_CONTENT = content({
  WASHING_MACHINE: { eyebrow: "Yıkama düzeni", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Kapasite", "Yerleşim", "Günlük kolaylık"], dailyLifeTitle: "Yıkama rutinindeki karşılığı" },
  REFRIGERATOR: { eyebrow: "Saklama düzeni", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Taze gıda", "Dondurucu", "Yerleşim"], dailyLifeTitle: "Mutfak rutinindeki karşılığı" },
  DISHWASHER: { eyebrow: "Sofra düzeni", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Kapasite", "Kurutma", "Yerleşim"], dailyLifeTitle: "Bulaşık rutinindeki karşılığı" },
  DRYER: { eyebrow: "Kurutma düzeni", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Kapasite", "Program", "Bakım"], dailyLifeTitle: "Kurutma rutinindeki karşılığı" },
  VACUUM: { eyebrow: "Temizlik düzeni", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Erişim", "Filtreleme", "Başlıklar"], dailyLifeTitle: "Temizlik rutinindeki karşılığı" },
  ROBOT_VACUUM: { eyebrow: "Otomatik temizlik", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Geçiş", "İstasyon", "Paspas"], dailyLifeTitle: "Otomatik temizlikteki karşılığı" },
  FREEZER: { eyebrow: "Donmuş gıda", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Hacim", "Form", "Buz çözme"], dailyLifeTitle: "Saklama rutinindeki karşılığı" },
  BUILT_IN_OVEN: { eyebrow: "Pişirme düzeni", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Kabin uyumu", "Pişirme", "Temizlik"], dailyLifeTitle: "Pişirme rutinindeki karşılığı" },
  FREESTANDING_COOKER: { eyebrow: "Ocak ve fırın", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Yakıt", "Bağlantı", "Pişirme"], dailyLifeTitle: "Pişirme rutinindeki karşılığı" },
  HOB: { eyebrow: "Tezgâh düzeni", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Teknoloji", "Kesim", "Bağlantı"], dailyLifeTitle: "Ocak kullanımındaki karşılığı" },
  RANGE_HOOD: { eyebrow: "Havalandırma", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Hava çıkışı", "Genişlik", "Ses"], dailyLifeTitle: "Mutfak havalandırmasındaki karşılığı" },
  COUNTERTOP_MICROWAVE_OVEN: { eyebrow: "Hızlı hazırlama", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Yerleşim", "Hacim", "Güç"], dailyLifeTitle: "Hazırlama rutinindeki karşılığı" },
  BUILT_IN_MICROWAVE_OVEN: { eyebrow: "Ankastre hazırlama", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Niş", "Havalandırma", "İşlev"], dailyLifeTitle: "Hazırlama rutinindeki karşılığı" },
  AIR_PURIFIER: { eyebrow: "İç hava düzeni", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Hava akışı", "Filtre", "Bakım"], dailyLifeTitle: "İç hava rutinindeki karşılığı" },
  FULLY_AUTOMATIC_ESPRESSO_MACHINE: { eyebrow: "Çekirdekten fincana", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Öğütme", "Süt", "Bakım"], dailyLifeTitle: "Kahve rutinindeki karşılığı" },
  MANUAL_ESPRESSO_MACHINE: { eyebrow: "Manuel espresso", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Portafiltre", "Buhar", "Aksesuar"], dailyLifeTitle: "Kahve rutinindeki karşılığı" },
  FILTER_COFFEE_MACHINE: { eyebrow: "Filtre kahve", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Demleme", "Karaf", "Sıcak tutma"], dailyLifeTitle: "Kahve rutinindeki karşılığı" },
  TURKISH_COFFEE_MACHINE: { eyebrow: "Türk kahvesi", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Fincan", "Pişirme", "Taşma"], dailyLifeTitle: "Kahve rutinindeki karşılığı" },
  AIR_FRYER: { eyebrow: "Sıcak hava pişirme", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Sepet", "Bölme", "Temizlik"], dailyLifeTitle: "Pişirme rutinindeki karşılığı" },
  BLENDER: { eyebrow: "Karıştırma düzeni", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Sürahi", "Bıçak", "Aksesuar"], dailyLifeTitle: "Hazırlama rutinindeki karşılığı" },
  FOOD_PROCESSOR: { eyebrow: "Gıda hazırlama", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Kase", "Disk", "Aksesuar"], dailyLifeTitle: "Hazırlama rutinindeki karşılığı" },
  ELECTRIC_STORAGE_WATER_HEATER: { eyebrow: "Depolu sıcak su", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Depo", "Elektrik", "Montaj"], dailyLifeTitle: "Sıcak su düzenindeki karşılığı" },
  INSTANTANEOUS_ELECTRIC_WATER_HEATER: { eyebrow: "Ani sıcak su", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Güç", "Debi", "Tesisat"], dailyLifeTitle: "Sıcak su düzenindeki karşılığı" },
  SPLIT_AIR_CONDITIONER: { eyebrow: "İklimlendirme", chartTitle: "Karar kanıtı görünümü", chartDimensions: ["Ünite çifti", "Oda yükü", "Kurulum"], dailyLifeTitle: "İklimlendirme düzenindeki karşılığı" },
});
