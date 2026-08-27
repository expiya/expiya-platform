import { describe, expect, it } from "vitest";
import { disclosureForEquipmentDisposition } from "./equipmentCardProjection";

describe("V3 equipment card disclosure matrix", () => {
  it("publishes only an exact verified assertion as a controlled positive claim", () => {
    expect(disclosureForEquipmentDisposition("EXACT_VARIANT_VERIFIED")).toEqual({ claim: "EXACT_VARIANT_VERIFIED", badge: "Doğrulanmış donanım" });
  });

  it.each(["FAMILY_CAPABILITY", "RESEARCHED_INCONCLUSIVE"] as const)("warns without ownership language for %s", (disposition) => {
    const output = disclosureForEquipmentDisposition(disposition);
    expect(output.claim).toBe("EXACT_VARIANT_UNVERIFIED");
    expect(output.warning).toMatch(/exact versiyon için doğrulanmadı/iu);
  });

  it("does not present conditional or package-dependent equipment as standard", () => {
    const output = disclosureForEquipmentDisposition("CONDITIONAL");
    expect(output.claim).toBe("EXACT_VARIANT_UNVERIFIED");
    expect(output.warning).toMatch(/paket veya koşula bağlı.*standart olduğu doğrulanmadı/iu);
    expect(output.badge).toBeUndefined();
  });

  it.each(["UNKNOWN", "SILENT_ABSENCE"] as const)("does not turn %s into a negative assertion", (disposition) => {
    expect(disclosureForEquipmentDisposition(disposition)).toEqual({ claim: "UNKNOWN", warning: "Bu bilgi doğrulanamadı." });
  });

  it.each(["CONFLICT", "PILOT_OUTSIDE"] as const)("emits no claim for %s", (disposition) => {
    expect(disclosureForEquipmentDisposition(disposition)).toEqual({ claim: "NO_CLAIM" });
  });

  it("keeps internal evidence identifiers outside the disclosure contract", () => {
    const payload = JSON.stringify(disclosureForEquipmentDisposition("RESEARCHED_INCONCLUSIVE"));
    expect(payload).not.toMatch(/assertion|checksum|sha256|audit|governance|sourceId/iu);
  });
});
