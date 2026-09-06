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
    for (const message of ["kahve makinesi", "kahve makinası", "kahve makinesine bakıyorum"]) expect(classifySecretaryMessage(message)).toMatchObject({ kind: "CLARIFY_DESTINATION", choices: expect.arrayContaining([expect.objectContaining({ label: "Türk kahvesi makinesi" })]) });
    const cases = [["filtre kahve makinesi", "FILTER_COFFEE_MACHINE"], ["Türk kahvesi makinesi", "TURKISH_COFFEE_MACHINE"], ["tam otomatik kahve makinesi", "FULLY_AUTOMATIC_ESPRESSO_MACHINE"], ["espresso makinesi", "MANUAL_ESPRESSO_MACHINE"]] as const;
    for (const [message, category] of cases) expect(classifySecretaryMessage(message)).toMatchObject({ kind: "PROPOSE_NAVIGATION", destination: `/appliances?entry=secretary&category=${category}` });
  });
  it("disambiguates audio without confusing headphones", () => {
    expect(classifySecretaryMessage("hoparlör")).toMatchObject({ kind: "CLARIFY_DESTINATION", choices: expect.arrayContaining([expect.objectContaining({ label: "Masaüstü bilgisayar hoparlörü" })]) });
    for (const message of ["bluetooth hoparlör", "taşınabilir hoparlöre bakıyorum"]) expect(classifySecretaryMessage(message)).toMatchObject({ destination: "/electronics/analysis?category=PORTABLE_SPEAKER&entry=secretary" });
    expect(classifySecretaryMessage("televizyon için hoparlör")).toMatchObject({ destination: "/electronics/analysis?category=SOUNDBAR&entry=secretary" });
    expect(classifySecretaryMessage("bilgisayar hoparlörü")).toMatchObject({ destination: "/electronics/analysis?category=COMPUTER_AUDIO&entry=secretary" });
    expect(classifySecretaryMessage("kulaklık")).toMatchObject({ destination: "/electronics/analysis?category=HEADPHONES&entry=secretary" });
  });
  it("covers common categories, bounded spelling variants, and whole-word safety", () => {
    for (const message of ["tablet", "telefon", "televizyon", "buzdolabi", "bulasik makinesi", "robot supurge", "air fryer", "şofben"]) expect(classifySecretaryMessage(message).kind).toBe("PROPOSE_NAVIGATION");
    expect(classifySecretaryMessage("karabasan için bir şey")).toMatchObject({ kind: "UNSUPPORTED_DESTINATION" });
    expect(classifySecretaryMessage("kapsül kahve makinesi")).toMatchObject({ kind: "UNSUPPORTED_DESTINATION" });
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
