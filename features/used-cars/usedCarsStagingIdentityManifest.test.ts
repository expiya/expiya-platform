import { describe, expect, it } from "vitest";
import { usedCarsStagingIdentityManifest, validateStagingIdentityManifest } from "./staging/identityManifest";
describe("used-cars staging identity manifest", () => {
  it("isolates public, partner and ops audiences", () => expect(new Set([usedCarsStagingIdentityManifest.publicAudience, usedCarsStagingIdentityManifest.partnerAudience, usedCarsStagingIdentityManifest.opsAudience]).size).toBe(3));
  it("uses exact HTTPS callbacks", () => expect(usedCarsStagingIdentityManifest.exactRedirectUris.every((uri) => uri.startsWith("https://") && !uri.includes("*"))).toBe(true));
  it("remains blocked before provider selection", () => expect(validateStagingIdentityManifest(usedCarsStagingIdentityManifest)).toMatchObject({ ready: false, authenticationEnablementAuthorized: false }));
});
