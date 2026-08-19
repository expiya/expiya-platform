import { describe, expect, it } from "vitest";
import { canonicalCatalogReleaseDirectoryName, normalizeCatalogReleaseVersion } from "./releasePath";

describe("canonical catalog release paths", () => {
  it.each([["0.55.3", "0.55.3"], ["v0.55.3", "0.55.3"]])("normalizes %s", (input, expected) => { expect(normalizeCatalogReleaseVersion(input)).toBe(expected); expect(canonicalCatalogReleaseDirectoryName(input)).toBe(`v${expected}`); });
  it.each(["", "vv0.55.3", "v", "0.55", "0.55.3/manifest", "../0.55.3", "0.55.3\\x", "0.55.3-extra", " 0.55.3", "v0.55.3 "])("rejects unsafe %s", (input) => expect(() => normalizeCatalogReleaseVersion(input)).toThrow("Invalid catalog release version"));
});
