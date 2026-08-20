import { activeEquipmentPublicExplanationAuthorityCompositeBindingChecksum, activeEquipmentPublicExplanationAuthorityPayloadChecksum, activeEquipmentPublicExplanationAuthorityRelease } from "@/data/production/equipment-public-explanation-authority/activeEquipmentPublicExplanationAuthority.generated";
import dailyLifePointer from "@/data/production/equipment-daily-life/active.json";
import { evaluateEquipmentUserIntent } from "./equipmentIntentQuestionPolicy.server";
import { authorizeEquipmentPublicExplanation, getEquipmentPublicPilotScope, listAuthorizedConfirmedEquipmentFeatureCodes, type EquipmentExplanationAuthorizationInput } from "./equipmentPublicExplanationAuthority.server";
import { EQUIPMENT_SESSION_NOTICE, publicEquipmentTelemetry, renderPublicEquipmentExplanationItem } from "./equipmentPublicExplanationRenderer";
import { loadActiveEquipmentPublicExplanationIntegration } from "./equipmentPublicExplanationIntegrationRuntime.server";

export const EQUIPMENT_EXPLANATION_FALLBACK = "Bu araç için doğrulanmış donanım açıklamasını şu anda güvenle açamıyorum. İstersen mevcut araç seçeneklerinden veya diğer ihtiyaçlarından devam edebiliriz.";
export const EQUIPMENT_EXPLANATION_SOLICITATION = "Bu araç için Türkiye resmî donanım listesinde doğruladığımız özelliklerin günlük kullanımdaki olası etkilerini açıklamamı ister misin?";
export const EQUIPMENT_EXPLANATION_ACTIONS = Object.freeze({
  "EPEA_EXPLAIN_BYD_DOLPHIN_COMFORT_MY2025": "6cb56615-37ef-51a8-9202-a73e59d4e14b",
  "EPEA_EXPLAIN_NISSAN_QASHQAI_PLATINUM_PREMIUM_EPOWER_MY2026": "90e65f94-6fdb-5eea-ad7e-0b4e18435427",
} as const);
export type EquipmentExplanationActionId = keyof typeof EQUIPMENT_EXPLANATION_ACTIONS;
export type EquipmentIntegrationPolicy = Readonly<{ state: "PROPOSED_NOT_ACTIVE" | "ACTIVE"; publicEffect: "DISABLED_PENDING_EXPLICIT_APPROVAL" | "ENABLED"; pilotExactVariantIds: readonly string[];
  authorityRelease: string; authorityPayloadChecksum: string; dailyLifeRelease: string; dailyLifePayloadChecksum: string; productionCompositeChecksum: string }>;
export type EquipmentSessionState = Readonly<{ conversationId: string; exactVariantId: string; offerId: string; preference: "UNSET" | "ACCEPTED" | "DECLINED"; noticeShown: boolean }>;

export const inactiveEquipmentIntegrationPolicy: EquipmentIntegrationPolicy = Object.freeze({ state: "PROPOSED_NOT_ACTIVE", publicEffect: "DISABLED_PENDING_EXPLICIT_APPROVAL", pilotExactVariantIds: Object.freeze(Object.values(EQUIPMENT_EXPLANATION_ACTIONS)),
  authorityRelease: activeEquipmentPublicExplanationAuthorityRelease, authorityPayloadChecksum: activeEquipmentPublicExplanationAuthorityPayloadChecksum,
  dailyLifeRelease: dailyLifePointer.activeEquipmentDailyLifeRelease, dailyLifePayloadChecksum: dailyLifePointer.payloadSha256,
  productionCompositeChecksum: activeEquipmentPublicExplanationAuthorityCompositeBindingChecksum });

function productionPolicy(): EquipmentIntegrationPolicy {
  const loaded = loadActiveEquipmentPublicExplanationIntegration();
  return loaded.status === "ACTIVE" ? loaded.policy : inactiveEquipmentIntegrationPolicy;
}

const activePolicyValid = (policy: EquipmentIntegrationPolicy) => policy.state === "ACTIVE" && policy.publicEffect === "ENABLED"
  && policy.authorityRelease === activeEquipmentPublicExplanationAuthorityRelease && policy.authorityPayloadChecksum === activeEquipmentPublicExplanationAuthorityPayloadChecksum
  && policy.dailyLifeRelease === dailyLifePointer.activeEquipmentDailyLifeRelease && policy.dailyLifePayloadChecksum === dailyLifePointer.payloadSha256
  && policy.productionCompositeChecksum === activeEquipmentPublicExplanationAuthorityCompositeBindingChecksum
  && policy.pilotExactVariantIds.length === 2 && policy.pilotExactVariantIds.every((id) => getEquipmentPublicPilotScope().exactVariantIds.includes(id));

export function createEquipmentExplanationCtas(input: Readonly<{ policy?: EquipmentIntegrationPolicy; conversationId: string; offerId: string; lifecycleState: string; revealedExactVariantIds: readonly string[] }>) {
  const policy = input.policy ?? productionPolicy();
  if (!activePolicyValid(policy) || input.lifecycleState !== "REVEALED") return Object.freeze([]);
  return Object.freeze((Object.entries(EQUIPMENT_EXPLANATION_ACTIONS) as [EquipmentExplanationActionId, string][])
    .filter(([, id]) => input.revealedExactVariantIds.includes(id))
    .map(([actionId, exactVariantId]) => Object.freeze({ actionId, exactVariantId, label: "Bu aracı anlat" as const })));
}

export function reduceEquipmentExplanationPreference(state: EquipmentSessionState, input: Readonly<{ conversationId: string; exactVariantId: string; offerId: string; preference: "ACCEPTED" | "DECLINED" }>) {
  if (state.conversationId !== input.conversationId || state.exactVariantId !== input.exactVariantId || state.offerId !== input.offerId) return state;
  return Object.freeze({ ...state, preference: input.preference });
}

export function explainEquipment(input: Readonly<{ policy?: EquipmentIntegrationPolicy; actionId: string; authorization: Omit<EquipmentExplanationAuthorizationInput, "exactVariantId" | "featureCode" | "requestKind" | "explanationRequested">; session: EquipmentSessionState; userQuestion?: string; preferredFeatureCode?: string }>) {
  const policy = input.policy ?? productionPolicy();
  const exactVariantId = EQUIPMENT_EXPLANATION_ACTIONS[input.actionId as EquipmentExplanationActionId];
  const fail = (outcome: string, message = EQUIPMENT_EXPLANATION_FALLBACK) => Object.freeze({ ok: false as const, message, items: Object.freeze([]), options: Object.freeze([]), notice: null, nextSession: input.session, telemetry: publicEquipmentTelemetry("EQUIPMENT_EXPLANATION", outcome, "CURRENT_VEHICLE_SESSION_ONLY") });
  if (!activePolicyValid(policy) || !exactVariantId) return fail("DISABLED_OR_INVALID_ACTION");
  if (input.session.conversationId !== input.authorization.conversationId || input.session.exactVariantId !== exactVariantId || input.session.offerId !== input.authorization.offer.offerId || input.session.preference !== "ACCEPTED") return fail("SESSION_BINDING_FAILED");
  let requestedCodes = listAuthorizedConfirmedEquipmentFeatureCodes(exactVariantId);
  let requestKind: EquipmentExplanationAuthorizationInput["requestKind"] = "POST_REVEAL_EXPLANATION";
  if (input.userQuestion) {
    const match = evaluateEquipmentUserIntent(input.userQuestion, input.preferredFeatureCode).matches[0];
    if (!match?.featureCode) return fail("CLARIFICATION_REQUIRED", match?.clarificationCandidate ?? "Hangi donanım özelliğini kastettiğini biraz açar mısın?");
    requestedCodes = Object.freeze([match.featureCode]); requestKind = "DIRECT_FEATURE_QUESTION";
  } else requestedCodes = Object.freeze([...requestedCodes].sort().slice(0, 5));
  const authorized = requestedCodes.map((featureCode) => authorizeEquipmentPublicExplanation({ ...input.authorization, exactVariantId, featureCode, requestKind, explanationRequested: true }));
  const items = authorized.flatMap((row) => row.unit ? [renderPublicEquipmentExplanationItem(row.unit)] : []);
  if (!items.length) return fail("NO_CLAIM", authorized[0]?.controlledResponse ?? EQUIPMENT_EXPLANATION_FALLBACK);
  const notice = input.session.noticeShown ? null : EQUIPMENT_SESSION_NOTICE;
  return Object.freeze({ ok: true as const, message: null, items: Object.freeze(items), options: Object.freeze(["Güvenlik ve sürüş destekleri", "Konfor ve günlük kullanım", "Bağlantı ve multimedya", "Bu kadar yeterli"]), notice,
    nextSession: Object.freeze({ ...input.session, noticeShown: true }), telemetry: publicEquipmentTelemetry("EQUIPMENT_EXPLANATION", "AUTHORIZED", "CURRENT_VEHICLE_SESSION_ONLY") });
}
