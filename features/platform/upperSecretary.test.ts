import { describe, expect, it } from "vitest";

import { classifySecretaryMessage } from "./upperSecretary";

describe("Upper Secretary routing governor", () => {
  it("routes a rich Cars request without interpreting the recommendation", () => {
    expect(classifySecretaryMessage("2 milyon TL'ye kadar ailem için güvenli bir SUV arıyorum.")).toEqual({
      kind: "ROUTE",
      departmentId: "CARS",
      destination: "/cars?entry=secretary",
      message: "Elbette. Sizi otomobil bölümümüze bağlıyorum.",
    });
  });

  it("fails closed for known but inactive departments", () => {
    expect(classifySecretaryMessage("Üniversite için laptop almak istiyorum.")).toMatchObject({ kind: "UNSUPPORTED", departmentId: "ELECTRONICS" });
    expect(classifySecretaryMessage("Yeni bir buzdolabı arıyorum.")).toMatchObject({ kind: "UNSUPPORTED", departmentId: "APPLIANCES" });
  });

  it("does not launch multiple departments", () => {
    expect(classifySecretaryMessage("Araba ve televizyon almak istiyorum.")).toMatchObject({ kind: "MULTI_INTENT" });
  });

  it("keeps reception and routing clarification separate", () => {
    expect(classifySecretaryMessage("Merhaba")).toMatchObject({ kind: "NON_DECISION" });
    expect(classifySecretaryMessage("Ev için bir şey arıyorum")).toMatchObject({ kind: "CLARIFY" });
  });
});
