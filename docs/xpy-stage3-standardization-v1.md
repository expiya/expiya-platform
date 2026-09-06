# XPY AŞAMA 3 platform standardization v1

## Verdict

Cars defines AŞAMA 3 as a bounded, post-evaluation sales-request preparation flow. It is not Product/XPY decisioning and it does not authorize an external transaction. Appliances has no repository authority for request capture, seller contact, payment, order, stock or fulfillment, so its AŞAMA 3 remains deliberately unavailable. The shared platform responsibility is the entry contract, fail-closed boundary and responsive shell; domain action meaning and external adapters remain domain-owned.

## Cars inventory

| Surface | Current responsibility | Authority / transition |
| --- | --- | --- |
| `/cars/variant/[exactVariantId]` | AŞAMA 2 exact-variant evidence and bounded Sales Advisor | Opens only with the signed Cars AŞAMA 2 handoff and rechecks revealed offer plus current catalog artifact. |
| `POST /api/cars/sales-advisor/phase3-handoff` | Select quote, test-drive or dealer-contact intent | Reopens AŞAMA 2, rate-limits client/conversation/offer/variant, then issues a 30-minute signed handoff with `externalExecutionAuthorized: false`. |
| `/cars/sales-request/[intent]` | AŞAMA 3 request form | Dynamic intent and signed handoff must match. Unsafe `returnTo` falls back to AŞAMA 1. |
| `POST /api/cars/sales-request/bootstrap` | Server-derived public form projection | Reopens AŞAMA 3, derives public vehicle title and legal/summary state; raw product and dealer identifiers are no longer projected to the browser. |
| `POST /api/cars/sales-request/otp/send` and `/verify` | Phone-possession check | Same-origin, bounded attempts, expiry and handoff binding. Real SMS is disabled unless legal and explicit external execution flags are present; pilot mode is non-production only. |
| `POST /api/cars/sales-request/submit` | Validate and retain a pilot request | Same-origin, CSRF consumption, rate limit, honeypot, strict schema, OTP consumption, intent/decision/summary/dealer binding and idempotency. Current repository is in-memory and the outbound envelope is blocked from delivery. |

Cars trust boundaries include HMAC signatures, constant-time signature checks, short expiry, active revealed-offer verification, catalog release/fingerprint verification, exact-variant reconstruction, strict Zod envelopes, no-store responses, redacted errors, consent receipts, allowlisted outbound fields and explicit non-delivery. Known gaps are unchanged: legal artifacts are drafts, the data controller and retention/processor facts are incomplete, the seller directory is fake outside production, real SMS is disabled by default, storage is in-memory, no CRM/portal delivery occurs, and no payment/order/fulfillment authority exists.

## Shared contract

`xpy-stage-three-entry/v1` defines AŞAMA 3 as `PREPARE_AUTHORIZED_POST_EVALUATION_ACTION`. Entry must inherit one signed AŞAMA 2 authority and bind department, category, conversation, positive decision revision, decision fingerprint, exact product, configuration identity, frozen evidence release/fingerprint, parent AŞAMA 2 digest, chosen action, issuance/expiry and revision-bound replay policy. External execution is always false in this entry capability.

Validation fails closed for malformed, expired, future-dated, overlong, cross-domain, cross-category, cross-conversation, stale-revision, cross-decision, cross-product, cross-configuration, evidence, parent-handoff or action mismatch. Technical/catalog evidence stays in the binding; volatile offer, seller, payment, order and fulfillment capabilities are separate presentation/runtime facts and cannot influence XPY.

Cars embeds this platform binding inside its existing signed AŞAMA 3 token and verifies it again after reconstructing the current exact catalog artifact. Appliances can consume the same contract after a future domain authority exists; today it consumes only the shared unavailable shell and category presentation adapters across all 24 active categories.

## Deliberate domain differences

Cars retains its three established intents, consent form, OTP and internal pilot-review behavior. These are Cars semantics, not shared platform Product meaning. Appliances does not borrow test-drive, dealer, vehicle or lead concepts. It publishes honest category-language capability states and collects no contact information.

## Historical and public identity handling

The system retains exact internal identity, configuration, decision revision/fingerprint, evidence release/fingerprint and parent-handoff digest for reproducibility. The UI receives and renders only the public product title plus public action label; raw exact-product, offer, conversation, decision and dealer identifiers are not displayed.
