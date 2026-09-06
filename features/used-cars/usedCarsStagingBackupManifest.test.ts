import { describe, expect, it } from "vitest";
import { usedCarsStagingBackupTargets, validateStagingBackupTargets } from "./staging/backupManifest";
describe("used-cars staging backup manifest", () => {
  it("covers six disabled backup classes", () => { expect(usedCarsStagingBackupTargets).toHaveLength(6); expect(validateStagingBackupTargets(usedCarsStagingBackupTargets)).toMatchObject({ valid: true, backupEnablementAuthorized: false }); });
  it("forbids production sources", () => expect(usedCarsStagingBackupTargets.every((item) => !item.productionSourceAllowed && !item.backupEnabled)).toBe(true));
});
