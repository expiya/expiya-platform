import { createHash } from "node:crypto";
import { usedVehicleDraftInputSchema, type UsedVehicleDraftInput } from "./schemas";

export interface ImportDryRunRow {
  readonly rowNumber: number;
  readonly status: "ACCEPTED" | "REJECTED" | "DUPLICATE_IN_BATCH";
  readonly normalizedInput?: UsedVehicleDraftInput;
  readonly errorCodes: readonly string[];
  readonly rowFingerprint: string;
}

export interface ImportDryRunResult {
  readonly version: "used-inventory-import-dry-run/v1";
  readonly tenantId: string;
  readonly idempotencyKey: string;
  readonly sourceChecksum: string;
  readonly rows: readonly ImportDryRunRow[];
  readonly acceptedCount: number;
  readonly rejectedCount: number;
  readonly writeAuthorized: false;
}

const fingerprint = (value: unknown) => `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;

export function dryRunInventoryImport(input: {
  readonly tenantId: string;
  readonly idempotencyKey: string;
  readonly sourceChecksum: string;
  readonly rows: readonly unknown[];
}): ImportDryRunResult {
  const seen = new Set<string>();
  const rows = input.rows.map((row, index): ImportDryRunRow => {
    const parsed = usedVehicleDraftInputSchema.safeParse(row);
    const rowFingerprint = fingerprint(row);
    if (!parsed.success) return { rowNumber: index + 1, status: "REJECTED", errorCodes: parsed.error.issues.map((issue) => `${issue.path.join(".") || "row"}:${issue.code}`), rowFingerprint };
    if (parsed.data.tenantId !== input.tenantId) return { rowNumber: index + 1, status: "REJECTED", errorCodes: ["tenantId:TENANT_MISMATCH"], rowFingerprint };
    const duplicateKey = `${parsed.data.tenantId}:${parsed.data.vin}`;
    if (seen.has(duplicateKey)) return { rowNumber: index + 1, status: "DUPLICATE_IN_BATCH", errorCodes: ["vin:DUPLICATE_IN_BATCH"], rowFingerprint };
    seen.add(duplicateKey);
    return { rowNumber: index + 1, status: "ACCEPTED", normalizedInput: parsed.data, errorCodes: [], rowFingerprint };
  });
  return Object.freeze({
    version: "used-inventory-import-dry-run/v1",
    tenantId: input.tenantId,
    idempotencyKey: input.idempotencyKey,
    sourceChecksum: input.sourceChecksum,
    rows,
    acceptedCount: rows.filter((row) => row.status === "ACCEPTED").length,
    rejectedCount: rows.filter((row) => row.status !== "ACCEPTED").length,
    writeAuthorized: false,
  });
}

