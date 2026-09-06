import type { XpyAssistantResult, XpyDomainReentryConfig } from "./contracts";
import { detectXpyAdvisoryIntent } from "./advisory";

export interface XpyTextProposal { readonly message: string }
export const renderDomainReentry = (reentry: XpyDomainReentryConfig) => `Bu oturum ${reentry.decisionJourneyPurpose} için ayrılmış durumda. ${reentry.reentryPrompt}`;

export function interpretPlatformAssistant(message: string, hasPendingQuestion: boolean, reentry?: XpyDomainReentryConfig): XpyAssistantResult<XpyTextProposal> {
  const text = message.trim();
  const governedReference = reentry?.governedReferences?.find(reference => reference.aliases.some(alias => text.toLocaleLowerCase("tr-TR").includes(alias.toLocaleLowerCase("tr-TR"))));
  const advisory = detectXpyAdvisoryIntent(text);
  const intent = /(?:kablo|priz|motor|cihaz).*(?:sök|tamir|açayım)|çarpıl|kendime zarar/iu.test(text) ? "SAFETY"
    : /şimdilik vazgeçtim|kapatalım|sonra devam|görüşürüz/iu.test(text) ? "CLOSING"
    : /^(?:merhaba|selam|teşekkürler|sağ ol|tamam)[.! ]*$/iu.test(text) ? "SOCIAL"
    : /hava nasıl|film öner|kaç yaşındasın/iu.test(text) ? "OFF_TOPIC"
    : advisory?.kind === "FEATURE_EDUCATION" || advisory?.kind === "COMPARISON_INFORMATION" ? "INFORMATION"
    : advisory ? "ADVISORY"
    : /\?|nedir|ne demek|ne işe yarar|farkı ne/iu.test(text) ? "INFORMATION"
    : /aslında|düzelt|unut|kaldır|boş ver/iu.test(text) ? "CORRECTION"
    : "DECISION_CONTEXT";
  const directResponse = governedReference?.clarification ?? (intent === "OFF_TOPIC" && reentry ? renderDomainReentry(reentry) : undefined);
  return { intent: governedReference ? "INFORMATION" : intent, proposals: [{ message: text }], ...(directResponse ? { directResponse } : {}), preservePendingQuestion: hasPendingQuestion && ["INFORMATION", "ADVISORY", "SOCIAL", "OFF_TOPIC", "SAFETY"].includes(intent) };
}
