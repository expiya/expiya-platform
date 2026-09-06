# WU-XPY-CARS-AŞAMA1-BEHAVIOR-PARITY-01

Status: superseded by `docs/xpy-x-assistant-advisory-parity-v1.md`, which adds the missing novice/advisory contract and definitive public Cars runtime audit.

## Evidence boundary

Cars reference behavior is evidenced by `features/decision/v3/planCarsTurn.server.ts`, `carsQuestionPolicy.ts`, `usageQuestionMatrix.ts`, `ledger.ts`, `store.server.ts`, `nativeXpy.server.ts`, `components/cars/CarsConversationV3.tsx`, and the V3 conversation/correction/question/evaluation tests. Shared behavior is evidenced by `features/xpy/contracts.ts`, `nativeRuntime.ts`, `planner.ts`, `lifecycle.ts`, `questionGuidance.ts`, and `components/xpy/XpyPresentation.tsx`. Appliances category behavior is evidenced by the six category authorities and their conversation/planner adapters under `features/appliances`, plus their frozen artifacts under `data/production/appliances`.

## Parity matrix

| Behavior family | Classification | Cars reference | XPY / Appliances result |
|---|---|---|---|
| Intent recognition; social, closing, safety and informational turns | XPY UNIVERSAL mechanism; DOMAIN PACK language | V3 routes and X interruption | Shared X lifecycle preserves context; pack adapters retain category language; RESPOND never authorizes a card. |
| Natural acknowledgement and accepted-context continuity | XPY UNIVERSAL mechanism; DOMAIN PACK phrases | conversational acknowledgement in Cars P | Question projection acknowledges accepted ledger events without turning display copy into decision authority. |
| Ambiguous wording versus valid precision | XPY UNIVERSAL fail-closed rule; DOMAIN PACK interpretation | Cars confirmation and correction paths | Ambiguity produces one explicit clarification; a precise bounded answer is accepted without being asked again. Refrigerator “çift kapılı” is the regression case. |
| Zero-or-one cognitively bounded question | XPY UNIVERSAL | Cars prompt and `selectCarsQuestion` | `selectHighestMaterialQuestion` selects exactly one answerable discriminator; category planners no longer emit multi-axis discovery menus. |
| Materiality ordering and answered-question suppression | XPY UNIVERSAL strategy; DOMAIN PACK priorities | `questionCanReduceCandidates`, question history | Shared deterministic selector plus existing asked/deferred history; values and materiality remain pack-owned. |
| Structured quick replies and free-text equivalence | XPY UNIVERSAL transport/UI; DOMAIN PACK values | former Cars component-local quick choices | `XpyChoiceSet` is the common response contract. Cars and all six Appliances categories receive pack-owned values; the same textual value enters the normal interpreter. |
| Uncertainty, non-preference, skip and defer | XPY UNIVERSAL lifecycle; DOMAIN PACK consequence | Cars `questionDeferrals` | Escape values are present where bounded; unknown/skip/defer remains shared and prevents a repeated-question loop. |
| Short yes/no, prefixed confirmation, pending confirmation | XPY UNIVERSAL binding; DOMAIN PACK concept | Cars pending confirmation and appliance confirmation tests | Existing ledger confirmation paths are preserved; unbound short answers remain CLARIFY. |
| Correction, supersession, clear and contradictions | XPY UNIVERSAL ledger invariant; DOMAIN PACK parsing | Cars correction tests and ledger | Append-only events, explicit correction, clear and contradiction clarification remain category adapters over the shared transaction boundary. |
| Off-topic/non-answer re-entry | XPY UNIVERSAL; DOMAIN PACK re-entry copy | Cars X re-entry | Pending question is preserved; a generic non-answer now advances to one concrete pack question instead of asking the user to design requirements. |
| Consumer-language boundary | XPY UNIVERSAL | Cars public-copy guards | `consumerQuestionIsSafe` blocks ontology/meta terms and multiple question marks; unsafe planner copy falls back to a vetted pack prompt. |
| Budget preference vs hard decision-filter toggle | XPY UNIVERSAL contract; DOMAIN PACK price authority | Cars budget mode and UI | Existing shared budget band and category-specific exact-price authority are preserved. Display labels never alter Y. |
| Brand/model/category mentions | DOMAIN PACK | automotive entity and relaxation policy | Appliances brand control remains exact-category authority; Cars entity vocabulary is not copied. |
| Minimum/maximum/range and colloquial quantities | DOMAIN PACK | Cars Turkish semantic parser | Each appliance adapter keeps its governed units and normalization. Washing-machine household size remains context-only. |
| Household context, capacity and load consolidation | DOMAIN PACK | Cars passenger/family context | Washing-machine household size is acknowledged but does not invent a kilogram threshold; dryer and dishwasher use their own governed capacity meanings. |
| Installation envelope and fit | DOMAIN PACK values over XPY question mechanics | Cars parking/body questions are not reused | Each appliance category asks only an available installation dimension and provides a truthful non-preference choice. |
| Capabilities and feature preferences | DOMAIN PACK | Cars verified-equipment questions | Remote control, auto-dose, noise, pet head, HEPA, auto-open, cutlery tray, auto-empty and mop-lift stay in the owning pack; no cross-domain value is accepted. |
| Candidate-empty recovery, ASK/CLARIFY and ties | XPY UNIVERSAL outcomes; DOMAIN PACK evaluation | Cars no-match and relaxation | Canonical outcomes remain intact; deterministic Y keeps ties/card absence and explicit relaxation boundaries. |
| Explanation and tie transparency | XPY UNIVERSAL presentation; DOMAIN PACK facts | Cars no hidden tie-break behavior | Consumer copy describes the remaining products and trade-offs without schema or ontology names; a list position is never presented as a winner. |
| Next-best-question recovery | XPY UNIVERSAL strategy; DOMAIN PACK ranking | Cars next-question selection | After an accepted, skipped or non-answering turn, P advances to the next answerable material question instead of delegating requirement discovery to the user. |
| Refresh, stale revision, replay, double click | XPY UNIVERSAL transaction/presentation | Cars signed state/store | Choice metadata is validated against the pending question before the normal CAS/replay path; synchronous client locks prevent duplicate submission; READ reprojects choices. |
| Decision-ready handoff and authorization-before-card | XPY UNIVERSAL invariant; CARS ONLY terms/AŞAMA 2 | Cars offer consent and handoff | Appliance and Cars cards remain Y-authorized. Cars recommendation terms and AŞAMA 2 handoff stay automotive-only. |
| Vehicle taxonomy, scoring, personas, equipment and purchase-intent meanings | CARS ONLY | V3 domain engine | Not copied into Appliances. Only the universal question/choice/lifecycle mechanics are shared. |

## Six-pack question projection

| Pack | Representative bounded question |
|---|---|
| WASHING_MACHINE | approved budget, remote-control, auto-dose and noise questions; measurement escape choices |
| DRYER | novice orientation and intent choice, then load capacity; installation follows only after selection begins |
| REFRIGERATOR | ambiguous “çift kapılı” is not redefined; freezer location is clarified with bottom/top/non-preference choices |
| DISHWASHER | numeric place-setting need, fit, then one material feature discriminator |
| VACUUM | radius when prompted by socket use; pet-head/HEPA discriminator otherwise |
| ROBOT_VACUUM | furniture clearance, fit, then auto-empty/mop-lift discriminator |

## Deliberate blockers

- The approved washing-machine question policy explicitly excludes a capacity threshold pending a Product decision. Household size is therefore accepted as context but cannot silently become a kilogram filter.
- The active refrigerator catalog represents bottom-freezer combi products and has no governed side-by-side/French-door identity semantics. “Çift kapılı” can only trigger the precise existing `FREEZER_ARRANGEMENT` clarification; no side-by-side meaning is inferred.
- Exact price coverage remains unavailable for five Appliance categories. Their budget toggle records the user boundary but cannot fail open by pretending price compatibility.

These blockers do not prevent the shared question, choice, lifecycle, consumer-language, replay, revision, or authorization mechanisms from operating.

## Changed files

- Shared XPY: `features/xpy/contracts.ts`, `features/xpy/questionGuidance.ts`, `features/xpy/questionGuidance.test.ts`, `features/xpy/visualPacks.ts`.
- Appliances platform and UI: `features/appliances/contracts.ts`, `features/appliances/questionPack.ts`, `features/appliances/questionPack.test.ts`, `features/appliances/nativeTurn.server.ts`, `features/appliances/nativeConversationRoute.server.ts`, `features/appliances/recovery.server.ts`, `app/appliances/AppliancesConversation.tsx`, `app/appliances/stage/2/page.tsx`, `app/appliances/stage/3/page.tsx`.
- Appliance planners/adapters: `features/appliances/conversation.server.ts`, `features/appliances/dryer/conversation.server.ts`, `features/appliances/refrigerator/conversation.server.ts`, `features/appliances/refrigerator/conversation.test.ts`, `features/appliances/bounded/questionPlanner.ts`, `features/appliances/bounded/categoryRegistry.ts`, `features/appliances/bounded/conversation.server.ts`, `features/appliances/bounded/conversation.test.ts`.
- Cars parity: `features/decision/v3/carsQuestionChoices.ts`, `features/decision/v3/carsQuestionChoices.test.ts`, `features/decision/v3/types.ts`, `app/api/cars/conversation/v3/route.ts`, `components/cars/CarsConversationV3.tsx`.
- Audit report: `docs/xpy-cars-stage1-behavior-parity-v1.md`.

## Verification

- `npx tsc --noEmit --pretty false`: passed.
- Scoped ESLint over every changed TypeScript/TSX implementation: passed.
- `features/decision/v3` plus `features/xpy`: 40 files, 330 tests passed.
- `features/appliances`: 35 files, 363 tests passed.
- Port 4043 browser smoke: refrigerator ambiguity → bottom-freezer choice → next installation question → refresh recovery; washing-machine household context → acknowledgement → one remote-control question; Cars purchase intent → six usage choices → family choice → one body-style question.
