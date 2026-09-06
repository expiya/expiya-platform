import type { AppliancesConversationStore } from "./persistence/types";
import { loadRecommendationAuthority } from "./recommendation/current.server";
import { projectAuthorizedAppliancesCard } from "./recommendation/projectCard.server";
import { safeAppliancesFailure } from "./conversation.server";
import { recoverDryerCard } from "./dryer/conversation.server";
import { recoverRefrigeratorCard } from "./refrigerator/conversation.server";
import { recoverBoundedCard } from "./bounded/conversation.server";
import { projectAppliancesBudgetStatus } from "./budgetPublic";
import { presentAppliancesOutcome } from "./questionPack";
import { isActiveAppliancesCategoryId } from "./categoryRegistry";

/** READ is side-effect free. The browser stores only a locator, never authority. */
export async function recoverAppliancesConversation(store: AppliancesConversationStore, conversationId: string) {
  const found = await store.load(conversationId);
  if (!found) return null;
  const catalogBinding = { releaseVersion: found.state.pinnedCatalogRelease, releaseDigest: found.state.pinnedCatalogDigest, semanticAuthorityVersion: found.state.pinnedSemanticVersion, semanticAuthorityDigest: found.state.pinnedSemanticDigest };
  if (!isActiveAppliancesCategoryId(found.state.productType)) return { kind: "CONVERSATION" as const, conversationId: found.state.conversationId, revision: found.state.revision, departmentId: found.state.departmentId, productType: found.state.productType, catalogBinding, ended: true, budgetMode: "NEEDS_ONLY" as const, budgetMetadata: undefined, outcome: safeAppliancesFailure() };
  const latestEntry = Object.entries(found.messages).find(([, message]) => message.committedRevision === found.state.revision);
  const latest = latestEntry?.[1];
  let outcome = latest?.outcome.publicOutcome;
  if (outcome?.kind === "DECISION_READY") {
    try {
      if (found.state.productType === "DRYER") {
        outcome = { ...outcome, card: await recoverDryerCard(found.state) };
        return { kind: "CONVERSATION" as const, conversationId: found.state.conversationId, revision: found.state.revision, departmentId: found.state.departmentId, productType: found.state.productType, catalogBinding, ended: found.state.ended, budgetMode: found.state.budgetMode ?? "NEEDS_ONLY", budgetMetadata: found.state.budgetMetadata, outcome:{...outcome,budget:outcome.budget??projectAppliancesBudgetStatus(found.state)} };
      }
      if (found.state.productType === "REFRIGERATOR") {
        outcome = { ...outcome, card: await recoverRefrigeratorCard(found.state) };
        return { kind: "CONVERSATION" as const, conversationId: found.state.conversationId, revision: found.state.revision, departmentId: found.state.departmentId, productType: found.state.productType, catalogBinding, ended: found.state.ended, budgetMode: found.state.budgetMode ?? "NEEDS_ONLY", budgetMetadata: found.state.budgetMetadata, outcome:{...outcome,budget:outcome.budget??projectAppliancesBudgetStatus(found.state)} };
      }
      if (["DISHWASHER", "VACUUM", "ROBOT_VACUUM"].includes(found.state.productType)) {
        outcome = { ...outcome, card: await recoverBoundedCard(found.state) };
        return { kind: "CONVERSATION" as const, conversationId: found.state.conversationId, revision: found.state.revision, departmentId: found.state.departmentId, productType: found.state.productType, catalogBinding, ended: found.state.ended, budgetMode: found.state.budgetMode ?? "NEEDS_ONLY", budgetMetadata: found.state.budgetMetadata, outcome:{...outcome,budget:outcome.budget??projectAppliancesBudgetStatus(found.state)} };
      }
      const record = found.state.decisionRecord;
      if (!record || outcome.decisionFingerprint !== record.authorization.authorityFingerprint) throw new Error("RECOVERY_AUTHORITY_MISMATCH");
      const bundle = await loadRecommendationAuthority(process.cwd(), new Date());
      outcome = { ...outcome, card: projectAuthorizedAppliancesCard(bundle, found.state, record.artifact, record.authorization) };
    } catch { outcome = safeAppliancesFailure(); }
  }
  const sourceEvents = latestEntry ? found.state.ledger.filter(event => event.sourceMessageId === latestEntry[0]) : [];
  return { kind: "CONVERSATION" as const, conversationId: found.state.conversationId, revision: found.state.revision, departmentId: found.state.departmentId, productType: found.state.productType, catalogBinding, ended: found.state.ended, budgetMode: found.state.budgetMode ?? "NEEDS_ONLY", budgetMetadata: found.state.budgetMetadata, ...(outcome ? { outcome:{...presentAppliancesOutcome(found.state.productType,outcome,sourceEvents),budget:outcome.budget??projectAppliancesBudgetStatus(found.state)} } : {}) };
}
