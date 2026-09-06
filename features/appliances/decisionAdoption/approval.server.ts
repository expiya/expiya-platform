import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import {
  MAJOR_APPLIANCE_CATALOG_ACTIVATION_ID,
  MAJOR_APPLIANCE_DECISION_ADOPTION_WORK_UNIT,
  MAJOR_APPLIANCE_SOURCE_BATCH_DIGEST,
  MAJOR_APPLIANCE_SOURCE_PACKAGE_SHA256,
} from "./contract";

const sha256 = (raw: string) => createHash("sha256").update(raw).digest("hex");

export const decisionActivationPointerSchema = z.strictObject({
  workUnitId: z.literal(MAJOR_APPLIANCE_DECISION_ADOPTION_WORK_UNIT),
  approvalManifest: z.string().regex(/^data\/production\/appliances\/decision-adoption\/governance\/approval-events\/[A-Z0-9-]+\/approval\.json$/u),
  approvalManifestSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  lifecycle: z.literal("ACTIVE_DECISION_AUTHORITY"),
});

export type DecisionActivationPointer = z.infer<typeof decisionActivationPointerSchema>;

export function validateDecisionApprovalRaw(pointer: DecisionActivationPointer, raw: string): boolean {
  try {
    if (sha256(raw) !== pointer.approvalManifestSha256) return false;
    const approval = JSON.parse(raw) as Record<string, unknown>;
    return approval.schemaVersion === "major-appliance-decision-owner-approval/v1"
      && approval.workUnitId === MAJOR_APPLIANCE_DECISION_ADOPTION_WORK_UNIT
      && approval.sourceBatchDigest === MAJOR_APPLIANCE_SOURCE_BATCH_DIGEST
      && approval.sourcePackageSha256 === MAJOR_APPLIANCE_SOURCE_PACKAGE_SHA256
      && approval.catalogActivationId === MAJOR_APPLIANCE_CATALOG_ACTIVATION_ID
      && approval.decision === "APPROVE_EXACTLY_16_FOR_XPY_Y_DECISION_MEMBERSHIP"
      && approval.userStatement === "XPY karar adaylarına dahil edelim.";
  } catch {
    return false;
  }
}

export async function validateDecisionActivationPointer(root: string, value: unknown): Promise<boolean> {
  const parsed = decisionActivationPointerSchema.safeParse(value);
  if (!parsed.success) return false;
  const resolved = path.resolve(root, parsed.data.approvalManifest);
  const allowedRoot = `${path.resolve(root, "data/production/appliances/decision-adoption/governance/approval-events")}${path.sep}`;
  if (!resolved.startsWith(allowedRoot)) return false;
  try {
    const raw = await readFile(resolved, "utf8");
    return validateDecisionApprovalRaw(parsed.data, raw);
  } catch {
    return false;
  }
}
