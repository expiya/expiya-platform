import { describe, expect, it } from "vitest";

import { evaluateVehicleMediaIntegrity } from "./vehicleMediaIntegrity";

describe("catalog/media joint integrity gate", () => {
  it("binds the governed registry to the active catalog and uses no permanent placeholder", () => {
    const report = evaluateVehicleMediaIntegrity();
    expect(report.catalogFingerprint).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(report.mediaManifestFingerprint).toMatch(/^sha256:[a-f0-9]{64}$/u);
    expect(report.counts).toMatchObject({ exact: 0, representative: 549, placeholder: 0, approximate: 0 });
    expect(report).toMatchObject({ disposition: "READY", issueCodes: [] });
  });
});
