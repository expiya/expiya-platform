# WU-ROOT-STAGE2-CATALOG-UNIFIED-PRODUCTION-RECOVERY-01

## Candidate construction

- Release branch: `codex/root-stage2-catalog-unified-production-recovery-01`
- Stage 2 parent: `b45094c3715518b213216b68622db089a08e20b5`
- Catalog Wave 05 parent: `4cec0fae7884f944dfc15c695c23004c4b278ed7`
- Root composer parent: `fd04db1af105c518be23fdfa1a778975f0db9860`
- Common Stage 2 / Root base: `8db93b6ff0333a2cb54d703221fed9608d97a7ec`
- Construction: one three-parent, non-squash merge commit. The merge completed automatically with no textual conflict.

The explicit Wave 05 parent is required because Wave 05 is not an ancestor of either requested Stage 2 or Root head. Omitting it would silently restore the Wave 04 / 108-member catalog.

## Exact file classification

### Root stable composer delta

- `components/platform/RootStageOneExperience.tsx`
- `components/platform/RootStageOneExperience.test.tsx`
- `features/platform/rootConversationComposer.ts`
- `features/platform/rootConversationComposer.test.ts`
- `features/platform/rootStageOneRegistry.test.ts`
- `docs/wu-xpy-root-stage1-stable-conversation-composer-02-conflict-ledger.md`

### Wave 05 authority, membership and runtime delta

- `data/production/catalog-factory/active.json`
- `data/production/catalog-factory/governance/activation-events/WU-CATALOG-FACTORY-WAVE05-EXACT3-ATOMIC-ACTIVATION-01/{activation.json,authorization-sentence.txt,receipt.json}`
- `data/production/catalog-factory/releases/CATALOG-FACTORY-WAVE05-EXACT3-111-CANDIDATE-01/{catalog-overlay.json,manifest.json,release-candidate.json}`
- `features/catalog-factory/runtime/{effectiveCatalog.server.ts,effectiveCatalog.test.ts,wave05RuntimeClosure.test.ts}`
- `features/catalog-factory/wave02Exact15Activation/activate.test.ts`
- `features/catalog-factory/wave05OwnerReview/{generate.ts,generate.test.ts}`
- `features/electronics/smartphonePMaterialityActivationPreflightClosure.ts`
- `features/electronics/smartphonePMaterialityCurrentProductionIntegration.ts`
- `features/electronics/smartphonePMaterialityCurrentProductionIntegration.test.ts`
- `features/platform/catalogDirectory.test.tsx`
- `features/platform/exact14RuntimeConsumers.test.ts`
- `outputs/catalog-factory-active-coverage-wave-05-owner-review-01/**`
- `outputs/catalog-factory-wave05-111-unified-runtime-loader-closure-01/**`
- `outputs/catalog-factory-wave05-exact3-108-activation-readiness-01/**`
- `scripts/activate-catalog-factory-wave05-exact3.mjs`
- `scripts/generate-catalog-factory-active-coverage-wave-05.ts`
- `scripts/generate-catalog-factory-wave05-activation-readiness.mjs`
- `scripts/generate-catalog-factory-wave05-runtime-closure.mjs`

### Stage 2 surfaces preserved byte-for-byte from the Stage 2 parent

- `app/api/electronics/stage-two-handoff/route.ts`
- `features/electronics/stageTwo/**`
- `features/xpy/stageTwo/**`
- `features/appliances/stageTwo/xpyStageTwoAdapter.server.ts`
- `features/sales-advisor/xpyStageTwoAdapter.server.ts`
- `components/xpy/XpyStageTwoRenderer.tsx`
- `database/migrations/0018_electronics_stage2_authority_foundation.sql`
- legacy decision-fingerprint bridge, consent-to-handoff seam and isolated E2E evidence under `data/research/electronics/**` and `artifacts/electronics-stage2/**`

### Recovery-package-only evidence

- `docs/audits/WU-ROOT-STAGE2-CATALOG-UNIFIED-PRODUCTION-RECOVERY-01.md`
- `docs/audits/WU-ROOT-STAGE2-CATALOG-UNIFIED-PRODUCTION-RECOVERY-01.manifest.json`
- `docs/audits/WU-ROOT-STAGE2-CATALOG-UNIFIED-PRODUCTION-RECOVERY-01.authorization.txt`

### Deliberate Electronics continuity reconciliation

- `app/electronics/analysis/ElectronicsConversation.tsx` retains persisted `READ` recovery but moves the route-local pointer from cross-session `localStorage` to same-tab `sessionStorage`.
- `features/electronics/presentation.test.tsx` proves the legacy route keeps same-tab recovery and contains no `window.localStorage` access.
- Root recovery remains independently keyed, reload/back-forward constrained and session-scoped. A fresh Root or fresh Electronics tab cannot acquire a prior tab's conversation pointer.
- `features/electronics/stageTwo/handoffAuthorityCandidate.test.ts` now mutates a signature character to a guaranteed different value, removing a one-character collision that could make the tamper assertion nondeterministic; production signing/verification code is unchanged.

## Acceptance additions from the production regression audit

- All 28 Stage 2/shared files and their route build outputs must remain present.
- The build manifest must contain `api/electronics/stage-two-handoff` and `electronics/stage/2`.
- Database readiness is read-only: verify migration tables, consent count, issuance count and lifecycle count without displaying secrets or mutating rows.
- Persisted Stage 2 rows may be counted/validated but never created, updated or deleted by this work unit.
- Recovery tests must cover same-tab reload/back-forward, legacy explicit `READ`, fresh-tab isolation and fresh-Root non-leakage.

## Boundaries

No migration was executed. No database row, environment variable, secret, consent record, deployment, alias or remote branch was changed. Migration `0018` is source lineage only. Existing authority records are reconciled by ancestry; this work unit creates no new production authority.

If any candidate gate fails, current production must remain untouched. Neither the current `fd04db1` deployment nor the earlier Stage 2 / Catalog deployments are automatically designated as rollback targets; rollback selection requires a separate lineage-qualified decision.

## Local verification receipt

- Focused Root / Stage 2 / Wave 05 / recovery: 59/59.
- Full suite: 5939/5939 across 791 files.
- TypeScript: pass.
- Lint: zero errors; 13 pre-existing warnings.
- Node 24, Next 16.3 webpack production build: pass; 627 static pages.
- Build routes: `api/electronics/stage-two-handoff` dynamic route and `electronics/stage/2` static route present.
- Root 390×844 fresh + reload: no horizontal overflow, empty two-line composer, no category or conversation leakage.
- Database: `BEGIN READ ONLY`; three Stage 2 tables present; consent=1, issuance=1, lifecycle=1; transaction rolled back; zero mutations.
