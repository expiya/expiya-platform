# WU-XPY-STAGE2-CARS-ADAPTER-01 — final A–M report

## A. Verdict

`IMPLEMENTED / CARS_ONLY / NO DEPLOYMENT`. The authoritative Cars signed AŞAMA 2 handoff now enters the shared AŞAMA 2 contract through exactly one Cars adapter. Existing Cars artifact generation, cryptographic verification, rich visual hierarchy, deep link, Advisor semantics and side-effect-free AŞAMA 3 handoff remain owned by Cars.

## B. Before/after parity matrix

| Representative case | Before | After | Disposition |
|---|---|---|---|
| Valid exact variant | Cars endpoint opened signed handoff and returned Cars artifact | Same open/validation, then typed shared projection | Preserved |
| Refresh/recovery | Revision-bound reusable token until expiry | Same token policy; projection re-derived after every verified open | Preserved |
| Comparison not purchased | Chat could assemble the full catalog on a comparison request | Locked; no products or rows leave the adapter | Intentional authority correction using existing purchased-entitlement policy |
| Comparison purchased | No Cars entitlement read path | Server-side persisted entitlement; only exact authorized IDs become products/rows | Added within existing entitlement authority |
| Comparison revoked/expired | No Cars-specific projection state | Locked, with no products or rows | Fail closed |
| Exact-product Advisor question | Existing Cars semantic planner and deterministic answer | Shared guard passes allowed question to the same Cars implementation | Preserved |
| Unentitled alternative / Stage 1 reopening | Comparison could search catalog; selection changes were conversationally discouraged | Shared guard refuses both before Cars answer generation | Hardened |
| Tampered/expired/revision/evidence mismatch | Cars HMAC, offer and catalog revalidation rejected | Same Cars checks run first; shared exact binding validates again | Preserved and layered |
| Missing media/price | Cars disclosures and visual fallbacks | Same Cars UI; projection records explicit unavailable state | Preserved |
| Desktop / 390×844 | Cars responsive hero, sections, media and Advisor | Same markup remains inside shared protocol boundary; comparison offer is responsive | Preserved |

## C. Adapter and registration

`CARS_XPY_STAGE_TWO_ADAPTER` is the only `CARS:NEW_CAR` registration. The registry rejects a distinct second registration. It accepts only Cars handoff `2.0.0` and governed artifact `variant-content/v2`.

## D. Projection

The adapter maps exact variant/configuration identity, conversation, decision revision/fingerprint, catalog release/fingerprint, issued/expiry times, facts, equipment, claim scopes, limitations, media and price states. It rejects artifact/handoff identity or evidence divergence.

## E. Renderer

The Cars page is wrapped by `XpyStageTwoRenderer` while retaining the existing Cars hierarchy. The shared comparison offer is placed after the selected product evidence and before Sales Advisor. Existing URLs and loading/error states are unchanged.

## F. Security

`openPhase2Experience` remains the only entry and continues to verify HMAC, token grammar, expiry/future issue, revealed offer, decision fingerprint, exact membership, current catalog release/fingerprint and artifact checksum. Shared validation does not accept a client projection or unsigned artifact.

## G. Advisor

The shared guard blocks Stage 1 reopening, new vehicle selection and unentitled comparison. Allowed questions continue through the existing Cars semantic planner and deterministic evidence resolver; no valid technical, equipment, price, media or fit behavior was replaced.

## H. Comparison

Entitlement is loaded only server-side from the existing persisted comparison-entitlement repository. Missing configuration, database failure, missing record, wrong subject/category/decision, expiry, revocation/refund or an exact-set mismatch becomes `NOT_PURCHASED`. Only authorized IDs are materialized. Cars owns the five existing comparison row concepts: price, power, seats, luggage and consumption.

## I. Files

- `features/sales-advisor/xpyStageTwoAdapter.server.ts` and focused tests
- Cars experience/chat API routes
- Cars Stage 2 client experience
- shared renderer, advisor guard and duplicate-registration gate
- this audit

## J. Tests

Focused coverage includes registration, exact authority, projection states, purchased exact-set filtering, Cars-owned rows, locked/revoked/expired behavior, future issue, artifact mismatch, Advisor parity/refusals, handoff tamper/expiry/replay and renderer composition.

## K. Build and browser

Node 24 production build passed. Desktop and 390×844 browser QA verified that an invalid or tampered Cars handoff fails closed with the expected recovery message and return action. A locally generated valid handoff could not be opened end to end because the existing in-memory Cars offer registry is isolated between Next.js route bundles: Stage 1 completed, but the handoff endpoint returned 409 in both production and webpack-preview servers. Valid-state composition remains covered by the renderer tests and production build. No deployment or activation was performed.

## L. Integration

Baseline is `d43b2995c56b24d751d57dbfda95d98cdab239cf`, already containing Catalog Factory, Stage 2 foundation, Electronics v1.2, Universal Persona/cards, Mobility and Secretary lineage. No active pointer, catalog, Persona, database schema or production state changed.

## M. Exactly one next bounded unit

`WU-XPY-STAGE2-CARS-COMPARISON-OFFER-UX-01`: connect the already-authorized comparison offer UI to a read-only entitlement-status explanation/report-open flow, without payment, purchase issuance, catalog expansion, selection rerun, merchant action or AŞAMA 3 changes.
