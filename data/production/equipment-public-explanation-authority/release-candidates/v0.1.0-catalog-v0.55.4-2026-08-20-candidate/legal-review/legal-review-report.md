# Expiya Cars Equipment Public Explanation Pilot — Bounded Legal and User-Copy Review

**Review date:** 20 August 2026  
**Canonical HEAD:** `fa31cdb9a6c8c16ca19ff80d1f56c86d68908fd1`  
**Reviewed authority checksum:** `sha256:4de37ff6200751c6e5b08911125a7ceb9176f6179bd567cced9b7fe9ae6c94e8`  
**Disposition:** `APPROVED_WITH_REQUIRED_CANDIDATE_CORRECTION`

> **[HUKUKÇU KONTROLÜ GEREKİR]** This bounded review is not a final legal opinion and does not authorize activation, owner approval, deployment or public use.

## Executive result

The two-vehicle pilot is legally and operationally capable of being presented as a narrow, post-reveal catalogue explanation layer. It must remain neutral to selection, ranking, filtering and recommendation. The current candidate must not be approved at its existing checksum because the public renderer and five Daily-Life copy entries require controlled corrections, and the REC acceptance audit binding is not durable enough.

A corrected candidate, a new authority/copy checksum and fresh owner/legal review are required. The current candidate and its authority payload were not modified by this review.

## Consent and REC-2026.08-v1.1

`NO_ADDITIONAL_CONSENT_REQUIRED`

REC-2026.08-v1.1 already describes vehicle-card display, catalogue information and AI/rule-supported decision support. A user-requested explanation of equipment on an already revealed exact vehicle card remains within that scope. A new checkbox would add friction without creating a distinct contract or lawful basis.

The user's “anlat”/“evet” response is only an in-conversation content preference. It must not be labelled or recorded as:

- KVKK explicit consent,
- commercial electronic-message permission,
- marketing permission,
- a new recommendation contract acceptance, or
- permission to profile equipment interests across conversations.

The current authorization input contains `recommendationTermsAccepted` and `offerConsentCompleted` booleans, but the authorized unit does not carry the accepted terms version, acceptance event ID or acceptance time. This is sufficient as a runtime gate, but not as durable proof. Before activation, bind the unit to `REC-2026.08-v1.1`, a server-verifiable `acceptanceEventId`, `acceptedAt`, offer, conversation, exact variant, catalogue fingerprint and corrected authority checksum. Keep this contract-acceptance evidence separate from KVKK consent records.

## Positive equipment wording

All 62 positive subjects were reviewed. The source gate is appropriately limited to `STANDARD + INCLUDED + VERIFIED + CLEAR + EXACT_VARIANT`. No subject is rejected as a public equipment fact, but the final rendered sentence for all 62 must change from:

> Bu araçta [özellik] standart olarak bulunuyor.

to:

> Türkiye [MY] resmî donanım listesine göre bu versiyonda [özellik] standart olarak yer alıyor.

This distinguishes a dated catalogue fact from the physical configuration of a particular dealer-stock vehicle. A stock vehicle may differ because of production, package, market, model-year or later manufacturer changes.

Five feature codes require body/caveat correction, affecting seven positive subjects:

- `LED_HEADLIGHTS`: remove the unproven halogen/long-life comparison.
- `MATRIX_LED_HEADLIGHTS`: remove the unproven stronger-illumination performance claim.
- `TERRAIN_DRIVE_MODES`: do not claim mud/sand modes when the source lists Eco, Normal, Sport and Snow.
- `REAR_SEAT_OCCUPANT_ALERT`: do not extend child-presence evidence to pets and objects.
- `ISOFIX_REAR_OUTER`: avoid wording that may imply a guaranteed correct installation outcome.

Exact replacements are in `safety-wording-review.json`.

## Safety boundary

The reviewed copy generally uses appropriate cautious verbs such as “yardımcı olabilir”, “kolaylaştırabilir” and “destekleyebilir”. Driver-assistance explanations must always preserve driver responsibility, direct observation, mirrors, vehicle instructions and operating-condition limits.

The following remain prohibited: accident-prevention promises, safety guarantees, infallibility, all-condition detection, autonomous-driving implications, removal of driver responsibility, legal warranties and unsupported performance or superiority claims.

## Verified absence

The three BYD negative subjects may be answered only after a direct question about the exact revealed BYD Dolphin Comfort MY2025 card. “Bu araçta yok” is too absolute. Use:

> İncelediğimiz Türkiye MY2025 resmî donanım listesinde BYD Dolphin Comfort versiyonu için [özellik] sunulmadığı belirtiliyor. Donanım listeleri değişebileceğinden satın alma öncesinde güncel araç konfigürasyonunu yetkili satıcıdan doğrulayın.

Silent absence, unknown or association-only evidence must never be converted to “yok”. Verified absence cannot be proactive sales copy, ranking evidence or competitor superiority.

## Comparisons

The safe boundary is confirmed: “A için doğrulandı; B için yeterli doğrulama bulunmuyor.” The answer must add that insufficient verification does not mean absence. Association-only evidence must disclose unresolved provision mode. A verified absence versus an unknown state cannot support superiority. Two confirmed presences establish only that equipment fact, not quality, safety or overall vehicle superiority.

Feature counts must not produce quality scores, safety scores, “daha iyi araç” statements or ranking changes. The four approved state templates are in `comparison-wording.json`.

## Post-reveal offer

The reviewed offer is not coercive and is not a legal consent request. A more transparent controlled version is approved:

> Bu araç için Türkiye resmî donanım listesinde doğruladığımız özelliklerin günlük kullanımdaki olası etkilerini açıklamamı ister misin?

A decline must suppress repeat offers for that conversation/offer. Category buttons may be created only from exact confirmed positive units. Negative and unknown states must not create category buttons.

## Source freshness and dealer confirmation

Model year, Turkey market and the “resmî donanım listesine göre” qualifier must appear in each answer or in persistent visible vehicle-card context. A reliable source/access date should be shown once per vehicle explanation session when available. Raw locators, internal assertion IDs, checksums and technical provenance must never be public.

The dealer/configuration warning should be shown once per vehicle explanation session to avoid repetitive copy. It must be repeated inline for verified-absence answers and whenever evidence is stale, superseded or conflicting.

## Privacy and retention

`conversationId` and `offerId` are pseudonymous personal data when linkable to a user or device. `exactVariantId` and `featureCode` are product data, but become preference/behaviour data when tied to a conversation.

Transient processing to answer the requested explanation does not create a new purpose or require explicit consent. If server logs retain these events, the privacy notice and data inventory must cover the processing. Explanation requests, categories and declines must not be used for marketing, lead scoring, advertising audiences, cross-conversation profiles or recommendation ranking.

Authorization units and interaction choices must expire no later than the conversation/offer. A necessary REC contract-acceptance proof may be retained separately under its documented legal basis and period, but it must not contain the user's feature-question history. No default security-log period is approved by this review.

## Validation disposition

- 62 positive subjects: reviewed; 55 body copies approved as written, 7 subject instances require five controlled feature-code changes.
- 3 negative subjects: reviewed; direct-question-only controlled template required.
- Unknown-as-absence: prohibited and fail-closed behavior confirmed.
- Safety guarantee: prohibited; renderer validation should be expanded to all banned variants and corrected copy.
- Unsupported comparison: prohibited; all asymmetric states need controlled templates.
- Additional consent: not required.
- KVKK/marketing conflation: prohibited.
- Serialization: review JSON uses stable key order, two-space indentation and trailing newline; deterministic verification is required.
- Production/UI/REC/authority activation/owner approval: outside scope and not performed.

## Official reference basis

- KVKK, “Açık Rıza Alırken Dikkat Edilecek Hususlar”: https://www.kvkk.gov.tr/Icerik/2037/Acik-Riza-Alirken-Dikkat-Edilecek-Hususlar
- KVKK, “Kişisel Verilerin İşlenmesine İlişkin Temel İlkeler”: https://www.kvkk.gov.tr/Icerik/4189/Kisisel-Verilerin-Islenmesine-Iliskin-Temel-Ilkeler
- Ticaret Bakanlığı, Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği: https://tuketici.ticaret.gov.tr/data/5e819a8e13b876a1b04c7a4a/T%C4%B0CAR%C4%B0%20REKLAM%20VE%20HAKSIZ%20T%C4%B0CAR%C4%B0%20UYGULAMALAR%20Y%C3%96NETMEL%C4%B0%C4%9E%C4%B0.pdf

