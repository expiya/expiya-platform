import { describe, expect, it } from "vitest";
import { classifySecretaryMessage } from "./upperSecretary";
import { SECRETARY_ROUTE_DESCRIPTORS, validateSecretaryRouteDescriptors } from "./secretaryRoutingPack";

describe("Expiya Secretary routing governor", () => {
  it("routes stroller compounds while preserving Cars false-positive suppression", () => {
    for (const message of ["bebek arabası", "hayır, otomobil değil; bebek arabası", "puset", "travel sistem", "çocuk arabası"]) expect(classifySecretaryMessage(message)).toMatchObject({ kind: "PROPOSE_NAVIGATION", departmentId: "BABY_AND_CHILD", destination: "/baby?entry=secretary" });
    for (const message of ["oyuncak araba", "araba koltuğu", "bebek oto koltuğu", "arabalı yatak"]) expect(classifySecretaryMessage(message)).toMatchObject({ kind: "UNSUPPORTED_DESTINATION" });
  });
  it("routes governed active vehicle aliases", () => {
    for (const message of ["araba almak istiyorum", "SUV bakıyorum", "Ailem için bir otomobil arıyorum", "pick-up arıyorum"]) expect(classifySecretaryMessage(message)).toMatchObject({ kind: "PROPOSE_NAVIGATION", departmentId: "CARS", destination: "/cars?entry=secretary" });
  });
  it("routes natural electronics and exact appliance categories", () => {
    for (const term of ["bilgisayar", "laptop", "dizüstü bilgisayar", "masaüstü bilgisayar"]) expect(classifySecretaryMessage(term)).toMatchObject({ kind: "PROPOSE_NAVIGATION", departmentId: "ELECTRONICS", destination: "/electronics/analysis?category=LAPTOP&entry=secretary" });
    expect(classifySecretaryMessage("telefon")).toMatchObject({ kind: "PROPOSE_NAVIGATION", destination: "/electronics/analysis?category=SMARTPHONE&entry=secretary" });
    expect(classifySecretaryMessage("çamaşır makinesi")).toMatchObject({ kind: "PROPOSE_NAVIGATION", destination: "/appliances?entry=secretary&category=WASHING_MACHINE" });
    expect(classifySecretaryMessage("solo fırın")).toMatchObject({ kind: "PROPOSE_NAVIGATION", destination: "/appliances?entry=secretary&category=FREESTANDING_COOKER" });
  });
  it("clarifies ambiguity and multiple departments without inventing routes", () => {
    for (const message of ["kamera", "saat", "hoparlör", "hediye arıyorum", "araba ve buzdolabı almak istiyorum"]) expect(classifySecretaryMessage(message).kind).toBe("CLARIFY_DESTINATION");
  });
  it("disambiguates coffee families and resolves qualified or inflected coffee requests", () => {
    for (const message of ["kahve makinesi", "kahve makinası", "kahve makinesine bakıyorum", "Kahve makinesi var mı sizde?", "Sizde kahve makinesi bulunuyor mu?", "Bir kahve makinesi almak istiyorum.", "Kahve makinesi bakıyorum.", "Ev için kahve makinesi arıyorum."]) expect(classifySecretaryMessage(message)).toMatchObject({ kind: "CLARIFY_DESTINATION", choices: expect.arrayContaining([expect.objectContaining({ label: "Türk kahvesi makinesi" })]) });
    const cases = [["Filtre kahve makineniz var mı?", "FILTER_COFFEE_MACHINE"], ["Türk kahvesi yapan bir makine arıyorum.", "TURKISH_COFFEE_MACHINE"], ["Tam otomatik kahve makinesi almak istiyorum.", "FULLY_AUTOMATIC_ESPRESSO_MACHINE"], ["Manuel espresso makinesi var mı?", "MANUAL_ESPRESSO_MACHINE"]] as const;
    for (const [message, category] of cases) expect(classifySecretaryMessage(message)).toMatchObject({ kind: "PROPOSE_NAVIGATION", destination: `/appliances?entry=secretary&category=${category}` });
    expect(classifySecretaryMessage("Kapsüllü kahve makinesi var mı?")).toMatchObject({ kind: "UNSUPPORTED_DESTINATION" });
  });
  it("disambiguates audio without confusing headphones", () => {
    for (const message of ["hoparlör", "Hoparlör var mı sizde?"]) expect(classifySecretaryMessage(message)).toMatchObject({ kind: "CLARIFY_DESTINATION", choices: expect.arrayContaining([expect.objectContaining({ label: "Masaüstü bilgisayar hoparlörü" })]) });
    for (const message of ["bluetooth hoparlör", "taşınabilir hoparlöre bakıyorum", "Bluetooth hoparlör bakıyorum."]) expect(classifySecretaryMessage(message)).toMatchObject({ destination: "/electronics/analysis?category=PORTABLE_SPEAKER&entry=secretary" });
    for (const message of ["televizyon için hoparlör", "Televizyona hoparlör almak istiyorum."]) expect(classifySecretaryMessage(message)).toMatchObject({ destination: "/electronics/analysis?category=SOUNDBAR&entry=secretary" });
    for (const message of ["bilgisayar hoparlörü", "Bilgisayarım için hoparlör lazım."]) expect(classifySecretaryMessage(message)).toMatchObject({ destination: "/electronics/analysis?category=COMPUTER_AUDIO&entry=secretary" });
    expect(classifySecretaryMessage("Kulaklık değil, hoparlör arıyorum.")).toMatchObject({ kind: "CLARIFY_DESTINATION", choices: expect.not.arrayContaining([expect.objectContaining({ label: "Kulaklık" })]) });
    expect(classifySecretaryMessage("Kulaklık istemiyorum, bluetooth hoparlör arıyorum.")).toMatchObject({ destination: "/electronics/analysis?category=PORTABLE_SPEAKER&entry=secretary" });
    expect(classifySecretaryMessage("Hoparlör değil, kulaklık istiyorum.")).toMatchObject({ destination: "/electronics/analysis?category=HEADPHONES&entry=secretary" });
  });
  it("covers common categories, bounded spelling variants, and whole-word safety", () => {
    for (const message of ["tablet", "Telefonunuz var mı?", "televizyon", "Buzdolabınız var mı?", "Bulaşık makinesi satıyor musunuz?", "robot supurge", "air fryer", "şofben"]) expect(classifySecretaryMessage(message).kind).toBe("PROPOSE_NAVIGATION");
    for (const message of ["karabasan için bir şey", "arabacı arıyorum", "bilgisayarcı arıyorum", "hoparlörlük kumaş"]) expect(classifySecretaryMessage(message)).toMatchObject({ kind: "UNSUPPORTED_DESTINATION" });
    expect(classifySecretaryMessage("kapsül kahve makinesi")).toMatchObject({ kind: "UNSUPPORTED_DESTINATION" });
  });
  it("keeps corrections, independent product families, and umbrella choices deterministic", () => {
    expect(classifySecretaryMessage("hayır, otomobil değil; bebek arabası")).toMatchObject({ departmentId: "BABY_AND_CHILD" });
    expect(classifySecretaryMessage("Bir laptop ya da tablet düşünüyorum.")).toMatchObject({ kind: "CLARIFY_DESTINATION", choices: expect.arrayContaining([expect.objectContaining({ label: "Dizüstü bilgisayar" }), expect.objectContaining({ label: "Tablet" })]) });
    expect(classifySecretaryMessage("Evim için kamera arıyorum.")).toMatchObject({ kind: "CLARIFY_DESTINATION", choices: expect.arrayContaining([expect.objectContaining({ label: "Ev güvenlik kamerası" })]) });
    expect(classifySecretaryMessage("Saat bakıyorum.")).toMatchObject({ kind: "CLARIFY_DESTINATION", choices: expect.arrayContaining([expect.objectContaining({ label: "Akıllı saat" }), expect.objectContaining({ label: "Aktivite bilekliği" })]) });
    expect(classifySecretaryMessage("kahve makinesi ve buzdolabı arıyorum")).toMatchObject({ kind: "CLARIFY_DESTINATION", choices: expect.arrayContaining([expect.objectContaining({ label: "Buzdolabı" }), expect.objectContaining({ label: "Türk kahvesi makinesi" })]) });
    expect(classifySecretaryMessage("telefon veya cep telefonu arıyorum")).toMatchObject({ kind: "PROPOSE_NAVIGATION", destination: "/electronics/analysis?category=SMARTPHONE&entry=secretary" });
  });
  it("preserves every governed alias under bounded safe sentence wrappers", () => {
    for (const descriptor of SECRETARY_ROUTE_DESCRIPTORS) for (const alias of descriptor.aliases) {
      const bare = classifySecretaryMessage(alias);
      for (const wrapped of [`Sizde ${alias} var mı?`, `Ev için ${alias} arıyorum.`, `Lütfen, ${alias} almak istiyorum.`]) expect(classifySecretaryMessage(wrapped)).toEqual(bare);
    }
  });
  it("keeps incidental greeting and FAQ category words conversational and hides raw identifiers from copy", () => {
    expect(classifySecretaryMessage("Merhaba, telefon hakkında genel bir sorum var.")).toMatchObject({ kind: "GREETING" });
    expect(classifySecretaryMessage("Merhaba, telefon almak istiyorum.")).toMatchObject({ kind: "PROPOSE_NAVIGATION" });
    expect(classifySecretaryMessage("Telefon siparişim nerede?")).toMatchObject({ kind: "FAQ_RESPONSE" });
    const result = classifySecretaryMessage("Kahve makinesi var mı sizde?");
    expect([result.message, ...(result.kind === "CLARIFY_DESTINATION" ? (result.choices ?? []).map(choice => choice.label) : [])].join(" ")).not.toMatch(/[A-Z]{3,}_[A-Z_]+/u);
  });
  it("answers bounded FAQs", () => {
    expect(classifySecretaryMessage("Expiya nedir?")).toMatchObject({ kind: "FAQ_RESPONSE", link: "/expiya-nedir" });
    expect(classifySecretaryMessage("Siparişim kargoya verildi mi?")).toMatchObject({ kind: "FAQ_RESPONSE", message: expect.stringContaining("kargo göndermez") });
    expect(classifySecretaryMessage("Aktif bölümler hangileri?")).toMatchObject({ kind: "FAQ_RESPONSE" });
  });
  it("warns once, freezes repeated clear abuse, and ignores harmless unknown input", () => {
    expect(classifySecretaryMessage("salak")).toMatchObject({ kind: "SAFETY_WARNING" });
    expect(classifySecretaryMessage("siktir", { priorClearViolations: 1 })).toMatchObject({ kind: "SESSION_FROZEN" });
    expect(classifySecretaryMessage("asdf bir şey arıyorum")).toMatchObject({ kind: "UNSUPPORTED_DESTINATION" });
  });
  it("validates every route against active registry entries without conflicts", () => {
    expect(SECRETARY_ROUTE_DESCRIPTORS.length).toBeGreaterThan(0);
    expect(validateSecretaryRouteDescriptors()).toEqual([]);
  });
});
