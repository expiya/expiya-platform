import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("database/migrations/0018_electronics_stage2_authority_foundation.sql", "utf8");

describe("Electronics Stage 2 authority migration", () => {
  it("is transactional, idempotent and contains no data-changing statement", () => {
    expect(sql.trim().startsWith("begin;")).toBe(true);
    expect(sql.trim().endsWith("commit;")).toBe(true);
    expect(sql.match(/create table if not exists/giu)).toHaveLength(3);
    expect(sql).not.toMatch(/(?:^|;)\s*(?:insert|update|delete|truncate)\b/imu);
    expect(sql).not.toMatch(/drop\s+(table|column)/iu);
  });

  it("reuses the shared entitlement store and only widens its department check", () => {
    expect(sql).toContain("alter table comparison_entitlements");
    expect(sql).toContain("'APPLIANCES','CARS','ELECTRONICS'");
    expect(sql).not.toContain("electronics_comparison_entitlements");
    expect(sql).toContain("not valid");
    expect(sql).toContain("validate constraint comparison_entitlements_department_id_check");
  });

  it("persists consent, issuance and append-only handoff lifecycle authority", () => {
    for (const term of [
      "electronics_stage2_consent_events",
      "electronics_stage2_handoff_issuances",
      "electronics_stage2_handoff_events",
      "authority_fingerprint",
      "token_fingerprint",
      "nonce_fingerprint",
      "key_version",
      "expires_at > issued_at",
      "REVISION_BOUND_REUSABLE_UNTIL_EXPIRY",
      "REPLAY_OBSERVED",
      "REVOKED",
      "EXPIRED",
      "idempotency_key",
    ]) expect(sql).toContain(term);
    expect(sql.match(/references electronics_conversations/giu)).toHaveLength(2);
    expect(sql).toContain("references electronics_stage2_consent_events");
    expect(sql).toContain("references electronics_stage2_handoff_issuances");
  });
});
