import type { DealerRole, ExpiyaRole, TenantActor, TenantResource } from "./contracts";
import { canAccessTenantResource } from "./contracts";

export type UsedCarsAction =
  | "DEALER_SETTINGS_READ" | "DEALER_SETTINGS_WRITE" | "BRANCH_MANAGE"
  | "TEAM_READ" | "TEAM_MANAGE" | "MEMBERSHIP_READ" | "MEMBERSHIP_MANAGE"
  | "INVENTORY_READ" | "INVENTORY_WRITE" | "LISTING_SUBMIT"
  | "LEAD_READ" | "LEAD_MANAGE" | "ANALYTICS_READ" | "AUDIT_READ"
  | "TAXONOMY_MODERATE" | "DEALER_MODERATE" | "LISTING_MODERATE"
  | "FRAUD_MANAGE" | "PLATFORM_ADMIN";

const dealerPermissions: Readonly<Record<DealerRole, readonly UsedCarsAction[]>> = {
  DEALER_OWNER: ["DEALER_SETTINGS_READ", "DEALER_SETTINGS_WRITE", "BRANCH_MANAGE", "TEAM_READ", "TEAM_MANAGE", "MEMBERSHIP_READ", "MEMBERSHIP_MANAGE", "INVENTORY_READ", "INVENTORY_WRITE", "LISTING_SUBMIT", "LEAD_READ", "LEAD_MANAGE", "ANALYTICS_READ", "AUDIT_READ"],
  DEALER_ADMIN: ["DEALER_SETTINGS_READ", "DEALER_SETTINGS_WRITE", "BRANCH_MANAGE", "TEAM_READ", "TEAM_MANAGE", "MEMBERSHIP_READ", "INVENTORY_READ", "INVENTORY_WRITE", "LISTING_SUBMIT", "LEAD_READ", "LEAD_MANAGE", "ANALYTICS_READ", "AUDIT_READ"],
  BRANCH_MANAGER: ["TEAM_READ", "INVENTORY_READ", "INVENTORY_WRITE", "LISTING_SUBMIT", "LEAD_READ", "LEAD_MANAGE", "ANALYTICS_READ"],
  INVENTORY_EDITOR: ["INVENTORY_READ", "INVENTORY_WRITE", "LISTING_SUBMIT"],
  SALES_ADVISOR: ["INVENTORY_READ", "LEAD_READ", "LEAD_MANAGE"],
  REPORT_VIEWER: ["INVENTORY_READ", "ANALYTICS_READ"],
};

const expiyaPermissions: Readonly<Record<ExpiyaRole, readonly UsedCarsAction[]>> = {
  EXPIYA_MODERATOR: ["TAXONOMY_MODERATE", "DEALER_MODERATE", "LISTING_MODERATE", "FRAUD_MANAGE", "AUDIT_READ"],
  EXPIYA_SYSTEM_ADMIN: ["PLATFORM_ADMIN", "AUDIT_READ"],
};

export function authorizeDealerAction(actor: TenantActor, resource: TenantResource, action: UsedCarsAction): boolean {
  return canAccessTenantResource(actor, resource) && dealerPermissions[actor.role].includes(action);
}

export function authorizeExpiyaAction(role: ExpiyaRole, action: UsedCarsAction, stepUpVerified: boolean): boolean {
  if (!stepUpVerified) return false;
  return expiyaPermissions[role].includes(action);
}
