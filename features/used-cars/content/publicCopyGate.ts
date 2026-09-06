export type PublicCopyContext = "LISTING" | "MATCH_EXPLANATION" | "DEALER_PROFILE" | "SPONSORED" | "CLASSIC" | "LEAD_CTA" | "AI_RESPONSE";
const forbiddenPatterns: readonly [RegExp, string][] = [
  [/\bkesin\s+(al|alma)\b/iu, "PURCHASE_INSTRUCTION"], [/hasarsızlık garantisi/iu, "DAMAGE_GUARANTEE"], [/kilometre garantisi/iu, "MILEAGE_GUARANTEE"], [/piyasanın en (ucuzu|iyisi)/iu, "UNSOURCED_MARKET_SUPERLATIVE"], [/üyeliği.*(garanti|güvence)/iu, "MEMBERSHIP_AS_ACCURACY_GUARANTEE"], [/(hemen al|kaçırma|son şans)/iu, "PRESSURE_LANGUAGE"],
];
export function evaluatePublicCopy(input: { readonly context: PublicCopyContext; readonly copy: string; readonly evidenceReferences: readonly string[]; readonly sponsoredLabelPresent: boolean; readonly safeNextStepPresent: boolean }) {
  const codes: string[] = [];
  for (const [pattern, code] of forbiddenPatterns) if (pattern.test(input.copy)) codes.push(code);
  if (/expiya doğrulad/iu.test(input.copy) && input.evidenceReferences.length === 0) codes.push("VERIFIED_COPY_WITHOUT_EVIDENCE");
  if (input.context === "SPONSORED" && !input.sponsoredLabelPresent) codes.push("SPONSORED_LABEL_REQUIRED");
  if (["LISTING", "MATCH_EXPLANATION", "CLASSIC", "AI_RESPONSE"].includes(input.context) && !input.safeNextStepPresent) codes.push("SAFE_NEXT_STEP_REQUIRED");
  if (input.context === "CLASSIC" && /(orijinal|matching numbers|koleksiyonluk)/iu.test(input.copy) && input.evidenceReferences.length === 0) codes.push("CLASSIC_HIGH_RISK_CLAIM_UNGROUNDED");
  return Object.freeze({ publishable: codes.length === 0, codes: Object.freeze(codes), automaticPublicationAuthorized: false as const });
}
