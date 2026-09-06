import { describe, expect, it } from "vitest";
import { usedCarsStagingPrivacyRequestChannels, validatePrivacyRequestChannelManifest } from "./staging/privacyRequestChannelManifest";
import { usedCarsStagingPrivacyDeliveryBoundary, validatePrivacyDeliveryBoundary } from "./staging/privacyDeliveryManifest";
describe("used-cars staging privacy channels", () => {
  it("keeps four intake channels unconfigured", () => expect(validatePrivacyRequestChannelManifest(usedCarsStagingPrivacyRequestChannels)).toMatchObject({ valid: true, realRequestIntakeAuthorized: false }));
  it("keeps secure delivery disabled", () => expect(validatePrivacyDeliveryBoundary(usedCarsStagingPrivacyDeliveryBoundary)).toMatchObject({ valid: true, personalDataExportAuthorized: false }));
});
