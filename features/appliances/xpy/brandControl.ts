import type { AppliancesConversationState, AppliancesRuntimeOutcome } from "../contracts";
import { mutateBrandConstraint, parseBrandConstraintMessage, type CatalogBrand } from "../brandConstraint";

export type BrandProposal = ReturnType<typeof parseBrandConstraintMessage>;
export type ValidatedBrandProposal = Exclude<BrandProposal, { kind: "NONE" } | { kind: "UNKNOWN" }>;

export function proposeBrandControl(input: { readonly message: string; readonly brands: readonly CatalogBrand[]; readonly state: AppliancesConversationState }): BrandProposal {
  return parseBrandConstraintMessage(input.message, input.brands, input.state);
}

export function validateBrandProposal(proposal: BrandProposal, brands: readonly CatalogBrand[]): { readonly kind: "ACCEPTED"; readonly proposal: ValidatedBrandProposal } | { readonly kind: "UNKNOWN"; readonly label: string } | { readonly kind: "NONE" } {
  if (proposal.kind === "NONE") return { kind: "NONE" };
  if (proposal.kind === "UNKNOWN") return { kind: "UNKNOWN", label: proposal.label };
  if (proposal.kind === "SET" && !brands.some(brand => brand.id === proposal.brand.id)) return { kind: "UNKNOWN", label: proposal.brand.label };
  return { kind: "ACCEPTED", proposal };
}

export function reduceBrandControl(input: { readonly state: AppliancesConversationState; readonly proposal: ValidatedBrandProposal; readonly messageId: string; readonly message: string; readonly createdAt: string }): AppliancesConversationState {
  const revision = input.state.revision + 1;
  return { ...mutateBrandConstraint(input.state, input.proposal, { messageId: input.messageId, message: input.message, revision, createdAt: input.createdAt }), revision, updatedAt: input.createdAt };
}

export function unknownBrandOutcome(state: AppliancesConversationState, label: string): AppliancesRuntimeOutcome {
  return { kind: "CLARIFY", questionKey: "appliances.brand.unknown", message: `${label} markası bu kategorideki doğrulanmış ürünler arasında bulunamadı. Katalogdaki bir markayı açıkça belirtir misin?` }; 
}
