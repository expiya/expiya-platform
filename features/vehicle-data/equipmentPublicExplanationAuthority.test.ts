import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { EquipmentFeatureCode } from "@/types/equipmentEvidence";
import dailyLifeCandidate from "@/data/production/equipment-daily-life/release-candidates/v1.0.1-catalog-v0.55.4-2026-08-20-candidate/equipment-daily-life.json";
import activeDailyLife from "@/data/production/equipment-daily-life/releases/v1.0.0-catalog-v0.55.4-2026-08-20/equipment-daily-life.json";
import activeEvidence from "@/data/production/equipment-evidence/releases/v1.5.5-catalog-v0.55.4-2026-08-20/equipment-evidence.json";
import authorityCandidate from "@/data/production/equipment-public-explanation-authority/release-candidates/v0.1.2-catalog-v0.55.4-2026-08-20-candidate/authority.json";
import { authorizeEquipmentPublicExplanation, compareAuthorizedEquipmentExplanations, createAuthorizedEquipmentCategoryOptions,
  explanationSolicitationAppliesTo, reduceExplanationSolicitation, renderAuthorizedEquipmentExplanation, serializeEquipmentPublicTelemetry, validateAuthorizedEquipmentExplanationUnit,
  validateEquipmentPublicExplanationAuthorityCandidate, validateEquipmentExplanationPrivacyRetentionPolicy,
  validateEquipmentDailyLifeLegalCorrectionCandidate,
  planEquipmentExplanationSessionNotice, EQUIPMENT_POST_REVEAL_OFFER_COPY, type AuthorizedEquipmentExplanationUnit,
  type EquipmentExplanationAuthorizationInput } from "./equipmentPublicExplanationAuthority.server";

const BYD = "6cb56615-37ef-51a8-9202-a73e59d4e14b";
const NISSAN = "90e65f94-6fdb-5eea-ad7e-0b4e18435427";
const CATALOG = "sha256:4330b3038b417b13f31a8359a9914509625b70771abbe931327901f0c37eb3b9";
const input = (exactVariantId = BYD, featureCode: EquipmentFeatureCode = "BLIND_SPOT_MONITOR", overrides: Partial<EquipmentExplanationAuthorizationInput> = {}): EquipmentExplanationAuthorizationInput => ({
  conversationId: "conversation-1", recommendationTermsAccepted: true, recommendationTermsVersion: "REC-2026.08-v1.1",
  recommendationTermsAcceptanceEventId: "rec-event-1", recommendationTermsAcceptedAt: "2026-08-20T10:00:00.000Z",
  recommendationTermsAcceptanceConversationId: "conversation-1", recommendationTermsAcceptanceOfferId: "offer-1", recommendationTermsAcceptanceSequence: 3, offerConsentCompleted: true,
  offer: { offerId: "offer-1", conversationId: "conversation-1", lifecycleState: "REVEALED", catalogFingerprint: CATALOG,
    candidateRefs: [{ exactVariantId }], expiresAt: "2026-08-20T12:00:00.000Z", revealAt: "2026-08-20T10:30:00.000Z", revealSequence: 5 }, revealedCardExactVariantIds: [exactVariantId], exactVariantId, featureCode,
  requestKind: "DIRECT_FEATURE_QUESTION", explanationRequested: true, catalogFingerprint: CATALOG, now: "2026-08-20T11:00:00.000Z",
  publicContext: { market: "Türkiye", modelYear: exactVariantId === BYD ? 2025 : 2026, source: "REVEALED_CARD" }, ...overrides,
});

describe("equipment public explanation authority release candidate", () => {
  it("validates the immutable candidate and exact subject sets", () => expect(validateEquipmentPublicExplanationAuthorityCandidate()).toEqual([]));
  it("validates the corrected Daily-Life successor independently", () => expect(validateEquipmentDailyLifeLegalCorrectionCandidate()).toEqual([]));

  it("validates every release-candidate artifact checksum", () => {
    const directory = join(process.cwd(), "data/production/equipment-public-explanation-authority/release-candidates/v0.1.2-catalog-v0.55.4-2026-08-20-candidate");
    const checksums = JSON.parse(readFileSync(join(directory, "checksums.json"), "utf8")) as Record<string, string>;
    for (const [file, expected] of Object.entries(checksums)) expect(`sha256:${createHash("sha256").update(readFileSync(join(directory, file))).digest("hex")}`, file).toBe(expected);
  });

  it("preserves 46 entries and changes exactly the five legally corrected explanation/caveat pairs", () => {
    const corrected = new Set(["ISOFIX_REAR_OUTER", "LED_HEADLIGHTS", "MATRIX_LED_HEADLIGHTS", "REAR_SEAT_OCCUPANT_ALERT", "TERRAIN_DRIVE_MODES"]);
    const oldEntries = new Map(activeDailyLife.entries.map((entry) => [entry.featureCode, entry]));
    let unchanged = 0; let changed = 0;
    for (const entry of dailyLifeCandidate.entries) {
      const before = oldEntries.get(entry.featureCode)!;
      if (!corrected.has(entry.featureCode)) { expect(entry).toEqual(before); unchanged += 1; continue; }
      const stableFields = (value: Record<string, unknown>) => Object.fromEntries(Object.entries(value).filter(([key]) => key !== "userFacingExplanation" && key !== "caveat"));
      const oldStable = stableFields(before); const newStable = stableFields(entry);
      expect(newStable).toEqual(oldStable); expect(entry.userFacingExplanation).not.toBe(before.userFacingExplanation); expect(entry.caveat).not.toBe(before.caveat); changed += 1;
    }
    expect({ unchanged, changed }).toEqual({ unchanged: 46, changed: 5 });
  });

  it("binds exactly seven pilot assertions to the five corrected features", () => {
    const corrected = new Set(["ISOFIX_REAR_OUTER", "LED_HEADLIGHTS", "MATRIX_LED_HEADLIGHTS", "REAR_SEAT_OCCUPANT_ALERT", "TERRAIN_DRIVE_MODES"]);
    const assertions = activeEvidence.verifiedAssertions.filter((item) => [BYD, NISSAN].includes(item.exactVariantId) && corrected.has(item.featureCode));
    expect(assertions).toHaveLength(7);
  });

  it("validates the Daily-Life candidate checksums", () => {
    const directory = join(process.cwd(), "data/production/equipment-daily-life/release-candidates/v1.0.1-catalog-v0.55.4-2026-08-20-candidate");
    const checksums = JSON.parse(readFileSync(join(directory, "checksums.json"), "utf8")) as Record<string, string>;
    for (const [file, expected] of Object.entries(checksums)) expect(`sha256:${createHash("sha256").update(readFileSync(join(directory, file))).digest("hex")}`, file).toBe(expected);
  });

  it.each([[BYD, "BLIND_SPOT_MONITOR"], [NISSAN, "POWER_TAILGATE"]] as const)("authorizes confirmed exact pilot evidence for %s", (variant, feature) => {
    const result = authorizeEquipmentPublicExplanation(input(variant, feature));
    expect(result).toMatchObject({ authorized: true, disposition: "AUTHORIZED_CONFIRMED_INCLUDED" });
    expect(result.unit).toMatchObject({ exactVariantId: variant, featureCode: feature, authorityType: "POST_REVEAL_CONFIRMED_EXPLANATION", availabilityStatus: "STANDARD",
      provisionMode: "INCLUDED", sourceApplicability: "EXACT_VARIANT", verificationState: "VERIFIED", conflictState: "CLEAR", expiresWithOfferOrConversation: true });
    expect(renderAuthorizedEquipmentExplanation(result.unit!)).toMatch(/^Türkiye 20(?:25|26) resmî donanım listesine göre bu versiyonda .+ standart olarak yer alıyor\./u);
    expect(renderAuthorizedEquipmentExplanation(result.unit!)).not.toContain("Bu araçta");
  });

  it.each(["PANORAMIC_GLASS_ROOF", "VENTILATED_FRONT_SEATS", "WIRELESS_PHONE_CHARGING"] as const)("authorizes BYD verified absence only for direct question: %s", (feature) => {
    const direct = authorizeEquipmentPublicExplanation(input(BYD, feature));
    expect(direct).toMatchObject({ authorized: true, disposition: "AUTHORIZED_VERIFIED_ABSENCE" });
    expect(renderAuthorizedEquipmentExplanation(direct.unit!)).toContain("satın alma öncesinde güncel araç konfigürasyonunu yetkili satıcıdan doğrulayın");
    const proactive = authorizeEquipmentPublicExplanation(input(BYD, feature, { requestKind: "POST_REVEAL_EXPLANATION" }));
    expect(proactive).toMatchObject({ authorized: false, disposition: "UNKNOWN_NO_CLAIM" });
  });

  it("renders all 62 positives and all three direct-answer negatives with controlled templates", () => {
    const assertions = activeEvidence.verifiedAssertions.filter((item) => [...authorityCandidate.authorizedPositiveAssertionIds, ...authorityCandidate.authorizedNegativeAssertionIds].includes(item.sourceAssertionId));
    const rendered = assertions.map((item) => renderAuthorizedEquipmentExplanation(authorizeEquipmentPublicExplanation(input(item.exactVariantId, item.featureCode as EquipmentFeatureCode)).unit!));
    expect(rendered.filter((text) => text.startsWith("Türkiye "))).toHaveLength(62);
    expect(rendered.filter((text) => text.startsWith("İncelediğimiz Türkiye "))).toHaveLength(3);
    expect(rendered.every((text) => !text.startsWith("Bu araçta"))).toBe(true);
  });

  it.each([
    ["missing REC event", { recommendationTermsAcceptanceEventId: undefined }],
    ["missing REC version", { recommendationTermsVersion: undefined }],
    ["missing REC time", { recommendationTermsAcceptedAt: undefined }],
    ["wrong REC conversation", { recommendationTermsAcceptanceConversationId: "conversation-2" }],
    ["wrong REC offer", { recommendationTermsAcceptanceOfferId: "offer-2" }],
    ["REC accepted at reveal sequence", { recommendationTermsAcceptanceSequence: 5 }],
    ["REC accepted after reveal", { recommendationTermsAcceptanceSequence: 6 }],
    ["REC accepted at reveal instant", { recommendationTermsAcceptedAt: "2026-08-20T10:30:00.000Z" }],
    ["REC accepted after reveal instant", { recommendationTermsAcceptedAt: "2026-08-20T10:31:00.000Z" }],
    ["invalid reveal time", { offer: { ...input().offer, revealAt: "2026-08-20 10:30:00" } }],
    ["missing reveal time", { offer: { ...input().offer, revealAt: undefined } }],
    ["boolean acceptance only", { recommendationTermsVersion: undefined, recommendationTermsAcceptanceEventId: undefined,
      recommendationTermsAcceptedAt: undefined, recommendationTermsAcceptanceConversationId: undefined,
      recommendationTermsAcceptanceOfferId: undefined, recommendationTermsAcceptanceSequence: undefined }],
  ] as const)("rejects incomplete or incorrectly scoped REC audit: %s", (_name, overrides) => {
    expect(authorizeEquipmentPublicExplanation(input(BYD, "BLIND_SPOT_MONITOR", overrides as unknown as Partial<EquipmentExplanationAuthorizationInput>))).toMatchObject({ authorized: false, reasonCodes: ["REC_ACCEPTANCE_AUDIT_BINDING_FAILED"] });
  });

  it.each([
    ["missing context", { publicContext: undefined }],
    ["wrong model year", { publicContext: { market: "Türkiye", modelYear: 2026, source: "RESPONSE" } }],
  ] as const)("rejects missing or incorrect public market/model-year context: %s", (_name, overrides) => {
    expect(authorizeEquipmentPublicExplanation(input(BYD, "BLIND_SPOT_MONITOR", overrides as Partial<EquipmentExplanationAuthorizationInput>))).toMatchObject({ authorized: false, reasonCodes: ["PUBLIC_MARKET_AND_MODEL_YEAR_CONTEXT_REQUIRED"] });
  });

  it.each([
    ["1a3cc01d-3bfa-56f3-817f-4cc77e723ef8", "LEGACY_PROVISION_UNRESOLVED"],
    ["54bbe431-a3c2-56d0-8177-cefdf0330bcb", "ASSOCIATION_PROVISION_UNRESOLVED"],
    ["00ac8628-7be2-5cc8-8151-335698d4fe69", "UNKNOWN_NO_CLAIM"],
  ] as const)("keeps non-pilot evidence outside public authority: %s", (variant, disposition) => {
    const result = authorizeEquipmentPublicExplanation(input(variant, "APPLE_CARPLAY"));
    expect(result).toMatchObject({ authorized: false, disposition });
  });

  it.each([
    ["unrevealed", { offer: { ...input().offer, lifecycleState: "CONSENTED" } }],
    ["wrong offer card", { offer: { ...input().offer, candidateRefs: [{ exactVariantId: NISSAN }] } }],
    ["wrong conversation", { offer: { ...input().offer, conversationId: "conversation-2" } }],
    ["stale fingerprint", { catalogFingerprint: "sha256:stale" }],
    ["expired", { now: "2026-08-20T13:00:00.000Z" }],
    ["cross-card", { revealedCardExactVariantIds: [NISSAN] }],
  ] as const)("rejects reveal binding failure: %s", (_name, overrides) => {
    expect(authorizeEquipmentPublicExplanation(input(BYD, "BLIND_SPOT_MONITOR", overrides as Partial<EquipmentExplanationAuthorizationInput>))).toMatchObject({ authorized: false, disposition: "REVEAL_AUTHORIZATION_REQUIRED" });
  });

  it("does not convert silent absence into NOT_AVAILABLE", () => {
    const result = authorizeEquipmentPublicExplanation(input(BYD, "POWER_TAILGATE"));
    expect(result).toMatchObject({ authorized: false, disposition: "UNKNOWN_NO_CLAIM" });
    expect(result.controlledResponse).toContain("bulunmadığı anlamına gelmez");
  });

  it("compares asymmetric evidence without inventing absence or ranking", () => {
    const confirmed = authorizeEquipmentPublicExplanation(input(BYD, "BLIND_SPOT_MONITOR"));
    const unknown = authorizeEquipmentPublicExplanation(input(BYD, "POWER_TAILGATE"));
    expect(compareAuthorizedEquipmentExplanations(confirmed, unknown)).toEqual({ left: "CONFIRMED_INCLUDED", right: "INSUFFICIENT_VERIFICATION", rankingEffect: "NONE",
      qualityScoreAllowed: false, safetyOrSuperiorityInferenceAllowed: false,
      controlledComparison: "A için Kör nokta izleme doğrulandı; B için yeterli doğrulama bulunmuyor. Bu, özelliğin B’de bulunmadığı anlamına gelmez." });
  });

  it("uses only the four approved comparison templates", () => {
    const confirmed = authorizeEquipmentPublicExplanation(input(BYD, "BLIND_SPOT_MONITOR"));
    const confirmedOther = authorizeEquipmentPublicExplanation(input(NISSAN, "BLIND_SPOT_MONITOR"));
    const unknown = authorizeEquipmentPublicExplanation(input(BYD, "POWER_TAILGATE"));
    const absent = authorizeEquipmentPublicExplanation(input(BYD, "PANORAMIC_GLASS_ROOF"));
    const association = authorizeEquipmentPublicExplanation(input("54bbe431-a3c2-56d0-8177-cefdf0330bcb", "APPLE_CARPLAY"));
    expect(compareAuthorizedEquipmentExplanations(confirmed, confirmedOther).controlledComparison).toContain("her iki versiyon için de doğrulandı");
    expect(compareAuthorizedEquipmentExplanations(confirmed, confirmedOther).controlledComparison).toContain("genel kalite veya güvenlik düzeyini göstermez");
    expect(compareAuthorizedEquipmentExplanations(confirmed, association).controlledComparison).toContain("standart, opsiyon veya paket durumu yeterince doğrulanmadı");
    expect(compareAuthorizedEquipmentExplanations(absent, unknown).controlledComparison).toContain("B lehine bir üstünlük sonucu çıkarılamaz");
    expect(compareAuthorizedEquipmentExplanations(unknown, confirmed).controlledComparison).toBeNull();
  });

  it("shows categories only when at least one exact confirmed unit exists", () => {
    const safety = authorizeEquipmentPublicExplanation(input(BYD, "BLIND_SPOT_MONITOR")).unit!;
    const parking = authorizeEquipmentPublicExplanation(input(BYD, "SURROUND_VIEW_CAMERA_360")).unit!;
    const absent = authorizeEquipmentPublicExplanation(input(BYD, "PANORAMIC_GLASS_ROOF")).unit!;
    const options = createAuthorizedEquipmentCategoryOptions([safety, parking, absent]);
    expect(options.map((item) => item.label)).toEqual(["Güvenlik destekleri", "Park ve çevre görüşü"]);
    expect(options.flatMap((item) => item.featureCodes)).not.toContain("PANORAMIC_GLASS_ROOF");
  });

  it("records decline and forbids repeated solicitation", () => {
    const initial = Object.freeze({ scope: "CURRENT_VEHICLE_SESSION_ONLY" as const, conversationId: "conversation-1", exactVariantId: BYD, offerId: "offer-1",
      expiresWithConversationOrOffer: true as const, offered: false, declined: false, accepted: false });
    const offered = reduceExplanationSolicitation(initial, "OFFER"); expect(offered.offerAllowed).toBe(true);
    const declined = reduceExplanationSolicitation(offered.state, "DECLINE"); expect(declined.state.declined).toBe(true);
    expect(reduceExplanationSolicitation(declined.state, "OFFER")).toMatchObject({ offerAllowed: false, reasonCode: "REPEATED_SOLICITATION_FORBIDDEN" });
  });

  it("plans source notice once per vehicle session and repeats inline for absence or stale evidence", () => {
    const unit = authorizeEquipmentPublicExplanation(input()).unit!;
    const initial = Object.freeze({ conversationId: "conversation-1", exactVariantId: BYD, offerId: "offer-1", sourceNoticeShown: false });
    const first = planEquipmentExplanationSessionNotice(initial, unit); expect(first.notice).toContain("Türkiye pazarı");
    const second = planEquipmentExplanationSessionNotice(first.nextState, unit); expect(second.notice).toBeNull();
    expect(planEquipmentExplanationSessionNotice(second.nextState, unit, { staleEvidence: true }).notice).toContain("yetkili satıcıdan doğrulayın");
    const absent = authorizeEquipmentPublicExplanation(input(BYD, "PANORAMIC_GLASS_ROOF")).unit!;
    expect(planEquipmentExplanationSessionNotice(first.nextState, absent).notice).toContain("yetkili satıcıdan doğrulayın");
  });

  it("isolates preference and decline state to conversation + exact variant + offer", () => {
    const state = Object.freeze({ scope: "CURRENT_VEHICLE_SESSION_ONLY" as const, conversationId: "conversation-1", exactVariantId: BYD, offerId: "offer-1",
      expiresWithConversationOrOffer: true as const, offered: true, declined: true, accepted: false });
    expect(explanationSolicitationAppliesTo(state, { conversationId: "conversation-1", exactVariantId: BYD, offerId: "offer-1" })).toBe(true);
    expect(explanationSolicitationAppliesTo(state, { conversationId: "conversation-1", exactVariantId: NISSAN, offerId: "offer-1" })).toBe(false);
    expect(explanationSolicitationAppliesTo(state, { conversationId: "conversation-1", exactVariantId: BYD, offerId: "offer-2" })).toBe(false);
    expect(explanationSolicitationAppliesTo(state, { conversationId: "conversation-2", exactVariantId: BYD, offerId: "offer-1" })).toBe(false);
    expect(state).not.toHaveProperty("durableProfile");
  });

  it("serializes public telemetry by explicit allowlist without internal audit or raw text", () => {
    const hostile = { eventType: "EXPLANATION_DECLINED" as const, outcome: "RECORDED" as const, recommendationTermsAcceptanceEventId: "rec-event-1",
      recommendationTermsVersion: "REC-2026.08-v1.1", recommendationTermsAcceptedAt: "2026-08-20T10:00:00.000Z", recommendationTermsAcceptanceSequence: 3,
      evidenceAssertionId: "EE-AST-secret", evidenceLocator: "page-1", evidenceChecksum: "sha256:evidence", sourceChecksum: "sha256:source",
      authorizationUnitId: "internal-unit", rawEquipmentQuestion: "raw question", rawPreferenceOrDeclineText: "anlatma" };
    expect(serializeEquipmentPublicTelemetry(hostile)).toEqual({ eventType: "EXPLANATION_DECLINED", outcome: "RECORDED", scope: "CURRENT_VEHICLE_SESSION_ONLY" });
    expect(Object.keys(serializeEquipmentPublicTelemetry(hostile))).toEqual(["eventType", "outcome", "scope"]);
  });

  it("keeps internal REC and evidence audit fields out of the public renderer", () => {
    const unit = authorizeEquipmentPublicExplanation(input()).unit!;
    const rendered = renderAuthorizedEquipmentExplanation(unit);
    for (const internal of [unit.recommendationTermsAcceptanceEventId, unit.recommendationTermsVersion, unit.evidenceAssertionId,
      unit.evidenceMaterializationId, unit.evidenceFingerprint]) expect(rendered).not.toContain(internal);
  });

  it("keeps the solicitation copy and privacy policy conversation-scoped and non-consensual", () => {
    expect(EQUIPMENT_POST_REVEAL_OFFER_COPY).toBe("Bu araç için Türkiye resmî donanım listesinde doğruladığımız özelliklerin günlük kullanımdaki olası etkilerini açıklamamı ister misin?");
    expect(validateEquipmentExplanationPrivacyRetentionPolicy()).toEqual([]);
  });

  it("rejects safety guarantees, free facts and internal leakage", () => {
    const unit = authorizeEquipmentPublicExplanation(input()).unit!;
    expect(validateAuthorizedEquipmentExplanationUnit({ ...unit, caveat: "Güvenliği garanti eder." })).toContain("NON_DAILY_LIFE_FREE_FACT");
    expect(validateAuthorizedEquipmentExplanationUnit({ ...unit, caveat: "Güvenliği garanti eder." })).toContain("FORBIDDEN_SAFETY_OR_SUPERIORITY_WORDING");
    expect(validateAuthorizedEquipmentExplanationUnit({ ...unit, rawSource: "internal" } as AuthorizedEquipmentExplanationUnit)).toContain("INTERNAL_OR_RAW_FIELD_LEAKAGE");
  });

  it("rejects included/standard wording for optional, package-dependent or conflict states", () => {
    const unit = authorizeEquipmentPublicExplanation(input()).unit!;
    expect(validateAuthorizedEquipmentExplanationUnit({ ...unit, availabilityStatus: "OPTIONAL", provisionMode: "FACTORY_OPTION" } as unknown as AuthorizedEquipmentExplanationUnit)).toContain("CONFIRMED_WORDING_GATE_INVALID");
    expect(validateAuthorizedEquipmentExplanationUnit({ ...unit, availabilityStatus: "PACKAGE_DEPENDENT", provisionMode: "PACKAGE_OPTION" } as unknown as AuthorizedEquipmentExplanationUnit)).toContain("CONFIRMED_WORDING_GATE_INVALID");
    expect(validateAuthorizedEquipmentExplanationUnit({ ...unit, conflictState: "CONFLICTING" } as unknown as AuthorizedEquipmentExplanationUnit)).toContain("UNIT_AUTHORITY_GATE_INVALID");
  });

  it("creates deterministic exact authorized units", () => {
    const first = authorizeEquipmentPublicExplanation(input()).unit; const second = authorizeEquipmentPublicExplanation(input()).unit;
    expect(first).toEqual(second); expect(JSON.stringify(first)).toBe(JSON.stringify(second)); expect(Object.isFrozen(first)).toBe(true);
  });

  it("keeps public decision behavior neutral", () => {
    const publicDecision = Object.freeze({ eligibleIds: [BYD, NISSAN], ranking: [NISSAN, BYD], readiness: "READY", action: "REVEAL", offerId: "offer-1",
      consent: "REVEALED", cards: [BYD, NISSAN], publicMessage: "Aynı", authorizedFacts: ["existing"] });
    const before = JSON.stringify(publicDecision); authorizeEquipmentPublicExplanation(input()); expect(JSON.stringify(publicDecision)).toBe(before);
  });
});
