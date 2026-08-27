import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";

import { SALES_ADVISOR_DISCLOSURE, SALES_ADVISOR_DISCLOSURE_CHECKSUM, SALES_ADVISOR_DISCLOSURE_VERSION } from "./salesAdvisorDisclosure";

describe("Phase 2 public legal disclosure", () => {
  it("is versioned and checksum-bound", () => {
    const checksum = `sha256:${createHash("sha256").update(JSON.stringify(SALES_ADVISOR_DISCLOSURE)).digest("hex")}`;
    expect(SALES_ADVISOR_DISCLOSURE.version).toBe(SALES_ADVISOR_DISCLOSURE_VERSION);
    expect(checksum).toBe(SALES_ADVISOR_DISCLOSURE_CHECKSUM);
  });

  it("keeps advice, Phase 3 and consent boundaries explicit", () => {
    const copy = Object.values(SALES_ADVISOR_DISCLOSURE).join(" ");
    expect(copy).toMatch(/Satış teklifi, sipariş, rezervasyon/u);
    expect(copy).toMatch(/başvuru, rezervasyon, teklif, bayi aktarımı/u);
    expect(copy).toMatch(/KVKK açık rızası, pazarlama izni/u);
    expect(copy).toMatch(/sahte kıtlık, yapay aciliyet/u);
  });
});
