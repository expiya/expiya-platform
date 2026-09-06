# XPY AŞAMA 1 unified runtime — v1

Status: active; executable baseline `XPY_RUNTIME/v0.1`, 2026-09-04.

## Cars-first authority discovery

The active Cars AŞAMA 1 pilot route is `/analysis?pilot=v3.8`, rendered by `CarsConversationV3` and served by `/api/cars/conversation/v3`. Same-origin/rate/body validation precedes the V3 store. The store owns message replay, payload conflict and revision conflict. The V3 engine interprets conversational intent, appends provenance-bearing preference events, evaluates the pinned production catalog, creates a decision-fingerprinted offer, and reveals exact variants only after recommendation-terms authorization. Its browser recovery is a signed state token plus session storage; AŞAMA 2 handoff remains separate.

Appliances enters through `/appliances` and `/api/appliances/conversation`. PostgreSQL is authoritative, with a revision/CAS transaction and durable message outcomes. Its six active categories use the same state schema but retain four domain evaluation adapters: washing machine, dryer, refrigerator, and the bounded dishwasher/vacuum/robot-vacuum pack. All authorize before projecting a card.

## Ownership and ports

`features/xpy/contracts.ts` is the versioned public protocol. `features/xpy/runtimeContract.ts` is the digest-bound `XPY_RUNTIME/v0.1` ownership baseline, and `features/xpy/nativeRuntime.ts` enforces its phase order: preflight, X proposal, validation, P planning, Y decision, one commit, public projection. X cannot mutate authoritative context. P consumes only validated pack concepts. Y consumes validated context and evidence, and card projection requires an authorization fingerprint plus authority references.

Domain Packs supply categories, capabilities, catalog/evidence authority, concepts, question policy, sufficiency/recommendation policy, copy boundaries, card fields and disclosures. They do not own the XPY loop. Storage adapters remain separate because Cars V3 currently uses its signed-state/memory compatibility store while Appliances uses PostgreSQL.

X classifies product education through a domain-neutral taxonomy: novice guidance, category/buyer guidance, feature education, comparison information and general education. Turkish normalization and bounded typo tolerance apply before domain-pack vocabulary selects the answer. Generic “alırken” wording does not establish personal buying intent. Pure information commits `contextMutation: NONE` without Y; a mixed turn may validate explicit personal constraints and then permits P to ask one material question after X answers the informational part.

The active routes register `cars-stage1/v3.8` and `appliances-stage1/v1` through `features/xpy/domainPacks.ts`; all seven categories bind to the same runtime version and digest. All Appliances category engines enter `executeNativeXpyTurn` through the Conversation Kernel bridge. The active Cars route supplies the explicit `prepareCarsTurn` / `planCarsTurn` / `executePreparedCarsDecision` ports to the XPY-bound V3 store; it does not call the whole-turn `runV3Turn` convenience adapter. Native preflight, shared X re-entry, shared P interruption/deferral, and the single authoritative store commit therefore precede Cars domain evaluation.

## Cars X-condition audit

| Existing condition | Owner after shaping | Notes |
|---|---|---|
| Greeting/social acknowledgement | shared X + pack copy | No decision mutation. Remaining specialized Cars tone is pack knowledge. |
| Off-topic redirect/re-entry | shared X + `xReentry` data | Skips Y, commits RESPOND, preserves pending P question. |
| Automotive informational questions | shared X intent + Cars knowledge | Adjacent domain information is not off-topic. |
| Safety/legal response | shared X intent + governed Cars copy | No candidate authority. |
| User closing | shared X lifecycle | Closing is not recommendation authorization. |
| Ambiguity/clarification | P | Must not become X-authored decision context. |
| Pending-question interruption | shared P | Preserve/resume without resolving it. |
| Correction/negation/supersession | shared P routing + Cars concept adapter | Ledger mutation only after validation. |
| Unsupported used/category request | pack scope boundary | Not a global off-topic rule. |
| Offer consent/terms | Cars Y authorization | Never generic confirmation. |
| AŞAMA 2 handoff | external post-decision boundary | Outside XPY AŞAMA 1. |

`XpyDomainReentryConfig` is data-only: public name, decision-journey purpose, informational terms, and governed re-entry prompt. It cannot execute domain code or reach Y.

## Parity and duplication matrix

| Capability | Shared owner | Cars | WM | Dryer | Refrigerator | Dishwasher | Vacuum | Robot vacuum |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| Same-origin / request boundary | route security | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Replay / revision / idempotency | persistence port | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Informational interruption preserves P question | X lifecycle | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Unknown / skip / defer classification | P lifecycle | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Question dedupe | P lifecycle/kernel | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Contextual yes/no/numeric binding | P + pack concepts | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Needs-only / hard budget mode | shared contract + pack policy | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Hard brand + explicit relaxation | pack policy under Y | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Evidence-bounded evaluation | Y + pack authority | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Tie / non-dominated / unknown evidence | Y projection | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Authorization before card | Y | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Choice controls / loading / budget band / shell | XPY presentation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Responsive and keyboard semantics | XPY presentation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Canonical outcomes are `ASK`, `CLARIFY`, `RESPOND`, `DECISION_READY`, `UNSUPPORTED`, and `FAILED_CLOSED`. Cars V3's legacy response envelope is a compatibility projection until its public API can be versioned; Appliances already exposes the canonical discriminant.

## Non-regression boundaries

No catalog, evidence artifact, price observation, production database, AŞAMA 2/3, or commerce path is changed by this migration. X output remains a proposal. Informational RESPOND carries no decision authorization. A relevant context mutation invalidates Appliances authorization; Cars offer reveal continues to verify its decision fingerprint. Domain-specific taxonomy, candidate vocabulary and card fields remain in their packs.

The superseded common loading indicator, budget switch band and choice-button renderer are no longer active in Cars; Appliances uses the shared shell, loading and budget primitives, with its remaining domain card projection intentionally pack-owned. Repository search returns no `executeXpyCompatibilityTurn` reference.

## XPY Experience System — AŞAMA 1 boundary

`xpy-experience/v1` owns the shared page shell, hierarchy, spacing, interaction grammar, conversation frame, budget control, choices, loading, responsive behavior and accessibility constraints. Cars and Appliances pass non-executable Domain Visual Packs to the same `XpyStageOneFrame`; pack identity and scene direction are exposed as stable data attributes without changing structural markup.

| Structural responsibility | Experience owner | Cars visual pack | Appliances visual pack |
|---|---|---|---|
| Stage-one frame and navigation seam | XPY global | shared | shared |
| Transcript, bubbles and composer grammar | XPY global | shared | shared |
| Budget, choices, loading and recovery states | XPY global | shared | shared |
| Decision-card anatomy and evidence/disclosure slots | XPY global | vehicle fields in typed slots | appliance fields in typed slots |
| Typography, density, contrast and breakpoints | XPY global | inherited | inherited |
| Scene/art direction | Domain Visual Pack | `ROAD` | `STUDIO_CYCLORAMA` |
| Governed media identity/provenance | Domain Visual Pack reference | exact vehicle boundary | exact appliance boundary |
| Ranking, winner, certainty or authorization | never presentation | Y only | Y only |

`XpyFutureStageExtensionBoundary` reserves shared comparison-report, evidence, chart, evaluation-workspace and authorized-action seams. It implements no AŞAMA 2 or AŞAMA 3 behavior.

Recorded backlog, not started: `WU-PLATFORM-XPY-EXPERIENCE-SYSTEM-02` — converge existing Cars AŞAMA 2/AŞAMA 3 structures into shared stage templates and Domain Visual Pack slots without moving stage authority into presentation.
