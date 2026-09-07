# XPY Root Stage 1 preview report

Candidate branch: `codex/xpy-root-stage1-experience-02`

Implementation base: `f1ce8e61f76345aa10a1422bb511d2d9998dd954`

Required production release base: `2ce640b7c6049cd2e8f69a7a7f933e48c4221d7a`

Deployment: not performed.

The root page now keeps Secretary classification and clarification in place, then opens supported category Domain Pack conversations without changing `/`. The presentation is part of the existing light root canvas: no transcript panel, no user bubbles, and only the latest XPY answer remains mounted. Answers type in as sentence-separated paragraphs; assistive technology receives one atomic final live-region value and reduced-motion users receive the complete answer immediately.

The conversation category is a read-only label. Context lives in the existing durable domain stores and a root recovery pointer; refresh performs a server READ. Message IDs remain stable on retry. “Görüşmeyi sil” removes the root pointer and visible XPY state, returning to Secretary without deleting governed server records. Enter submits and Shift+Enter inserts a newline. The optional budget value is formatted with Turkish thousands separators.

Decision payloads are held behind explicit “Karar kartını göster” consent. The compact light card extracts only public identity/rationale fields, uses `object-contain`, and shows a governed neutral placeholder when media is absent. Appliances Stage 2 is linked only after the existing signed handoff endpoint issues a token. No unsigned Stage 2 fallback was added.

Registry coverage is family-driven across Cars, Appliances, Electronics, Baby & Child, Mobility and Tools. Cars uses the existing signed V3 state-token conversation and consent contract. CORDLESS_DRILL uses a thin signed-state adapter over the active Domain Pack and exact catalog; it applies only explicit platform/kit/impact constraints and preserves a non-dominated set rather than inventing a soft winner. A module gate now fails build/test initialization if any ACTIVE registry category lacks a root adapter. Existing deep links remain intact for backward compatibility and rollback.

The Smartphone reconciled v1.3 production lineage (`1cba69d…`, receipt `2ce640b…`, deployment `dpl_EcPT…`) is now a mandatory release base. It was deliberately not cherry-picked, pushed or deployed in this task. A three-way merge audit found no overlapping paths. Release preparation must merge the receipt lineage, then re-run exact preservation checks for 121 Electronics, 34 Smartphone, 18 Headphones, 24/24 categories, the Mitgo metadata tag, the v1.3 active pointer and receipt digests before regenerating this manifest.

Verification completed: 29 focused tests (plus an earlier 41-test platform sweep), TypeScript, scoped ESLint, diff check, production build (625 pages), desktop browser flow, and 390×844 responsive QA. The full repository test command was started but produced no completion after several minutes and was stopped; no failure output was emitted. No production deployment or remote push was performed.
