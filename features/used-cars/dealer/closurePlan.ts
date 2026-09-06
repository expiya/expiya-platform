export type DealerClosureReason = "VOLUNTARY_CLOSURE" | "CONTRACT_TERMINATED" | "PAYMENT_SUSPENSION" | "FRAUD_SUSPENSION" | "LEGAL_ORDER";
export type DealerClosureActionType = "REVOKE_SESSIONS" | "REMOVE_PUBLIC_PROJECTIONS" | "REVOKE_LEAD_GRANTS" | "CANCEL_IMPORT_JOBS" | "REVOKE_PRIVATE_MEDIA_URLS" | "STOP_CHANNEL_HANDOFFS" | "OPEN_RETENTION_REVIEW" | "WRITE_AUDIT_EVENT";

export interface DealerClosurePlan {
  readonly version: "used-cars-dealer-closure-plan/v1";
  readonly eventId: string;
  readonly idempotencyKey: string;
  readonly tenantId: string;
  readonly targetStatus: "SUSPENDED" | "CLOSED";
  readonly reason: DealerClosureReason;
  readonly requestedAt: string;
  readonly requestedByActorId: string;
  readonly actions: readonly { readonly type: DealerClosureActionType; readonly failClosed: true }[];
  readonly personalDataDeletedAutomatically: false;
  readonly executionAuthorized: false;
}

export const requiredDealerClosureActions: readonly DealerClosureActionType[] = Object.freeze([
  "REVOKE_SESSIONS", "REMOVE_PUBLIC_PROJECTIONS", "REVOKE_LEAD_GRANTS", "CANCEL_IMPORT_JOBS",
  "REVOKE_PRIVATE_MEDIA_URLS", "STOP_CHANNEL_HANDOFFS", "OPEN_RETENTION_REVIEW", "WRITE_AUDIT_EVENT",
]);

export function createDealerClosurePlan(input: Omit<DealerClosurePlan,"version"|"actions"|"personalDataDeletedAutomatically"|"executionAuthorized">): DealerClosurePlan {
  if (!input.eventId || !input.idempotencyKey || !input.tenantId || !input.requestedByActorId) throw new Error("CLOSURE_IDENTITY_REQUIRED");
  return Object.freeze({ version:"used-cars-dealer-closure-plan/v1", ...input,
    actions:Object.freeze(requiredDealerClosureActions.map(type=>Object.freeze({type,failClosed:true as const}))),
    personalDataDeletedAutomatically:false, executionAuthorized:false });
}

export function validateDealerClosurePlan(plan: DealerClosurePlan): readonly string[] {
  const present = new Set(plan.actions.map(action=>action.type)); const errors:string[]=[];
  for(const required of requiredDealerClosureActions) if(!present.has(required)) errors.push(`MISSING_ACTION:${required}`);
  if(plan.actions.some(action=>!action.failClosed)) errors.push("NON_FAIL_CLOSED_ACTION");
  if(plan.personalDataDeletedAutomatically) errors.push("AUTOMATIC_PERSONAL_DATA_DELETION_FORBIDDEN");
  if(plan.executionAuthorized) errors.push("UNREVIEWED_EXECUTION_FORBIDDEN");
  return Object.freeze(errors);
}

