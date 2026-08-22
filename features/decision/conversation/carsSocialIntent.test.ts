import { describe, expect, it } from "vitest";

import {
  interpretLatestUserAct,
  isExplicitCorrectionText,
  isPureGreetingText,
  textHasVehicleIntent,
} from "./carsSocialIntent";
import { emptyConversationTrace } from "./carsRequirementLedger";

function user(content: string) {
  return [{ id: "u", role: "user" as const, content }];
}

describe("social intent", () => {
  it("recognizes only an explicit non-empty correction turn", () => {
    expect(isExplicitCorrectionText("Düzeltme: otomatik değil manuel olsun")).toBe(true);
    expect(isExplicitCorrectionText("düzeltme:")).toBe(false);
    expect(isExplicitCorrectionText("otomatik değil manuel olsun")).toBe(false);
  });

  it("treats Merhaba as a pure greeting without vehicle intent", () => {
    const act = interpretLatestUserAct(user("Merhaba"));
    expect(act.primaryAct).toBe("GREETING");
    expect(act.isPureGreeting).toBe(true);
    expect(act.hasVehicleIntent).toBe(false);
    expect(isPureGreetingText("Merhaba")).toBe(true);
    expect(textHasVehicleIntent("Merhaba")).toBe(false);
  });

  it("keeps repeated Merhaba :) social", () => {
    const act = interpretLatestUserAct([
      { id: "1", role: "user", content: "Merhaba" },
      { id: "2", role: "assistant", content: "Merhaba! Hoş geldiniz. Nasıl yardımcı olabilirim?" },
      { id: "3", role: "user", content: "Merhaba :)" },
    ], { ...emptyConversationTrace(), vehicleIntentEstablished: false });
    expect(act.primaryAct).toBe("GREETING");
    expect(act.isPureGreeting).toBe(true);
  });

  it("treats Nasılsın? as ordinary social conversation", () => {
    expect(interpretLatestUserAct(user("Nasılsın?")).primaryAct).toBe("SOCIAL_CHECK_IN");
    expect(interpretLatestUserAct(user("Nasılsın?")).secondaryActs).toContain("CASUAL");
  });

  it("treats Teşekkürler as thanks", () => {
    expect(interpretLatestUserAct(user("Teşekkürler")).primaryAct).toBe("THANKS");
  });

  it("detects greeting plus family-car intent", () => {
    const act = interpretLatestUserAct(user("Merhaba, aile için araç bakıyorum"));
    expect(act.primaryAct).toBe("VEHICLE_INTENT");
    expect(act.hasVehicleIntent).toBe(true);
    expect(act.callsForSocialResponseFirst).toBe(true);
  });

  it("detects off-road phrasing as vehicle intent", () => {
    expect(textHasVehicleIntent("arazi aracı var mı sizde")).toBe(true);
    expect(interpretLatestUserAct(user("arazi aracı var mı sizde")).primaryAct).toBe("VEHICLE_INTENT");
    expect(interpretLatestUserAct(user("kötü yol şartlarına uygun olsun")).hasVehicleIntent).toBe(true);
  });
});
