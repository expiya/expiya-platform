# WU-XPY-X-GENERAL-INFORMATION-INTENT-01

Status: IMPLEMENTED on the authoritative checkout, 2026-09-04. This status covers the public Cars AŞAMA 1 path and all six active Appliances capabilities. It is not a deployment or production-database change.

## Root cause and correction

The defect was an intent-classification overfit with two runtime leaks. The first classifier recognized punctuation and a narrow `nedir / ne demek` family, so natural novice and buyer-education language fell through to `DECISION_CONTEXT`. The first correction added novice phrases but still treated general buyer guidance—“alırken en çok neye dikkat etmek gerekir?”—as a personal selection turn. The isolated classifier test initially hid a second leak in Washing Machine: X correctly produced `DOMAIN_INFORMATION`, then the legacy outer commit decorator saw the same text as decision context, advanced the planner, and replaced X’s answer with the remote-control question.

`features/xpy/advisory.ts` now classifies product education by semantic family rather than product phrase: category guidance, feature education, comparison information, general education and novice guidance. It normalizes Turkish case/diacritics and permits bounded typo tolerance only for low-collision tokens such as `yardım`, `dikkat`, `kriter` and `ölçüt`. High-collision language uses exact morphological stems; consequently `park`, `parkı`, `farklı` and “dikkat çekici” no longer masquerade as general-information intent.

Precedence is explicit:

1. Detect the information/advisory family without using domain nouns.
2. Detect concrete purchase intent separately. The generic gerund “alırken” is not purchase intent; explicit first-person constraints, “satın almak istiyorum”, “arıyorum”, “bana uygun” and equivalent concrete language are.
3. Pure information stays in X, carries `contextMutation: NONE`, writes no decision ledger and does not invoke Y. It gives a pack-owned useful answer, then asks whether the user wants information only or personal selection.
4. Mixed information plus concrete buying intent gives the X answer first, validates any explicit context, then P asks exactly one material next question.
5. Novice guidance retains the warm orientation/opt-in behavior, while bare “bilmiyorum” remains available to the pending-question lifecycle.

The Washing Machine commit decorator now advances after a normal decision-context response but never after `DOMAIN_INFORMATION`; it can no longer overwrite X’s answer. All six appliance categories are tested through the real native runtime boundary, not only through the classifier helper.

## Definitive Cars runtime answer

Public Cars AŞAMA 1 is **hybrid: XPY_RUNTIME/v0.1 orchestration around the authoritative Cars V3.8 domain engine**.

- Public entry: `/` now sends its query to `/analysis?pilot=v3.8`; `/analysis` without a compatibility pilot redirects to the same canonical path. `/cars` also links to `/analysis?pilot=v3.8`.
- UI/API: `CarsConversationV3` calls `POST /api/cars/conversation/v3` with revision, signed state token, optional structured choice and recommendation-terms acceptance.
- XPY ownership: the route enters `runStoredV31Turn`; that store binds `cars-stage1/v3.8:NEW_CAR` to `XPY_RUNTIME/v0.1`, then runs shared preflight, X interpretation, validation, P lifecycle and one commit through `executeNativeXpyTurn`.
- Cars V3.8 ownership behind the ports: `prepareCarsTurn` performs semantic routing and append-only context interpretation; `planCarsTurn` owns Cars questions, conversation-specific policy and the Y transition; `executePreparedCarsDecision` evaluates the pinned catalog, creates or verifies a decision-fingerprinted offer, enforces recommendation terms and projects exact variants.
- Compatibility projection: the public JSON discriminant remains `V3_CONVERSATION`; `choices` and `advisory` are XPY fields projected into that response. This is an explicit API-compatibility envelope, not a second decision authority.
- Legacy: `/api/cars/conversation` still contains the older local/V2-shadow orchestration and `CarsConversation`; after this change it is reachable from the UI only through authenticated `pilot=1`. It is not the public/default AŞAMA 1 authority. V2 shadow and whole-turn helpers remain test/compatibility surfaces and were not revived.

Browser behavior can legitimately differ by alias and runtime configuration: all `pilot=v3` through `pilot=v3.8` aliases render V3.8; `pilot=1` is the authenticated legacy compatibility route; `CARS_V31_PROVIDER_DISABLED=true` selects deterministic semantic fallback; otherwise `OPENAI_API_KEY` and `OPENAI_CARS_CONVERSATION_MODEL` may supply a validated semantic proposal; `includePilotDiagnostics` exposes aggregate counts only after explicit purchase intent; signed-state recovery can restore after the in-memory store is lost. `CARS_CONVERSATION_LOCAL_TESTING` now affects only the explicit legacy compatibility branch. Appliances additionally require their PostgreSQL store and pinned category artifacts.

## XPY_RUNTIME/v0.1 baseline

The executable contract is `features/xpy/runtimeContract.ts`, version `XPY_RUNTIME/v0.1`, digest `96a533872b3b47c594e982cf5a71e3eb50c226aef65b3f4214b71a29b87ed6ee`.

| Layer | Owns | Must not own |
|---|---|---|
| X Assistant | information/advisory, acknowledgement, social, off-topic, closing, safety and pack-adapted language | context writes, candidate evaluation, sufficiency, selection or authorization |
| P Question Planner | at most one highest-materiality answerable question, pack choices, uncertainty/free text, pending-question continuity and loop suppression | invented domain semantics, candidate selection or authorization |
| Y Decision Maker | validated context, deterministic candidates, sufficiency, selection, authorization and exact identity | conversational invention |
| Orchestrator | preflight → X → validation → P → optional Y → one commit → presentation; replay/revision/authority failure closes safely | independent X/P/Y commits or an unbound domain engine |

Supported envelopes are X-only RESPOND, P ASK/CLARIFY, X orientation plus P next step, and Y DECISION_READY/FAILED_CLOSED. Domain Pack ports own semantics, questions/materiality, catalog/evidence, sufficiency/selection and presentation. Every active pack registration carries the runtime version/digest; the runtime rejects unsupported bindings. Authority fingerprints, pinned catalog/semantic digests, one-commit replay and card recovery remain domain-state responsibilities. `runtimeContract.test.ts` recomputes the contract digest and proves all seven registered capabilities bind to it.

## Domain orientation sources

| Capability | Pack-owned novice dimensions and source |
|---|---|
| Cars / NEW_CAR | use, passenger/load pattern, body, fuel/charging, budget, indispensable equipment; `carsAdvisory.ts`, `carsQuestionPolicy.ts`, V3.8 catalog/equipment policies |
| WASHING_MACHINE | real wash routine, space, care programs, remote control, dosing, sound; active washing-machine question/recommendation authority; household size remains context-only |
| DRYER | actual load, placement, fabrics/programs, care, comparable energy/noise; `data/production/appliances/dryer/domain-pack.json` and dryer authority |
| REFRIGERATOR | separate net volumes, freezer arrangement, space, comparable sound/energy; refrigerator domain pack and explicit freezer-arrangement policy |
| DISHWASHER | place settings, space, drying, cutlery layout, comparable resources/sound; bounded dishwasher pack |
| VACUUM | reach, bin, filtration and pet tooling; bounded vacuum pack; motor input power is not cleaning outcome |
| ROBOT_VACUUM | clearance, thresholds, station, auto-empty, carpet/mop behavior, mapping; bounded robot pack; Pa alone is not cleaning outcome |

## General-information corpus

The domain-neutral classifier corpus supplies the same ten structural cases to every active capability: eight pure-information families, one mixed information/purchase case and one negative plain-preference case. That is 70 classifier cases in total before runtime integration coverage.

| Capability | Pure information | Mixed | Negative preference | Total |
|---|---:|---:|---:|---:|
| Cars / NEW_CAR | 8 | 1 | 1 | 10 |
| WASHING_MACHINE | 8 | 1 | 1 | 10 |
| DRYER | 8 | 1 | 1 | 10 |
| REFRIGERATOR | 8 | 1 | 1 | 10 |
| DISHWASHER | 8 | 1 | 1 | 10 |
| VACUUM | 8 | 1 | 1 | 10 |
| ROBOT_VACUUM | 8 | 1 | 1 | 10 |
| **Total** | **56** | **7** | **7** | **70** |

The eight pure families cover what matters/attention, how to choose/start, criteria, differences/trade-offs, feature or technology explanation, category overview/buyer guidance, useful/necessary, and comparison information without personal selection. Inputs include Turkish diacritic omissions, inflections and ordinary misspellings. Separate collision regressions cover parking language, `farklı` as an adjective, “dikkat çekici” and concrete equipment statements.

## Capability migration inventory

| Capability | Evidence | Status | Classification | Ported contract/test | Remaining gap |
|---|---|---|---|---|---|
| Natural novice advisory | `advisory.ts`, `carsAdvisory.ts`, Appliances `advisory.ts` | Active | XPY UNIVERSAL mechanism + DOMAIN PACK copy | golden structural tests for all seven | None |
| Social/off-topic/closing/safety | X assistant, Cars V3 direct replies, appliance category responses | Active | XPY UNIVERSAL routing + pack language | native runtime and cross-runtime acceptance | Specialized Cars copy remains Cars-only by design |
| Information vs decision routing | X detector, V3 semantic provider/router, appliance X interruption | Active | XPY UNIVERSAL boundary | pure/mixed/no-write tests | None |
| Highest-materiality question | shared selector, Cars question policy, four appliance planners | Active | XPY UNIVERSAL strategy + DOMAIN PACK values | one-question and no-hard-filter assertions | Washing-machine kg mapping is deliberately unavailable |
| Guided quick replies/free text | shared `XpyChoiceSet`, both public UIs and API validators | Active | XPY UNIVERSAL transport/UI + DOMAIN PACK options | button and free-text paths for all seven | Cars keeps V3 JSON envelope for compatibility |
| Uncertainty/skip/defer | shared lifecycle and appliance semantic adapter | Active | XPY UNIVERSAL | bare `bilmiyorum`, deferral and loop tests | None |
| Context/correction/confirmation | V3 ledger; appliance append-only ledgers and pending confirmations | Active | XPY UNIVERSAL invariant + DOMAIN PACK parsing | correction/confirmation suites | Domain vocabularies intentionally differ |
| Turkish robustness | normalized X intent; V3 and category parsers | Active | XPY UNIVERSAL normalization + DOMAIN PACK morphology | typo matrix, short-answer suites | No claim of arbitrary misspelling coverage |
| Budget toggle | shared stage-one band; Cars budget mode; appliance budget control | Active | XPY UNIVERSAL interaction + DOMAIN PACK price authority | budget and native adapter suites | Five appliance packs lack exact price coverage and therefore fail closed |
| Conversational continuity | pending question preservation, asked/deferred history | Active | XPY UNIVERSAL | resume/no-loop tests | None |
| Empty/non-answer recovery | unbound-short CLARIFY and next material P question | Active | XPY UNIVERSAL strategy + DOMAIN PACK prompts | acceptance and category suites | None |
| Progressive disclosure | novice intent question → material P question → Y readiness | Active | XPY UNIVERSAL envelope | public API and six-pack integration tests | None |
| Deterministic candidates/sufficiency | Cars catalog adapter; appliance evaluators | Active | DOMAIN PACK / Y | tie, non-dominated, no-candidate and evaluation suites | No cross-domain score exists by design |
| Card authorization/exact identity | Cars offer governance and exact variant IDs; appliance authorization/card/recovery | Active | XPY UNIVERSAL invariant + DOMAIN PACK identity | authorization, tamper and recovery suites | Cars terms/AŞAMA 2 handoff remain CARS ONLY |
| V2/local Cars orchestration | old public API, `CarsConversation`, V2 shadow adapters | Legacy compatibility | CARS ONLY | isolated behind authenticated `pilot=1` | Eventual removal is separate API migration work, not an active authority gap |

Superseded behavior was not mechanically revived: component-local Cars quick-reply definitions were replaced by the pack contract; whole-turn compatibility is not used by the active route; V2 shadow logic stays on the legacy endpoint; installation-first Dryer discovery was replaced for novice entry because it was not the highest-value user-centered start.

## Cross-runtime acceptance and browser evidence

`crossRuntimeAcceptance.test.ts` runs equivalent novice, pure-information, category-guidance, mixed information/purchase and off-topic families through Cars, Dryer, Refrigerator and Robot Vacuum and compares structural ownership. `nativeRuntime.test.ts` supplies a Y spy: the information response commits once with an empty event list and Y is never called. Cars asserts `purchaseIntent: NOT_EXPRESSED`, empty ledger and no pending P key for the exact golden question. Every appliance category asserts empty ledger, no `lastQuestionKey` and `DOMAIN_INFORMATION / contextMutation: NONE` through `runNativeAppliancesTurn`.

Fresh browser sessions on port 4043 used the public/default UIs and live API/store paths. The visible transcripts were:

| Surface | Exact user text | Exact visible response | Structural result |
|---|---|---|---|
| WASHING_MACHINE | “çamaşır makinesi alırken en çok neye dikat etmek gerekir?” | “Tabii. Çamaşır makinesine başlarken gerçek yıkama düzenini, yerleşeceği boşluğu, sık kullanılan bakım programlarını ve uzaktan kontrol, otomatik dozaj ile ses gibi günlük kolaylıkları ayrı düşünmek işe yarar. Hane sayısı tek başına kilogram seçmez; yalnız kullanım düzenini anlamama yardım eder. Bunu yalnızca bilgi için mi soruyorsun, yoksa kendi kullanımın için bir çamaşır makinesi seçmeyi de düşünüyor musun?” | `Bilgi`; no quick choices, remote-control question, personal field or card |
| Cars / NEW_CAR | “araba alırken en çok neye dikkat etmek gerekir?” | “Tabii. Araç seçimine başlarken günlük kullanım, yolcu ve yük düzeni, araç yapısı, güvenlik donanımları, yakıt veya şarj imkânı, konfor ve gerçekten vazgeçilmez özellikleri ayrı düşünmek işe yarar. Satın alma bedelinin yanında yakıt ya da enerji, bakım, sigorta ve olası finansman giderleri toplam sahip olma maliyetini değiştirir; ikinci el değeri ise garanti edilemez. Yeni araçta garanti kapsamını, donanım paketini, teslimat tarihini ve kampanya koşullarını yazılı teklif üzerinden doğrulamak önemlidir. Marka ya da modelden önce kullanım biçimini ve bütçeyi netleştirmek seçenekleri daha güvenli daraltır. Bunu yalnızca bilgi için mi soruyorsun, yoksa kendi kullanımın için bir araç seçmeyi de düşünüyor musun?” | no choices, candidate count, personal P field or card |
| DRYER | “Kurutma makinesi alırken en çok neye dikkat etmek gerekir?” | “Tabii. Kurutma makinesinde bir seferdeki gerçek yük, yerleşeceği boşluk, sık kurutulan kumaşlar, kurutma programları ve bakım düzeni temel ayrımlardır. Daha büyük kapasite tek seferde daha çok yükü karşılayabilir; hassas kumaşlar ise uygun program ve bakım gerektirir. Isı pompası bir teknoloji türüdür; enerji kullanımı ve ses ancak aynı ölçüm koşullarında karşılaştırılabilir, tek başına düşük fatura, sessizlik veya kumaş sonucu garanti etmez. Bunu yalnızca bilgi için mi soruyorsun, yoksa kendi kullanımın için bir kurutma makinesi seçmeyi de düşünüyor musun?” | `Bilgi`; no capacity or installation P field |
| REFRIGERATOR | “Buzdolabı seçerken önemli kriterler neler?” | “Tabii. Buzdolabında taze gıda ve dondurucu için ayrı net hacim, dondurucunun yeri, mutfaktaki boşluk ile ses ve enerji bilgileri birlikte düşünülür. Dondurucunun altta veya üstte olması günlük erişimi değiştirir. Brüt hacim net hacmin yerine geçmez; tazelik adları da saklama süresi garantisi değildir. Bunu yalnızca bilgi için mi soruyorsun, yoksa kendi kullanımın için bir buzdolabı seçmeyi de düşünüyor musun?” | `Bilgi`; no freezer/volume P field |

`/analysis` resolved to the canonical V3.8 experience. No raw taxonomy, internal governance text, invented threshold, candidate count, recommendation or card appeared in any of these information-only turns.

## Changed files

- Runtime/contract: `features/xpy/runtimeContract.ts`, `domainPacks.ts`, `nativeRuntime.ts`, `contracts.ts`, `advisory.ts`, `informationIntentCorpus.test.ts`, shared lifecycle/kernel bindings and their tests.
- Cars: canonical root/analysis routing, V3 route choice projection/tests, `carsAdvisory.ts`, `carsAdvisory.test.ts`, `planCarsTurn.server.ts`, Cars store/native adapter/types, and `CarsConversationV3.tsx` advisory rendering.
- Appliances: `advisory.ts`, `xpyAssistant.ts`, `conversation.server.ts`, `xpyRuntime.ts`, shared question pack/contracts/native entry, all four category-kernel bindings, Dryer materiality order, UI rendering and `advisory.test.ts` native-boundary coverage.
- Documentation: this report plus corrected unified-runtime and superseded parity reports.

## Validation

- General-information/runtime/public-route subset: 7 files, 100 tests passed.
- Broader Cars/Appliances question, correction, conversation and governance regression: 24 files, 260 tests passed.
- TypeScript: `npx tsc --noEmit --pretty false` passed.
- Scoped ESLint over all touched TypeScript/TSX passed.
- `git diff --check` passed.
- Fresh-browser exact prompts passed for Washing Machine, Cars, Dryer and Refrigerator through their public/default surfaces. The original Washing Machine remote-control failure was reproduced before the commit-decorator correction and passed after it.

## Product/Architecture blockers

None for this work unit. Missing exact price authority in five appliance categories and the frozen washing-machine capacity mapping remain intentional fail-closed domain limits, not blockers to XPY X/P/Y parity.

## Next bounded recommendation

Version the Cars public JSON envelope from `V3_CONVERSATION` to the canonical XPY outcome discriminants behind a compatibility header, while keeping the same `XPY_RUNTIME/v0.1` ports and V3.8 domain authority.
