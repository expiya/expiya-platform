import { z } from "zod";
import { pendingAnswerPolarity } from "../conversation/pendingAnswer";

export const proposalSchema = z.strictObject({
  proposalId: z.string().min(1), kind: z.enum(["SET", "CLEAR", "CORRECT", "CONFIRM", "REJECT"]), conceptId: z.string().min(1),
  normalizedValue: z.unknown().optional(), sourceMessageId: z.string().min(1),
  sourceSpan: z.strictObject({ start: z.number().int().nonnegative(), end: z.number().int().positive(), text: z.string().min(1) }).optional(),
  interpretationAuthority: z.enum(["EXPLICIT_USER_STATEMENT", "INTERPRETED_USER_MEANING"]), confidence: z.number().min(0).max(1).optional(), confirmationRequired: z.boolean(),
});
export type AppliancesSemanticProposal = z.infer<typeof proposalSchema>;
export type TurnRoute = "DECISION_CONTEXT" | "DOMAIN_INFORMATION_REQUEST" | "SOCIAL" | "OFF_TOPIC" | "SAFETY" | "USER_CLOSING" | "UNSUPPORTED" | "UNRESOLVED";
export interface InterpretedAppliancesTurn { readonly route: TurnRoute; readonly proposals: readonly AppliancesSemanticProposal[]; readonly unsupportedProductType?: "REFRIGERATOR" | "DISHWASHER" | "DRYER" | "VACUUM" | "ROBOT_VACUUM"; readonly ambiguousCorrection?: boolean }

const exactSpan = (message: string, match: RegExpMatchArray) => ({ start: match.index!, end: match.index! + match[0].length, text: message.slice(match.index!, match.index! + match[0].length) });
export function interpretAppliancesTurn(message: string, messageId: string, questionKey?: string): InterpretedAppliancesTurn {
  const proposals: AppliancesSemanticProposal[] = []; let sequence = 0;
  const add = (match: RegExpMatchArray, conceptId: string, normalizedValue: unknown, authority: "EXPLICIT_USER_STATEMENT" | "INTERPRETED_USER_MEANING" = "EXPLICIT_USER_STATEMENT", kind: "SET" | "CLEAR" | "CORRECT" = "SET") => proposals.push({ proposalId: `${messageId}:${sequence++}`, kind, conceptId, normalizedValue, sourceMessageId: messageId, sourceSpan: exactSpan(message, match), interpretationAuthority: authority, confidence: 1, confirmationRequired: authority === "INTERPRETED_USER_MEANING" });
  const unsupported: [RegExp, NonNullable<InterpretedAppliancesTurn["unsupportedProductType"]>][] = [[/bulaşık makinesi/iu,"DISHWASHER"],[/buzdolab[ıi]/iu,"REFRIGERATOR"],[/çamaşır kurutma|kurutma makinesi/iu,"DRYER"],[/robot süpürge/iu,"ROBOT_VACUUM"],[/(?<!robot )süpürge/iu,"VACUUM"]];
  for (const [pattern, productType] of unsupported) if (pattern.test(message)) return { route: "UNSUPPORTED", proposals: [], unsupportedProductType: productType };
  const closing = /şimdilik vazgeçtim|sonra devam ederiz|(?:teşekkürler[,. ]*)?kapatalım/iu.test(message);
  const safety = /(?:elektrik|kablo|priz|tesisat|motor|kapağ).*(?:sök|tamir|bağla|açayım)|çarpıl/iu.test(message);
  const clearRules: [RegExp,string][] = [[/bütçe(?:yi|mi).*(?:kaldır|boş ver|unut)/iu,"BUDGET_SENSITIVITY"],[/(?:sessiz|gürültü).*(?:önemli değil|boş ver|unut)/iu,"LOW_NOISE_PRIORITY"],[/(?:uzaktan kontrol|wi-?fi).*(?:kaldır|boş ver|unut)/iu,"REMOTE_CONTROL"]];
  for (const [pattern, concept] of clearRules) { const m=message.match(pattern); if(m) add(m,concept,null,"EXPLICIT_USER_STATEMENT","CLEAR"); }
  const capacity = message.match(/(?:en az\s*)?(\d{1,2})\s*(?:kg|kilo)(?:\s*(?:olsun|istiyorum|bakıyorum|da olabilir))?/iu); if (capacity) add(capacity,"HIGH_LAUNDRY_VOLUME",{ minimumCapacityKg:Number(capacity[1]), contextOnly:false },"EXPLICIT_USER_STATEMENT",/değil|aslında|da olabilir/iu.test(message)?"CORRECT":"SET");
  const budget = message.match(/(?:en fazla|max(?:imum)?|bütçem)\s*(\d{1,7}(?:[ .]\d{3})?)\s*(bin)?\s*(?:tl|₺)?/iu); if (budget) { const raw=Number(budget[1].replace(/[ .]/gu,"")); add(budget,"BUDGET_SENSITIVITY",{ maximumTry:budget[2]&&raw<1000?raw*1000:raw },"EXPLICIT_USER_STATEMENT",/aslında|bütçe.*düzelt/iu.test(message)?"CORRECT":"SET"); }
  if (!budget && questionKey === "appliances.wm.budget.maximumTry") {
    const answer = message.match(/^\s*(\d{1,7}(?:[.,]\d{3})?)\s*(bin)?\s*(?:TL|₺)?\s*$/iu);
    if (answer) add(answer, "BUDGET_SENSITIVITY", { maximumTry: Number(answer[1].replace(/[.,]/gu, "")) * (answer[2] ? 1000 : 1) });
  }
  const contextualPolarity = pendingAnswerPolarity(message);
  const whole = message.match(/^\s*[\s\S]*?\s*$/u)!;
  if (contextualPolarity && questionKey === "appliances.wm.remoteControl.requirement") add(whole, "REMOTE_CONTROL", { wanted: contextualPolarity === "YES" });
  if (contextualPolarity && questionKey === "appliances.wm.autoDosing.preference") add(whole, "DETERGENT_CONVENIENCE", contextualPolarity === "YES" ? "WANTED" : "NOT_IMPORTANT");
  if (contextualPolarity && questionKey === "appliances.wm.noise.priority") add(whole, "LOW_NOISE_PRIORITY", contextualPolarity === "YES" ? true : "NOT_IMPORTANT");
  const geometry: Record<string, number> = {};
  let geometryMatch: RegExpMatchArray | null = null;
  for (const [label, field] of [["genişlik", "maxWidthMm"], ["yükseklik", "maxHeightMm"], ["derinlik", "maxDepthMm"]]) {
    const match = message.match(new RegExp(`${label}\\s*(?:en fazla\\s*)?(\\d{1,4}(?:[.,]\\d+)?)\\s*(cm|mm)`, "iu"));
    if (match) { geometry[field] = Number(match[1].replace(",", ".")) * (match[2].toLowerCase() === "cm" ? 10 : 1); geometryMatch = match; }
  }
  if (geometryMatch) add(geometryMatch, "INSTALLATION_FIT", geometry, "EXPLICIT_USER_STATEMENT", /aslında|düzelt/iu.test(message) ? "CORRECT" : "SET");
  const household=message.match(/(\d{1,2})\s*(?:kişiyiz|kişi yaşıyoruz)|tek yaşıyorum/iu); if(household) add(household,"LOAD_CONSOLIDATION",{ householdSize:/tek/iu.test(household[0])?1:Number(household[1]), capacityConstraint:false });
  const largeHousehold=message.match(/kalabalık (?:bir )?(?:aileyiz|haneyiz|eviz)/iu); if(largeHousehold&&!household) add(largeHousehold,"LOAD_CONSOLIDATION",{ householdBand:"LARGE", capacityConstraint:false },"INTERPRETED_USER_MEANING");
  const frequency=message.match(/haftada\s*(?:neredeyse\s*)?(?:her gün|\d+\s*(?:kez|defa))|sık sık.*(?:çamaşır|yık)/iu); if(frequency) add(frequency,"FREQUENT_WASHING",true);
  const night=message.match(/gece(?:leri)? (?:çalıştır|kullan|yıka)/iu); if(night) { add(night,"NIGHT_USE",true); add(night,"LOW_NOISE_PRIORITY",true,"INTERPRETED_USER_MEANING"); }
  const quiet=message.match(/sessiz(?: olması)? (?:önemli|olsun)|gürültü istemiyorum/iu); if(quiet) add(quiet,"LOW_NOISE_PRIORITY",true);
  const quietNo=message.match(/(?:sessizlik|gürültü|ses)(?: benim için)? önemli değil/iu); if(quietNo) add(quietNo,"LOW_NOISE_PRIORITY","NOT_IMPORTANT");
  const dosing=message.match(/otomatik dozaj(?:lama)?(?: benim için)?\s*(istiyorum|önemli değil|önemli|istemiyorum)/iu); if(dosing) add(dosing,"DETERGENT_CONVENIENCE",/önemli değil|istemiyorum/iu.test(dosing[1])?"NOT_IMPORTANT":"WANTED");
  const specialCare=message.match(/hassas (?:çamaşır|kıyafet)|özel bakım gerek/iu); if(specialCare) add(specialCare,"SPECIAL_CARE",true,"INTERPRETED_USER_MEANING");
  const wifiNo=message.match(/(?:wi-?fi|uygulamadan uzaktan kontrol).*(?:önemli değil|istemiyorum)/iu); if(wifiNo) add(wifiNo,"REMOTE_CONTROL",{ wanted:false });
  const wifiWanted=message.match(/(?:wi-?fi|uygulamadan uzaktan kontrol).*(?:istiyorum|önemli)/iu); if(wifiWanted&&!wifiNo) add(wifiWanted,"REMOTE_CONTROL",{ wanted:true });
  const kitchen=message.match(/mutfağa koyacağım|mutfakta (?:olacak|duracak)/iu); if(kitchen&&!geometryMatch) add(kitchen,"INSTALLATION_FIT",{ location:"KITCHEN", fitConfirmed:false });
  const limitedSpace=message.match(/fazla yerim yok|yerim (?:çok )?dar|alana sığmalı/iu); if(limitedSpace&&!geometryMatch) add(limitedSpace,"INSTALLATION_FIT",{ spaceLimited:true, fitConfirmed:false },"INTERPRETED_USER_MEANING");
  const info=/(1400\s*devir|enerji sınıfı\s*a|auto-?dose|otomatik dozaj|buhar).*\s(?:ne(?:dir| demek| işe yarar| ifade eder)?)(?:[?!. ]|$)|(?:ne demek|nedir).*(1400\s*devir|auto-?dose|buhar)/iu.test(message);
  const social=/^(?:merhaba|selam|tamam|anladım|teşekkürler|güzel)[.! ]*$/iu.test(message.trim());
  const offTopic=/(?:bugün )?hava nasıl|film öner|kaç yaşındasın/iu.test(message);
  if (safety) return { route:"SAFETY",proposals };
  if (closing) return { route:"USER_CLOSING",proposals };
  if (info) return { route:"DOMAIN_INFORMATION_REQUEST",proposals };
  if (offTopic) return { route:"OFF_TOPIC",proposals:[] };
  if (social && proposals.length===0) return { route:"SOCIAL",proposals:[] };
  if (/bu şartı unut|az önce yanlış söyledim|hayır.*değil/iu.test(message) && proposals.length===0) return { route:"UNRESOLVED",proposals:[],ambiguousCorrection:true };
  return { route:proposals.length||/çamaşır makinesi|ekonomik|hesaplı|uygun fiyatlı|mümkün olduğunca ucuz/iu.test(message)?"DECISION_CONTEXT":"UNRESOLVED",proposals };
}
