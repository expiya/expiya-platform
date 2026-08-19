import { describe, expect, it } from "vitest";
import { assertTechnicalDailyLifeReleaseName } from "./technicalDailyLifeReleaseName";

describe("technical daily-life release grammar", () => {
  it.each(["v2.1-0.55.2-2026-08-18-compatibility-rebind", "v2.1.1-0.55.3-2026-08-19-compatibility-rebind"])("accepts %s", (value) => expect(() => assertTechnicalDailyLifeReleaseName(value)).not.toThrow());
  it.each(["vv2.1-0.55.3-2026-08-19-compatibility-rebind", "v2.1.1-2026-08-19-compatibility-rebind", "v2.1.1-0.55.3-compatibility-rebind", "v2.1.x-0.55.3-2026-08-19-compatibility-rebind", "v2.1.1/0.55.3-2026-08-19-compatibility-rebind", "../v2.1.1-0.55.3-2026-08-19-compatibility-rebind", "v2.1.1-0.55.3-2026-08-19-extra", " v2.1.1-0.55.3-2026-08-19-compatibility-rebind"])("rejects %s", (value) => expect(() => assertTechnicalDailyLifeReleaseName(value)).toThrow());
});
