import { describe, expect, it } from "vitest";
import { classifySecretaryMessage } from "./upperSecretary";
import { SECRETARY_ROUTE_DESCRIPTORS, validateSecretaryRouteDescriptors } from "./secretaryRoutingPack";

describe("Expiya Secretary routing governor", () => {
  it("gives compound meanings precedence over vehicle tokens", () => {
    for (const message of ["bebek arabası", "oyuncak araba", "araba koltuğu", "bebek oto koltuğu", "arabalı yatak", "hayır, otomobil değil; bebek arabası"]) expect(classifySecretaryMessage(message)).toMatchObject({ kind: "UNSUPPORTED_DESTINATION" });
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
  it("answers bounded FAQs", () => {
    expect(classifySecretaryMessage("Expiya nedir?")).toMatchObject({ kind: "FAQ_RESPONSE", link: "/expiya-nedir" });
    expect(classifySecretaryMessage("Siparişim kargoya verildi mi?")).toMatchObject({ kind: "FAQ_RESPONSE", message: expect.stringContaining("kargo göndermez") });
    expect(classifySecretaryMessage("Aktif bölümler hangileri?")).toMatchObject({ kind: "FAQ_RESPONSE" });
  });
  it("warns once, freezes repeated clear abuse, and ignores harmless unknown input", () => {
    expect(classifySecretaryMessage("salak")).toMatchObject({ kind: "SAFETY_WARNING" });
    expect(classifySecretaryMessage("siktir", { priorClearViolations: 1 })).toMatchObject({ kind: "SESSION_FROZEN" });
    expect(classifySecretaryMessage("asdf bir şey arıyorum")).toMatchObject({ kind: "CLARIFY_DESTINATION" });
  });
  it("validates every route against active registry entries without conflicts", () => {
    expect(SECRETARY_ROUTE_DESCRIPTORS.length).toBeGreaterThan(0);
    expect(validateSecretaryRouteDescriptors()).toEqual([]);
  });
});
