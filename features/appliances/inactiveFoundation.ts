import type { InactiveAppliancesCategoryId } from "./categoryRegistry";
import { APPLIANCES_PORTFOLIO_AUTHORITY_ID, APPLIANCES_PORTFOLIO_DIGEST, resolveAppliancesCategory } from "./categoryRegistry";

export type InactiveAuthoritySlot = Readonly<{
  status: "NOT_READY"; categoryId: InactiveAppliancesCategoryId; portfolioAuthorityId: typeof APPLIANCES_PORTFOLIO_AUTHORITY_ID;
  portfolioDigest: typeof APPLIANCES_PORTFOLIO_DIGEST; domainPack: null; catalog: null; decisionAuthority: null;
}>;
export type InactiveLoaderKind = "CATALOG" | "TECHNICAL" | "MANUAL" | "MEDIA" | "PRICE" | "OFFER";
export type InactiveLoaderResult = Readonly<{ status: "NOT_READY"; items: readonly never[]; authority: "NONE" }>;
export type InactivePaidCapability = Readonly<{ status: "INACCESSIBLE"; reason: "AUTHORIZED_EXACT_DECISION_REQUIRED" }>;
export type InactiveCommercialCapability = "SALES_ADVISOR" | "PAID_COMPARISON";
export interface InactiveCategoryShellBinding {
  readonly status: "NOT_READY";
  readonly stages: Readonly<{ x: "SHELL_ONLY"; p: "INACCESSIBLE"; y: "INACCESSIBLE"; decisionReady: false }>;
  readonly theme: Readonly<{ accent: "EMERALD"; scene: "STUDIO_CYCLORAMA" }>;
  readonly contentSlots: readonly ["CONVERSATION", "DECISION_CARDS", "COMPARISON_REPORT", "ADVISOR", "COMMERCE", "RECOVERY"];
}

export function resolveInactiveAuthoritySlot(categoryId: InactiveAppliancesCategoryId): InactiveAuthoritySlot {
  const category = resolveAppliancesCategory(categoryId);
  if (!category || category.status !== "NOT_READY") throw new TypeError("INACTIVE_CATEGORY_REQUIRED");
  return Object.freeze({ status: "NOT_READY", categoryId, portfolioAuthorityId: APPLIANCES_PORTFOLIO_AUTHORITY_ID, portfolioDigest: APPLIANCES_PORTFOLIO_DIGEST, domainPack: null, catalog: null, decisionAuthority: null });
}
export function loadInactiveCategoryData(categoryId: InactiveAppliancesCategoryId, kind: InactiveLoaderKind): InactiveLoaderResult {
  resolveInactiveAuthoritySlot(categoryId);
  void kind;
  return Object.freeze({ status: "NOT_READY", items: Object.freeze([]), authority: "NONE" });
}
export function resolveInactiveAdvisorOrComparison(categoryId: InactiveAppliancesCategoryId, capability?: InactiveCommercialCapability): InactivePaidCapability {
  resolveInactiveAuthoritySlot(categoryId);
  void capability;
  return Object.freeze({ status: "INACCESSIBLE", reason: "AUTHORIZED_EXACT_DECISION_REQUIRED" });
}
export function resolveInactiveCategoryShell(categoryId: InactiveAppliancesCategoryId): InactiveCategoryShellBinding {
  resolveInactiveAuthoritySlot(categoryId);
  const contentSlots = Object.freeze(["CONVERSATION", "DECISION_CARDS", "COMPARISON_REPORT", "ADVISOR", "COMMERCE", "RECOVERY"] as const);
  return Object.freeze({ status: "NOT_READY", stages: Object.freeze({ x: "SHELL_ONLY", p: "INACCESSIBLE", y: "INACCESSIBLE", decisionReady: false }), theme: Object.freeze({ accent: "EMERALD", scene: "STUDIO_CYCLORAMA" }), contentSlots });
}
