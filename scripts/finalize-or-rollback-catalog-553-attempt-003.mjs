import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const AUDIT = "data/production/catalog/activation-attempts/CATALOG-553-ATOMIC-ACTIVATION-ATTEMPT-003";
const sha = (value) => `sha256:${createHash("sha256").update(value).digest("hex")}`;
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const plan = JSON.parse(readFileSync(path.join(ROOT, "data/production/catalog/release-candidates/v0.55.3/activation-dry-run-attempt-003/atomic-activation-plan.json"), "utf8"));
const paths = {
  catalog: ["data/production/catalog/active.json", "data/production/catalog/activeCatalog.generated.ts"],
  dailyLife: ["data/production/technical-daily-life/active.json", "data/production/technical-daily-life/activeTechnicalDailyLife.generated.ts"],
  persona: ["data/production/personas/safe-traits/active.json", "data/production/personas/safe-traits/activeVehiclePersonaSafeTraits.generated.ts"],
  equipment: ["data/production/equipment-evidence/active.json", "data/production/equipment-evidence/activeEquipmentEvidence.generated.ts"],
};
const mode = process.argv[2];
if (mode === "--rollback") {
  for (const [key, files] of Object.entries(paths)) {
    writeFileSync(path.join(ROOT, files[0]), readFileSync(path.join(ROOT, AUDIT, "rollback-bytes", `${key}-pointer.bin`)));
    writeFileSync(path.join(ROOT, files[1]), readFileSync(path.join(ROOT, AUDIT, "rollback-bytes", `${key}-module.bin`)));
  }
  writeFileSync(path.join(ROOT, AUDIT, "external-post-validation-result.json"), json({ status: "FAILED_AND_ROLLED_BACK", rolledBackAllFourLayers: true }));
  process.exit(0);
}
if (mode !== "--finalize") throw new Error("USE_--finalize_OR_--rollback");
for (const [key, files] of Object.entries(paths)) {
  if (sha(readFileSync(path.join(ROOT, files[0]))) !== plan.proposedPointerChecksums[key] || sha(readFileSync(path.join(ROOT, files[1]))) !== plan.proposedGeneratedModuleChecksums[key]) throw new Error(`${key.toUpperCase()}_FINAL_CHECKSUM_MISMATCH`);
}
writeFileSync(path.join(ROOT, AUDIT, "external-post-validation-result.json"), json({ status: "PASSED", finalStatus: "ACTIVATED_AND_POST_VALIDATED", allFourPointerAndModuleChecksumsVerified: true, commitPushDeploymentMigrationDatabaseWritePerformed: false }));
console.log(json({ status: "ACTIVATED_AND_POST_VALIDATED" }));
