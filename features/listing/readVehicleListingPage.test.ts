import { describe, expect, it } from "vitest";

import { assertPublicListingUrl } from "./readVehicleListingPage";

describe("listing URL safety", () => {
  it("accepts a public HTTPS address", async () => {
    await expect(assertPublicListingUrl("https://8.8.8.8/vehicle/1")).resolves.toMatchObject({ protocol: "https:" });
  });

  it.each([
    "http://8.8.8.8/vehicle/1",
    "https://127.0.0.1/secret",
    "https://10.0.0.1/secret",
    "https://192.168.1.2/secret",
    "https://169.254.169.254/latest/meta-data",
    "https://localhost/secret",
    "https://user:pass@8.8.8.8/vehicle/1",
    "https://8.8.8.8:8443/vehicle/1",
  ])("rejects unsafe URL %s", async (url) => {
    await expect(assertPublicListingUrl(url)).rejects.toThrow();
  });
});
