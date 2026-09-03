export type SecretaryDepartmentId = "CARS" | "ELECTRONICS" | "APPLIANCES" | "HOTELS" | "COURSES" | "HOMES";

export type SecretaryOutcome =
  | { readonly kind: "ROUTE"; readonly departmentId: "CARS"; readonly destination: "/cars?entry=secretary"; readonly message: string }
  | { readonly kind: "CLARIFY"; readonly message: string }
  | { readonly kind: "UNSUPPORTED"; readonly departmentId: Exclude<SecretaryDepartmentId, "CARS">; readonly message: string }
  | { readonly kind: "NON_DECISION"; readonly message: string }
  | { readonly kind: "MULTI_INTENT"; readonly message: string };

const departmentPatterns: Readonly<Record<SecretaryDepartmentId, readonly RegExp[]>> = {
  CARS: [/(araba|otomobil|araç|suv|sedan|hatchback|pick[ -]?up|panelvan|minibüs)/iu],
  ELECTRONICS: [/(laptop|bilgisayar|telefon|tablet|televizyon|monitör|kulaklık|elektronik|\btv\b)/iu],
  APPLIANCES: [/(buzdolabı|çamaşır makinesi|bulaşık makinesi|kurutma makinesi|süpürge|beyaz eşya|ev aleti)/iu],
  HOTELS: [/(otel|konaklama|tatil|pansiyon)/iu],
  COURSES: [/(kurs|eğitim|öğrenmek|sertifika)/iu],
  HOMES: [/(konut|daire|ev satın|ev kirala|gayrimenkul)/iu],
};

const upcomingMessages: Readonly<Record<Exclude<SecretaryDepartmentId, "CARS">, string>> = {
  ELECTRONICS: "Elektronik karar deneyimimiz henüz hazırlanıyor. Şu anda otomobil seçiminde yardımcı olabilirim.",
  APPLIANCES: "Ev aletleri karar deneyimimiz henüz hazırlanıyor. Şu anda otomobil seçiminde yardımcı olabilirim.",
  HOTELS: "Otel karar deneyimimiz henüz hazırlanıyor. Şu anda otomobil seçiminde yardımcı olabilirim.",
  COURSES: "Kurs karar deneyimimiz henüz hazırlanıyor. Şu anda otomobil seçiminde yardımcı olabilirim.",
  HOMES: "Ev karar deneyimimiz henüz hazırlanıyor. Şu anda otomobil seçiminde yardımcı olabilirim.",
};

function mentionedDepartments(message: string): readonly SecretaryDepartmentId[] {
  return (Object.keys(departmentPatterns) as SecretaryDepartmentId[])
    .filter((departmentId) => departmentPatterns[departmentId].some((pattern) => pattern.test(message)));
}

export function classifySecretaryMessage(rawMessage: string): SecretaryOutcome {
  const message = rawMessage.trim();
  const departments = mentionedDepartments(message);
  if (departments.length > 1) return { kind: "MULTI_INTENT", message: "Birden fazla konuda yardımcı olabilirim; ancak her kararı ayrı ele alıyoruz. Önce hangisinden başlamak istersiniz?" };
  if (departments[0] === "CARS") return { kind: "ROUTE", departmentId: "CARS", destination: "/cars?entry=secretary", message: "Elbette. Sizi otomobil bölümümüze bağlıyorum." };
  if (departments[0]) {
    const departmentId = departments[0] as Exclude<SecretaryDepartmentId, "CARS">;
    return { kind: "UNSUPPORTED", departmentId, message: upcomingMessages[departmentId] };
  }
  if (/^(merhaba|selam|günaydın|iyi (günler|akşamlar)|hey)[.! ]*$/iu.test(message)) return { kind: "NON_DECISION", message: "Merhaba, hoş geldiniz. Ne konuda karar vermenize yardımcı olabilirim?" };
  if (/\b(expiya nedir|ne yapıyorsunuz|nasıl çalışıyor)\b/iu.test(message)) return { kind: "NON_DECISION", message: "Expiya, önemli seçimlerinizi ihtiyaçlarınıza göre netleştiren bir karar platformudur. Şu anda otomobil bölümü kullanıma açık." };
  return { kind: "CLARIFY", message: "Size doğru bölümde yardımcı olabilmem için, ne seçmek istediğinizi biraz daha açık söyler misiniz?" };
}
