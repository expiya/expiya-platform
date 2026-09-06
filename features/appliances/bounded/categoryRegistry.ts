import type { AppliancesLedgerEvent, AppliancesRuntimeOutcome } from "../contracts";
import type { BoundedProductType } from "./authority.server";
import { pendingAnswerPolarity } from "../conversation/pendingAnswer";
import { renderDomainReentry } from "@/features/xpy/assistant";
import { requireXpyReentry } from "@/features/xpy/domainPacks";

export interface BoundedProposal {
  readonly conceptId: string;
  readonly value: unknown;
  readonly span: string;
  readonly kind: "SET" | "CORRECT" | "CLEAR";
  readonly strength: AppliancesLedgerEvent["strength"];
  readonly decisionUse: AppliancesLedgerEvent["decisionUse"];
}

export interface BoundedInterpretation {
  readonly proposals: readonly BoundedProposal[];
  readonly clarification?: { readonly questionKey: string; readonly message: string };
  readonly response?: Extract<AppliancesRuntimeOutcome, { kind: "RESPOND" }>;
}

const number = (raw: string) => Number(raw.replace(",", "."));
const mm = (raw: string, unit: string) => number(raw) * (unit.toLocaleLowerCase("tr-TR") === "cm" ? 10 : 1);

function airPurifierRoomArea(message: string, lastQuestionKey: string | undefined): { readonly roomAreaM2: number; readonly approximate: boolean; readonly span: string } | undefined {
  const qualified = message.match(/(?:yaklaşık|ortalama|tahminen|takriben)?\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*(?:m\s*(?:2|²)|metre\s*kare|metrekare)(?:lik|lık|luk|lük)?(?=\s|$|[.,;:!?])/iu);
  const pending = lastQuestionKey === "appliances.air-purifier.room-area" ? message.match(/^\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*$/u) : undefined;
  const match = qualified ?? pending;
  if (!match) return undefined;
  const roomAreaM2 = number(match[1]);
  if (!Number.isFinite(roomAreaM2) || roomAreaM2 <= 0 || roomAreaM2 > 1_000) return undefined;
  return { roomAreaM2, approximate: /yaklaşık|ortalama|tahminen|takriben/iu.test(message), span: match[0] };
}

function common(message: string): BoundedProposal[] {
  const proposals: BoundedProposal[] = [];
  const correction = /aslında|düzelt/iu.test(message);
  const add = (conceptId: string, value: unknown, span: string, strength: BoundedProposal["strength"], decisionUse: BoundedProposal["decisionUse"], kind: BoundedProposal["kind"] = correction ? "CORRECT" : "SET") => proposals.push({ conceptId, value, span, strength, decisionUse, kind });
  for (const [pattern, concept] of [[/(?:ölçü|yükseklik|genişlik|derinlik).*(?:kaldır|unut|boş ver)/iu, "FIT"], [/(?:kapasite|kişilik|hazne).*(?:kaldır|unut|boş ver)/iu, "CAPACITY"]] as const) {
    const found = message.match(pattern);
    if (found) add(concept, null, found[0], "HYPOTHESIS", "NONE", "CLEAR");
  }
  const dimensions: Record<string, number> = {};
  for (const [label, key] of [["genişlik", "maxWidthMm"], ["yükseklik", "maxHeightMm"], ["derinlik", "maxDepthMm"]] as const) {
    const found = message.match(new RegExp(`${label}\\s*(?:en fazla\\s*)?(\\d+(?:[.,]\\d+)?)\\s*(cm|mm)`, "iu"));
    if (found) dimensions[key] = mm(found[1], found[2]);
  }
  if (Object.keys(dimensions).length) add("FIT", dimensions, message, "HARD", "HARD_FILTER");
  return proposals;
}

function response(type: BoundedProductType, message: string, revision: number): BoundedInterpretation["response"] {
  if (/^(?:merhaba|selam|teşekkürler|tamam)[.! ]*$/iu.test(message.trim())) return { kind: "RESPOND", responseKind: "SOCIAL_ACKNOWLEDGEMENT", message: "Rica ederim; mevcut karar bağlamını koruyorum.", conversationDisposition: "CONTINUE", contextMutation: "NONE", contextRevision: revision };
  if (/hava nasıl|film öner/iu.test(message)) return { kind: "RESPOND", responseKind: "OFF_TOPIC_REDIRECT", message: renderDomainReentry(requireXpyReentry("APPLIANCES", type)), conversationDisposition: "CONTINUE", contextMutation: "NONE", contextRevision: revision };
  if (/(?:kablo|priz|motor|cihaz).*(?:sök|tamir|açayım)|çarpıl/iu.test(message)) return { kind: "RESPOND", responseKind: "SAFETY_BOUNDARY", message: "Elektrik veya cihaz içi onarımı kendin yapma; yetkili servis ya da nitelikli uzmandan destek al.", conversationDisposition: "CONTINUE", contextMutation: "NONE", contextRevision: revision };
  if (/şimdilik vazgeçtim|kapatalım|sonra devam/iu.test(message)) return { kind: "RESPOND", responseKind: "USER_CLOSING", message: "Elbette, burada kapatalım.", conversationDisposition: "END", contextMutation: "NONE", contextRevision: revision };
  if (!/(nedir|ne demek|önemli mi|kaç watt|pascal|\bpa\b)/iu.test(message)) return undefined;
  const text = type === "VACUUM" ? "Motor giriş gücü temizlik veya emiş performansı değildir; filtre ve toplama iddiaları yalnız doğrulanmış test kapsamlarında değerlendirilir." : type === "ROBOT_VACUUM" ? "Pascal, çalışma süresi ve navigasyon üretici beyanlarıdır; ev sonucu veya çapraz marka üstünlüğü garanti etmez." : "Enerji, su, ses ve kapasite yalnız aynı doğrulanmış etiket rejimi ve Eco çevrimi bağlamında karşılaştırılır.";
  return { kind: "RESPOND", responseKind: "DOMAIN_INFORMATION", message: text, conversationDisposition: "CONTINUE", contextMutation: "NONE", contextRevision: revision };
}

export function interpretBoundedCategory(type: BoundedProductType, message: string, lastQuestionKey: string | undefined, revision: number): BoundedInterpretation {
  const proposals = common(message);
  const add = (conceptId: string, value: unknown, span = message, strength: BoundedProposal["strength"] = "STRONG", decisionUse: BoundedProposal["decisionUse"] = "SOFT_RANK") => proposals.push({ conceptId, value, span, strength, decisionUse, kind: /aslında|düzelt/iu.test(message) ? "CORRECT" : "SET" });
  const polarity = pendingAnswerPolarity(message);

  if (type === "DISHWASHER") {
    const places = message.match(/(?:en az\s*)?(\d{1,2})\s*kişilik/iu);
    if (places) add("CAPACITY", { minimum: Number(places[1]) }, places[0], "HARD", "HARD_FILTER");
    if (/kalabalık sofralar|çok misafir|kalabalık aile/iu.test(message)) add("CAPACITY", { preference: "LARGE", numericConstraint: false }, message, "HYPOTHESIS", "QUESTION_INPUT");
    if (lastQuestionKey === "appliances.dishwasher.capacity" && /^\s*\d{1,2}\s*$/u.test(message)) add("CAPACITY", { minimum: Number(message.trim()) }, message, "HARD", "HARD_FILTER");
    if (lastQuestionKey === "appliances.dishwasher.capacity" && polarity === "NO") add("CAPACITY", { numericConstraint: false, declined: true }, message, "HYPOTHESIS", "NONE");
    if (lastQuestionKey === "appliances.dishwasher.fit" && polarity === "NO") add("FIT", { declined: true }, message, "HYPOTHESIS", "NONE");
    if (/plastikler.*(?:ıslak kalmasın|kuru)|otomatik kapı/iu.test(message)) add("AUTO_OPEN_DRY", true);
    if (/çatal.*(?:çekmece|raf)/iu.test(message)) add("CUTLERY_TRAY", true);
    if (/sessiz çalışsın|gürültü olmasın/iu.test(message)) add("LOW_NOISE", true);
    if (lastQuestionKey === "appliances.dishwasher.material" && /fark etmez|emin değilim|bilmiyorum/iu.test(message)) add("ECO_RESOURCE", { declined: true }, message, "HYPOTHESIS", "NONE");
  }
  if (type === "VACUUM") {
    const litres = message.match(/(?:en az\s*)?(\d+(?:[.,]\d+)?)\s*(?:litre|l)\s*(?:hazne)?/iu);
    if (litres) add("CAPACITY", { minimum: number(litres[1]) }, litres[0], "HARD", "HARD_FILTER");
    const radius = message.match(/(?:en az\s*)?(\d+(?:[.,]\d+)?)\s*metre\s*(?:erişim|yarıçap)/iu);
    if (radius) add("RADIUS", { minimumM: number(radius[1]) }, radius[0], "HARD", "HARD_FILTER");
    if (lastQuestionKey === "appliances.vacuum.radius" && /^\s*\d+(?:[.,]\d+)?\s*(?:m|metre)?\s*$/iu.test(message)) add("RADIUS", { minimumM: number(message.match(/\d+(?:[.,]\d+)?/u)![0]) }, message, "HARD", "HARD_FILTER");
    if (lastQuestionKey === "appliances.vacuum.radius" && polarity === "NO") add("RADIUS", { numericConstraint: false, declined: true }, message, "HYPOTHESIS", "NONE");
    if (lastQuestionKey === "appliances.vacuum.material" && polarity === "NO") add("CAPACITY", { numericConstraint: false, declined: true }, message, "HYPOTHESIS", "NONE");
    if (/priz değiştirmek istemiyorum|tek prizden|uzun kablo/iu.test(message)) add("RADIUS", { thresholdRequired: true, numericConstraint: false }, message, "HYPOTHESIS", "QUESTION_INPUT");
    if (/evcil|kedi|köpek|tüy/iu.test(message)) add("PET_HEAD", true);
    if (/hepa|alerjim|alerji/iu.test(message)) add("HEPA", true);
    if (lastQuestionKey === "appliances.vacuum.material" && /fark etmez|emin değilim|bilmiyorum/iu.test(message)) add("CARRY_MASS", { declined: true }, message, "HYPOTHESIS", "NONE");
  }
  if (type === "ROBOT_VACUUM") {
    const height = message.match(/(?:yükseklik|mobilya altı|koltuk altı).*?(\d+(?:[.,]\d+)?)\s*(cm|mm)/iu);
    if (height) add("ROBOT_HEIGHT", { maximumMm: mm(height[1], height[2]) }, height[0], "HARD", "HARD_FILTER");
    if (lastQuestionKey === "appliances.robot.height" && /^\s*\d+(?:[.,]\d+)?\s*(?:cm|mm)\s*$/iu.test(message)) { const found = message.match(/(\d+(?:[.,]\d+)?)\s*(cm|mm)/iu)!; add("ROBOT_HEIGHT", { maximumMm: mm(found[1], found[2]) }, message, "HARD", "HARD_FILTER"); }
    if (lastQuestionKey === "appliances.robot.height" && polarity === "NO") add("ROBOT_HEIGHT", { numericConstraint: false, declined: true }, message, "HYPOTHESIS", "NONE");
    if (lastQuestionKey === "appliances.robot.fit" && polarity === "NO") add("FIT", { declined: true }, message, "HYPOTHESIS", "NONE");
    if (/koltuk altına girsin|mobilya altına girsin/iu.test(message) && !height) add("ROBOT_HEIGHT", { measurementRequired: true, numericConstraint: false }, message, "HYPOTHESIS", "QUESTION_INPUT");
    const threshold = message.match(/(\d{1,2})\s*mm\s*(?:eşik|kapı eşiği)/iu);
    if (threshold) add("THRESHOLD", { minimumMm: Number(threshold[1]) }, threshold[0], "HARD", "HARD_FILTER");
    if (/istasyon.*(?:kendi|otomatik).*(?:boşalt)|otomatik.*(?:toz|boşalt)/iu.test(message)) add("AUTO_EMPTY", true, message, "HARD", "HARD_FILTER");
    if (/halıda.*paspas.*kaldır|paspası kaldırsın/iu.test(message)) add("MOP_LIFT", true, message, "HARD", "HARD_FILTER");
    if (lastQuestionKey === "appliances.robot.material" && /fark etmez|emin değilim|bilmiyorum/iu.test(message)) add("CONNECTIVITY_PRIVACY", { declined: true }, message, "HYPOTHESIS", "NONE");
  }
  if (type === "ELECTRIC_STORAGE_WATER_HEATER" || type === "INSTANTANEOUS_ELECTRIC_WATER_HEATER") {
    const verified = /(?:yetkili servis|nitelikli uzman|elektrikçi)/iu.test(message) && /(?:doğruladı|onayladı)/iu.test(message) && /(?:elektrik|tesisat|montaj)/iu.test(message);
    if (verified) add("PROFESSIONAL_SITE_VERIFICATION", { verified: true, exactModelRequired: true }, message, "HARD", "HARD_FILTER");
  }
  if (type === "SPLIT_AIR_CONDITIONER") {
    const verified = /(?:yetkili servis|nitelikli uzman|iklimlendirme uzmanı)/iu.test(message) && /(?:doğruladı|onayladı)/iu.test(message) && /(?:ısı yükü|oda yükü)/iu.test(message) && /(?:elektrik|topraklama)/iu.test(message) && /(?:boru|drenaj|montaj|soğutucu)/iu.test(message);
    if (verified) add("PROFESSIONAL_SITE_VERIFICATION", { verified: true, exactPairRequired: true, roomLoadVerified: true }, message, "HARD", "HARD_FILTER");
  }
  if (type === "AIR_PURIFIER") {
    const area = airPurifierRoomArea(message, lastQuestionKey);
    if (area) add("PM_CADR", { roomAreaM2: area.roomAreaM2, approximate: area.approximate, source: "USER_DECLARED_ROOM_AREA", selectionUse: "CONTEXT_ONLY", genericCoveragePromise: false }, area.span, "HYPOTHESIS", "QUESTION_INPUT");
    if (lastQuestionKey === "appliances.air-purifier.room-area" && /gerek yok|bilmiyorum|ölçmedim/iu.test(message)) add("PM_CADR", { declined: true, selectionUse: "CONTEXT_ONLY", genericCoveragePromise: false }, message, "HYPOTHESIS", "NONE");
    if (lastQuestionKey === "appliances.air-purifier.material") {
      if (polarity === "YES" || /bakım(?:ı|ını)?.*(?:uygun|yapabilirim|üstlenebilirim)|filtre(?:yi| değişimini)?.*(?:değiştiririm|uygun)/iu.test(message)) add("FILTER_MAINTENANCE", { accepted: true }, message, "STRONG", "SOFT_RANK");
      if (polarity === "NO" || /bakım(?:ı|ını)?.*(?:istemiyorum|uygun değil)|filtre.*değiştiremem/iu.test(message)) add("FILTER_MAINTENANCE", { accepted: false, declined: true }, message, "HYPOTHESIS", "NONE");
    }
  }
  const batchConcept: Partial<Record<BoundedProductType,string>> = { FREEZER:"DEFROST", BUILT_IN_OVEN:"COOKING_MODES", FREESTANDING_COOKER:"FUEL_CONFIGURATION", HOB:"TECHNOLOGY", RANGE_HOOD:"AIR_MODE", COUNTERTOP_MICROWAVE_OVEN:"RF_SAFE_USE", BUILT_IN_MICROWAVE_OVEN:"INSTALLATION_ENVELOPE", AIR_PURIFIER:"FILTER_MAINTENANCE", FULLY_AUTOMATIC_ESPRESSO_MACHINE:"BEAN_TO_CUP_MAINTENANCE", MANUAL_ESPRESSO_MACHINE:"MANUAL_BREWING_WORKFLOW", FILTER_COFFEE_MACHINE:"BATCH_AND_CARAFE", TURKISH_COFFEE_MACHINE:"CUP_AND_OVERFLOW", AIR_FRYER:"BASKET_AND_CAVITY", BLENDER:"JUG_AND_BLADE", FOOD_PROCESSOR:"BOWL_AND_ACCESSORY_BUNDLE" };
  const concept = batchConcept[type];
  if (concept && type !== "AIR_PURIFIER" && message.trim()) add(concept, { userAcknowledged: true, safetyAuthority: "PROFESSIONAL_VERIFICATION_REQUIRED" }, message, "HYPOTHESIS", "NONE");
  return { proposals, response: response(type, message, revision) };
}

export function validateBoundedProposals(type: BoundedProductType, concepts: ReadonlySet<string>, proposals: readonly BoundedProposal[]): { status: "VALID"; proposals: readonly BoundedProposal[] } | { status: "INVALID"; reason: string } {
  for (const proposal of proposals) {
    if (!concepts.has(proposal.conceptId)) return { status: "INVALID", reason: "UNKNOWN_OR_CROSS_CATEGORY_CONCEPT" };
    if (proposal.kind !== "CLEAR" && proposal.value === undefined) return { status: "INVALID", reason: "INVALID_VALUE" };
    if (type === "DISHWASHER" && proposal.conceptId === "CAPACITY" && "minimum" in (proposal.value as object) && !Number.isInteger((proposal.value as { minimum: number }).minimum)) return { status: "INVALID", reason: "INVALID_VALUE" };
  }
  return { status: "VALID", proposals };
}
