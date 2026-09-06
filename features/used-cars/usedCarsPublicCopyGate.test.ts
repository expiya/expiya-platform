import { describe, expect, it } from "vitest";
import { evaluatePublicCopy } from "./content/publicCopyGate";
describe("used-cars public copy gate", () => {
  it("blocks guarantees, pressure and purchase instructions", () => expect(evaluatePublicCopy({ context: "AI_RESPONSE", copy: "Son şans, hemen al; kilometre garantisi var.", evidenceReferences: [], sponsoredLabelPresent: false, safeNextStepPresent: true }).publishable).toBe(false));
  it("requires sponsored labeling", () => expect(evaluatePublicCopy({ context: "SPONSORED", copy: "Kurumsal vitrin", evidenceReferences: [], sponsoredLabelPresent: false, safeNextStepPresent: false }).codes).toContain("SPONSORED_LABEL_REQUIRED"));
  it("accepts explicit uncertainty and a safe next step", () => expect(evaluatePublicCopy({ context: "LISTING", copy: "Kilometre satıcı beyanıdır; bağımsız ekspertizde kontrol edin.", evidenceReferences: [], sponsoredLabelPresent: false, safeNextStepPresent: true }).publishable).toBe(true));
});
