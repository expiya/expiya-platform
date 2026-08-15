# Expiya Cars Phase 1 — New-Car Scope and Governed Budget Authority

Status: **IMPLEMENTED**
Date: 2026-08-15
Scope: Phase 1 product contract for Expiya Cars conversation: new vehicles only, optional discovery budget, deterministic new-price filtering before a budget-compatible recommendation.

## 1. Phase 1 is new-car only

The active acquisition market is `NEW_ONLY`.

- Ordinary discovery does not ask “sıfır mı, ikinci el mi?”
- An unspecified budget is not used-market openness.
- `USED_ONLY` and `NEW_OR_USED` remain in internal types as dormant Phase 2 states. They are not an active product path.
- If the user asks for a used vehicle, used listing, or used-market recommendation, the assistant answers briefly that the current product works with new vehicles, does not analyze or recommend that used unit, and does not enter a limitation loop.

Consumer copy must not use internal terms such as Phase 1, runtime, evidence authority, or scope contract.

## 2. Budget is optional during discovery

Budget is a late-stage affordability filter and possible discriminator, not a mandatory opening question.

- Technical fit and a model-fit offer may proceed without a budget.
- A missing budget is never unlimited affordability.
- Soft language (`yaklaşık`, `civarı`, `kabaca`) stays contextual and is not silently converted into a hard exclusion.
- Hard ceilings (`en fazla`, `üzerine çıkmak istemiyorum`, `kesin üst sınır`, `aşamam`, `tavanım`) are deterministic new-price constraints.

## 3. Budget is deterministic before a budget-compatible recommendation

Correct order:

1. Technical eligibility
2. Current new-price applicability
3. Hard-budget pass / fail / unknown
4. Remaining candidate set
5. Existing deterministic discriminator
6. Offer → consent → card

The model does not choose a winner. A hard budget filters the full eligible set before authorization. The runtime must not select IONIQ 9 first and then append a budget disclaimer.

- `PASS` candidates may receive a `NEW_CONFIGURATION_OFFER`.
- `FAIL` and `UNKNOWN` are excluded from the budget-compatible winner set.
- If none pass: `NO_AFFORDABLE_EXACT_MATCH`, `NEAREST_OVER_BUDGET_AVAILABLE`, or `PRICE_UNKNOWN_FOR_TECHNICAL_MATCH`. There is no “En güçlü aday” budget-compatible card.

## 4. Price authority and freshness

Price data is read from the pinned production catalog observations and exact identity mappings. Conversation code does not duplicate catalog amounts.

A price evaluation is `PASS` | `FAIL` | `UNKNOWN` | `NOT_REQUESTED`.

`PASS` requires an exact candidate-to-catalog mapping, `condition=NEW`, Turkey applicability, a current observation, production catalog source authority, amount at or below the hard ceiling, and no known mandatory excluded charge that would cross the ceiling. Campaign prices are not an unconditional `PASS` when eligibility, stock, or dealer conditions are material.

`FAIL` is returned when a current applicable new price is above the ceiling. A campaign above budget is still `FAIL` for that observed offer.

`UNKNOWN` covers absent, stale/expired, inexact identity, material conflicts, campaign eligibility uncertainty, fee uncertainty that could cross the ceiling, and insufficient source or current-sale status. `UNKNOWN` never passes a hard budget. Expired campaigns are not current. Stale prices are not silent fallbacks.

Internal IDs stay in trace. They are not consumer copy.

## 5. No-match and trade-off behavior

When technically eligible candidates exist but none pass:

- Do not pretend an over-budget vehicle fits.
- Explain that no governed new vehicle satisfies all hard requirements within the ceiling.
- If a verified nearest over-budget price exists, compute `gapTry = applicablePriceTry - budgetTry` and `gapPercent = gapTry / budgetTry × 100`. Never invent a fixed 20%.
- Extreme gaps (for example IONIQ 9 at 5.81M versus 2M) are not near matches and must not pressure the user to raise budget.
- Ask at most one focused question about a hard requirement that actually caused elimination, or about genuine budget flexibility.

Requirement corrections supersede memory and rerun the full governed evaluation. Semantic no-loop rules remain.

## 6. Direct affordability questions

Questions such as “Bu araç bütçeme uygun mu?” or “Peki bu araç 2 milyon bütçeme uygun mu?” are answered directly before any new offer or discovery question.

A shown candidate remains known as shown. The follow-up evaluates that candidate’s current new price. There is no second offer and no repeated card.

## 7. Used market is Phase 2

Used inventory, used valuation, dealer-used stock, and used purchase recommendations are out of Phase 1.

User-submitted listing URLs are fail-closed for recommendation claims: the conversation does not fetch or ingest the page, and `/api/cars/listing-analysis` is gated (`PHASE1_USED_LISTING_ANALYSIS_ACTIVE = false` in `features/listing/phase1ListingAnalysisGate.ts`). Underlying listing-analysis code is preserved for Phase 2.

## 8. Configuration cards versus future listing cards

The current card is a **new vehicle configuration**, not a used listing.

Where data is governed and current it may show model year, powertrain, current new price, list versus campaign, and a compact campaign note. It is not a purchase listing card. Future listing cards are a different product.

Offer → consent security, forged-hold rejection, and the strict discriminator are unchanged. The LLM never has winner authority and never invents prices.
