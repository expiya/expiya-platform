export const opsRoles = [
  "SUPER_ADMIN", "OPERATIONS_MANAGER", "DEALER_VERIFICATION_SPECIALIST",
  "LISTING_MODERATOR", "SENIOR_MODERATOR", "TAXONOMY_EDITOR",
  "TAXONOMY_APPROVER", "FINANCE_OPERATIONS", "SUPPORT_SPECIALIST",
  "TRUST_SAFETY_SPECIALIST", "LEGAL_PRIVACY_SPECIALIST", "AUDIT_VIEWER",
  "SYSTEM_ADMIN",
] as const;

export type OpsRole = (typeof opsRoles)[number];
export type OpsCapability =
  | "VIEW" | "CREATE" | "EDIT" | "APPROVE" | "REJECT" | "SUSPEND"
  | "TEMPORARILY_HIDE" | "PERMANENTLY_CLOSE" | "EXPORT" | "VIEW_PII"
  | "VIEW_DOCUMENT" | "TENANT_ACCESS" | "MANAGE_USERS_ROLES"
  | "VIEW_FINANCE" | "VIEW_AUDIT" | "USE_BREAK_GLASS";

export type OpsScope =
  | "PLATFORM_CONFIGURATION" | "DEALER_APPLICATION" | "DEALER_ACCOUNT"
  | "LISTING" | "TAXONOMY" | "FINANCE" | "SUPPORT" | "TRUST_SAFETY"
  | "LEGAL_PRIVACY" | "AUDIT" | "SYSTEM_HEALTH";

export interface AuthoritativeOpsActor {
  readonly actorId: string;
  readonly subjectId: string;
  readonly active: boolean;
  readonly roles: readonly OpsRole[];
  readonly authzVersion: number;
}

export interface OpsAuthorizationRequest {
  readonly actor: AuthoritativeOpsActor;
  readonly capability: OpsCapability;
  readonly scope: OpsScope;
  readonly assignedTaskId?: string;
  readonly requestedTaskId?: string;
  readonly reasonCode?: string;
}

const roleGrants: Readonly<Record<OpsRole, Readonly<Partial<Record<OpsScope, readonly OpsCapability[]>>>>> = {
  SUPER_ADMIN: {
    PLATFORM_CONFIGURATION: ["VIEW", "CREATE", "EDIT", "MANAGE_USERS_ROLES", "VIEW_AUDIT", "USE_BREAK_GLASS"],
    DEALER_APPLICATION: ["VIEW", "CREATE", "EDIT", "APPROVE", "REJECT", "VIEW_PII", "VIEW_DOCUMENT"],
    DEALER_ACCOUNT: ["VIEW", "EDIT", "APPROVE", "REJECT", "SUSPEND", "PERMANENTLY_CLOSE", "VIEW_PII", "VIEW_DOCUMENT", "TENANT_ACCESS"],
    LISTING: ["VIEW", "CREATE", "EDIT", "APPROVE", "REJECT", "TEMPORARILY_HIDE", "PERMANENTLY_CLOSE"],
    TAXONOMY: ["VIEW", "CREATE", "EDIT", "APPROVE", "REJECT"],
    FINANCE: ["VIEW", "VIEW_FINANCE"], SUPPORT: ["VIEW", "CREATE", "EDIT", "TENANT_ACCESS"],
    TRUST_SAFETY: ["VIEW", "CREATE", "EDIT", "APPROVE", "REJECT", "SUSPEND", "TEMPORARILY_HIDE", "VIEW_PII"],
    LEGAL_PRIVACY: ["VIEW", "CREATE", "EDIT", "VIEW_PII", "VIEW_DOCUMENT"],
    AUDIT: ["VIEW", "VIEW_AUDIT"], SYSTEM_HEALTH: ["VIEW", "EDIT"],
  },
  OPERATIONS_MANAGER: { DEALER_APPLICATION: ["VIEW", "CREATE", "EDIT", "APPROVE", "REJECT", "VIEW_DOCUMENT"], DEALER_ACCOUNT: ["VIEW", "EDIT", "SUSPEND"], SUPPORT: ["VIEW", "CREATE", "TENANT_ACCESS"], AUDIT: ["VIEW_AUDIT"] },
  DEALER_VERIFICATION_SPECIALIST: { DEALER_APPLICATION: ["VIEW", "EDIT", "APPROVE", "REJECT", "VIEW_PII", "VIEW_DOCUMENT"] },
  LISTING_MODERATOR: { LISTING: ["VIEW", "EDIT", "APPROVE", "REJECT", "TEMPORARILY_HIDE"] },
  SENIOR_MODERATOR: { LISTING: ["VIEW", "EDIT", "APPROVE", "REJECT", "TEMPORARILY_HIDE", "PERMANENTLY_CLOSE"], TRUST_SAFETY: ["VIEW", "APPROVE", "REJECT"] },
  TAXONOMY_EDITOR: { TAXONOMY: ["VIEW", "CREATE", "EDIT", "REJECT"] },
  TAXONOMY_APPROVER: { TAXONOMY: ["VIEW", "APPROVE", "REJECT"] },
  FINANCE_OPERATIONS: { FINANCE: ["VIEW", "EDIT", "VIEW_FINANCE"], DEALER_ACCOUNT: ["VIEW"] },
  SUPPORT_SPECIALIST: { SUPPORT: ["VIEW", "CREATE", "EDIT", "TENANT_ACCESS"], DEALER_ACCOUNT: ["VIEW"] },
  TRUST_SAFETY_SPECIALIST: { TRUST_SAFETY: ["VIEW", "CREATE", "EDIT", "SUSPEND", "TEMPORARILY_HIDE", "VIEW_PII"], SUPPORT: ["TENANT_ACCESS"] },
  LEGAL_PRIVACY_SPECIALIST: { LEGAL_PRIVACY: ["VIEW", "CREATE", "EDIT", "APPROVE", "VIEW_PII", "VIEW_DOCUMENT"], AUDIT: ["VIEW_AUDIT"] },
  AUDIT_VIEWER: { AUDIT: ["VIEW", "VIEW_AUDIT"] },
  SYSTEM_ADMIN: { SYSTEM_HEALTH: ["VIEW", "EDIT"], PLATFORM_CONFIGURATION: ["VIEW"], AUDIT: ["VIEW_AUDIT"] },
};

export function authorizeOpsAction(request: OpsAuthorizationRequest): boolean {
  if (!request.actor.active || !request.reasonCode?.trim()) return false;
  if (request.assignedTaskId && request.assignedTaskId !== request.requestedTaskId) return false;
  return request.actor.roles.some((role) => roleGrants[role][request.scope]?.includes(request.capability));
}

export function getOpsRoleGrants(role: OpsRole) { return roleGrants[role]; }

export function canManageOpsUsersAndRoles(input:{readonly actorId:string;readonly roles:readonly OpsRole[];readonly ownerActorId:string}) {
  return input.actorId === input.ownerActorId && input.roles.includes("SUPER_ADMIN");
}
