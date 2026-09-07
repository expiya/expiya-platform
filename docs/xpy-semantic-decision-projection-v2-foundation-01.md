# XPY Semantic Decision Projection v2 Foundation — audit ve handoff

Work unit: `WU-XPY-SEMANTIC-DECISION-PROJECTION-V2-FOUNDATION-01`

Durum: typed ve executable foundation tamamlandı; yalnız shadow/contract-fixture kapsamındadır. Production runtime, active pointer, aday üyeliği veya sırası, kart, authorization, DB, UI, deployment ve push değişikliği yoktur.

## Sonuç

Ortak zincir artık `SemanticDecisionProjection/v2` içinde tek bir typed contract olarak temsil edilir:

`Technical Fact → Daily-Life Consequence → User Need → Material Question → Candidate Effect → Honest Outcome`

Contract exact offering identity, category/scope, fact-capability-source bağları, semantic authority version/digest, market/configuration/effective-date applicability, predicate/operator/value/unit/context/regime, conditions/limitations/non-guarantees, decision-use, Türkçe public question, answer domain/prerequisites, answer başına candidate effect, uncertainty, inheritance/conflict block ve honest outcome alanlarını zorunlu kılar.

Executable invariant sınırı:

- `HARD_FILTER` ancak explicit user requirement ile ve `KNOWN + exactKnownMismatch` hücresinde eleme yapar.
- `SOFT_PREFERENCE` yalnız governed comparison içindir ve üyelik değiştirmez.
- `QUESTION_INPUT`, `PLANNING_ONLY`, `EXPLANATION_ONLY` ve `NONE` üyelik değiştiremez.
- `UNKNOWN`, `CONFLICTED`, `STALE` ve `NOT_APPLICABLE` false, avantaj, eleme veya winner olamaz.
- Fiyat, explicit bütçe + fresh exact price + commerce isolation olmadan hard etki kazanamaz.
- Persona toplamı `0.75` ile sınırlıdır; membership, sufficiency ve single-winner etkisi yoktur.
- Rationale yalnız gerçekten partition/effect hesabına katılan evidence ref’lerini içerir.

## P Materiality Shadow Executor

Executor candidate pool, current market/configuration/effective-time context, prerequisite/need sinyalleri ve append-only answer ledger alır. `ANSWER`, `CORRECT`, `CLEAR` ve `SUPERSEDE` semantiğini deterministik olarak projekte eder. Aktif yanıt repeat suppression uygular; `CLEAR` soruyu yeniden açar.

Her projection için şu sinyaller canonical trace’e yazılır:

- bilinen partition’lar ve known/unknown sayıları;
- `expectedKnownReduction` ve `decisionChangeProbability`;
- `evidenceReliability`, `answerability`, `contextualRelevance`, `novelty`;
- unknown ve fatigue penalty;
- suppression reason ve deterministik utility score.

Bir turda en fazla bir soru seçilir. Hiçbiri uygun değilse sonuç `NO_MATERIAL_QUESTION / NO_ELIGIBLE_MATERIAL_QUESTION_NOT_SUFFICIENT` olur ve `sufficiency` daima `NOT_EVALUATED` kalır. Zero-effect, iki bilinen partition üretmeyen, unsupported, predominantly-UNKNOWN, conflict-blocked, cevaplanmış veya prerequisite’i eksik soru bastırılır. Candidate ve projection girdileri canonical sıralandığı için katalog sırası fingerprint’i değiştirmez.

No-effect adapter production boundary nesnesini aynı referansla geri verir ve membership, order, card, authorization ve pointer fingerprint’lerini önce/sonra karşılaştırır. Adapter hiçbir production import graph’ına bağlanmamıştır.

## Catalog Factory Readiness v2

Readiness üç ayrı verdict üretir; alt seviye bir üst seviyeyi örtük olarak vermez:

| Seviye | Exact-14 read-only karakterizasyonu | Bloklar |
| --- | --- | --- |
| `INFORMATION_READY` | `true` | Yok |
| `P_READY` | `false` | semantic-causal-lineage, exact-projection-materialization, candidate-effect-completeness |
| `Y_READY` | `false` | P blokları + owner-approval |

Gate seti: identity-exact, primary-evidence-applicability, decision-field-coverage, semantic-causal-lineage, exact-projection-materialization, candidate-effect-completeness, P-zero-effect-suppression, unknown-conflict-neutrality, no-false-single-winner, price-commerce-isolation, persona-or-neutral, public-language, runtime-fixtures, pointer-manifest-approval-consistency ve owner-approval.

`DECLARATIVE_RECORD` türü evidence hiçbir gate’i PASS yapamaz. Bu nedenle mevcut 16 capability kaydı gözlemlenir fakat executable acceptance olarak sayılmaz.

## Inheritance

- `CLASS`: yalnız vocabulary, template ve explanation; teknik/hard/Y authority yok.
- `FAMILY` ve `MODEL`: explicit exact applicability ve verified identity bridge olmadan çözülmez.
- `VARIANT` ve `EXACT_OFFERING`: yalnız aynı market ve exact applicability ile hard/Y final scope olabilir.
- Daha spesifik `CONFLICTED`, daha üst scope’taki bilinen assertion’ı bloke eder.
- Foreign-market exact assertion, Türkiye exact teknik gerçeğine çevrilmez.

## Mevcut davranışların read-only karakterizasyonu

Cars: `features/decision/v2/action/questionGeneration.ts` bilinen değer gruplarından en az iki partition olduğunda soru üretir; bilinmeyen değerleri false yapmaz. Utility ve semantic-key tie-break deterministiktir. Önerilen shadow seam candidate evaluation sonrası, mevcut `selectMaterialQuestion` öncesidir.

Washing Machine: `codex/appliances-stage2-unified-release-20260906` üzerindeki sufficiency evaluator hard `UNKNOWN/NOT_EVALUATED` için `UNRESOLVED_HARD_UNCERTAINTY` döndürür. `NO_AUTHORIZED_MATERIAL_QUESTION` nötr planlama yokluğudur, sufficiency değildir. Bu precedence değiştirilmemiştir.

Electronics: `codex/smartphone-v02-production-lineage` üzerindeki generic runtime policy `questionPlan` sırası ve repeat state ile ilerler; `IMPORTANT` yanıtını `QUESTION_INPUT` olarak yazar. Generic kayıtlar executable `candidateEffectByAnswer` içermez. Foundation yalnız shadow mirror seam’i önerir; feature flag veya conversation state değişmez.

## Smartphone ve temsilî fixture’lar

Smartphone fixture’ları production fact değildir. Checkout’ta bulunmayan iki immutable lineage’a contract fixture olarak bağlıdır:

- Shadow pilot: commit `8b5ee38c5837815ef4ef3e04ba8c435a77579048`, digest `sha256:489339776731d2498b2ba115822ab9da95fb13d8b696dfc8d92b1512ffe81f16`.
- Support closure: commit `62ea022d528e7c062fecf10c0065e6039ed4efbf`, digest `sha256:1f112aba506258f45d01b7fd88ac811a98012834f1a95955dd2308314ce15868`.

Türkiye/5G, telephoto ve `>=80 W` şarj projection’ları iki bilinen partition ile executable trace üretir. Support longevity 34 synthetic identity üzerinde 16 known / 18 unknown’dur ve `SUPPRESSED_PREDOMINANTLY_DURATION_UNKNOWN` ile bastırılır.

Laptop, Headphones, Refrigerator, Espresso Machine, Stroller, Electric Scooter, Cordless Drill ve Cars için bir material good question ve bir zero-effect bad/generic question bulunur. Tümü `SYNTHETIC_CONTRACT_FIXTURE` olarak etiketlenmiştir; production fact iddiası yoktur.

## Production lineage koruması

Read-only doğrulanan çizgi:

- Source checkout `f460c9f0e9833d278788289a3b00c62d4ddbb3c4`; Cars active catalog `0.55.4`, 549 exact record.
- Root XPY release integration `3d8003149f40da244daf0f9aeb53c3d1f90b0aae`.
- Smartphone v02 production `2ce640b7c6049cd2e8f69a7a7f933e48c4221d7a`: 34 Smartphone / 121 Electronics.
- Appliances `0b55b023abc9ab03c1cae1e95e09fcc9ecbaccaf`.
- Baby/Stroller source receipt `c2ac9150c43ef503f4a7b736f240454115447e4e`.
- Mobility `381c4e7e6db109feceb515214bc6bdba26b657df`.
- Tools `60af35d9521df161ea39cc14d7301893f7886a40`.
- Universal Persona `d03b79d04c5f71108721d63ab5574b5461da47b0`, cap `0.75`.
- Mitgo metadata `f1ce8e61f76345aa10a1422bb511d2d9998dd954`.

Daily-life-semantics analizinin repository artifact/digest’i checkout’ta yoktur. Foundation yalnız görevde onaylanan causal chain’i contract zorunluluğu olarak temsil eder; imported evidence iddiasında bulunmaz.

## Parallel branch sınırı ve entegrasyon planı

Okunan fakat cherry-pick/overwrite edilmeyen branch’ler:

- Exact-14 unified consumer: `origin/codex/exact14-unified-runtime-preview@bc812eea26780b8c559d3209a5dc8055a932ea55`.
- Root XPY UX revision: `codex/xpy-root-stage1-ux-revision-01@bc86ee5d37540e94236303bb8a0704f46509fd52`.

Foundation yalnız yeni `features/semantic-decision-projection/v2`, yeni research artifact directory, bu audit ve tek generator scriptini ekler. İki parallel branch ile doğrudan dosya overlap’i yoktur. Semantic yakınlık nedeniyle integration sırası yine sınırlandırılmalıdır: önce Exact-14 `EffectiveCatalogProduct` → projection mapper’ı ayrı PR’da eklenir; sonra P replay edilir; Root UX yalnız ortak runtime kabulünden sonra read-only outcome tüketebilir. UI/card değişikliği bu foundation’a dahil değildir.

## Machine-readable çıktılar

`data/research/xpy-semantic-decision-projection-v2-foundation-01/` altında lineage, contract fixtures, P trace, current-vs-shadow, readiness, no-effect proof, integration plan ve manifest bulunur. Generator bütün artifact digest’lerini canonical JSON üzerinden yeniden üretir.

## Sonraki bounded pilot

Exact-14 içinden tek bir kategori seç; en az iki exact known partition sağlayan bir material question materialize et; UNKNOWN’ı nötr tut; bounded replay corpus’ta shadow adapter çalıştır; `INFORMATION_READY` ve `P_READY` bağımsız PASS olmadan Y/owner approval isteme. İlk pilotta active pointer, runtime flag, membership, order, card veya authorization değişikliği yapma.

## Doğrulama kaydı

- Scoped TypeScript (`tsc`, foundation + generator): PASS.
- Scoped lint: PASS.
- Foundation + Cars question planning + Cars catalog-entity planning + persona regressions: 6 dosya / 54 test PASS.
- Artifact regeneration: PASS ve byte-deterministic; release digest değişmedi.
- `git diff --check`: PASS.
- Full-project TypeScript: foundation dışı eksik `@pdf-lib/fontkit` ve `pdf-lib` dependency resolution nedeniyle tamamlanamadı.
- Node 24 binary bu hostta yok. Node 26.6.0 ile tek webpack build denemesi, foundation dışı eksik `@fontsource/noto-sans`, `@pdf-lib/fontkit` ve `pdf-lib` paketlerinde compile öncesi durdu. WasmHash retry yapılmadı.
