import { describe, expect, it } from "vitest";
import { usedCarsStagingDatabaseRoles, validateStagingDatabaseRoles } from "./staging/databaseRoles";
describe("used-cars staging database roles", () => {
  it("defines six valid isolated roles", () => { expect(usedCarsStagingDatabaseRoles).toHaveLength(6); expect(validateStagingDatabaseRoles(usedCarsStagingDatabaseRoles)).toEqual([]); });
  it("allows only the non-login migration owner to own tables", () => expect(usedCarsStagingDatabaseRoles.filter((item) => item.ownsTables).map((item) => item.role)).toEqual(["MIGRATION_OWNER"]));
  it("grants no BYPASSRLS role", () => expect(usedCarsStagingDatabaseRoles.every((item) => !item.bypassRls)).toBe(true));
});
