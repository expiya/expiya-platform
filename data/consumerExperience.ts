import type { ConsumerExperienceEvidence } from "@/types/consumerExperience";

export const consumerExperienceByCarId: Readonly<Record<string, ConsumerExperienceEvidence>> = {
  "1": {
    sourceName: "NHTSA tüketici şikâyetleri",
    sourceUrl: "https://api.nhtsa.gov/complaints/complaintsByVehicle?make=TOYOTA&model=COROLLA&modelYear=2022",
    market: "ABD",
    complaintCount: 95,
    recurringRiskThemes: ["Güç aktarımı", "Servis frenleri", "Hava yastıkları", "Elektrik sistemi"],
    limitation: "Ham şikâyet sayısı satış adedine göre normalize edilmemiştir; Türkiye kullanım deneyimini doğrudan temsil etmez.",
  },
  "2": {
    sourceName: "NHTSA tüketici şikâyetleri",
    sourceUrl: "https://api.nhtsa.gov/complaints/complaintsByVehicle?make=HONDA&model=CIVIC&modelYear=2021",
    market: "ABD",
    complaintCount: 139,
    recurringRiskThemes: ["Direksiyon", "Ön çarpışma önleme", "Hava yastıkları", "Elektrik sistemi"],
    limitation: "Ham şikâyet sayısı satış adedine göre normalize edilmemiştir; Türkiye kullanım deneyimini doğrudan temsil etmez.",
  },
  "3": {
    sourceName: "NHTSA tüketici şikâyetleri",
    sourceUrl: "https://api.nhtsa.gov/complaints/complaintsByVehicle?make=TESLA&model=MODEL%203&modelYear=2023",
    market: "ABD",
    complaintCount: 414,
    recurringRiskThemes: ["Ön çarpışma önleme", "Direksiyon", "Hız kontrolü", "Elektrik sistemi"],
    limitation: "Ham şikâyet sayısı satış adedine göre normalize edilmemiştir; Türkiye kullanım deneyimini doğrudan temsil etmez.",
  },
};
