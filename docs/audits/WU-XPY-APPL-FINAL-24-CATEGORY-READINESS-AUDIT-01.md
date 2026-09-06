# Appliances final 24-category readiness audit

Date: 2026-09-04  
Work unit: `WU-XPY-APPL-FINAL-24-CATEGORY-READINESS-AUDIT-01`  
Verdict: **IMPLEMENTED_WITH_ONE_REPAIR_REQUIRED**

The 24-category Appliances implementation is materially previewable, with 97 exact Türkiye products and clean authority, runtime, UI, safety, and isolation gates. It is not yet accurate to mark the phase `IMPLEMENTED_WITH_EXTERNAL_GAPS`: the AŞAMA 1 → AŞAMA 2 link passes a bare conversation UUID, and AŞAMA 2 reads that UUID directly. The bounded projection after loading is correct, but the handoff is not signed or scoped.

The machine-readable matrix is `docs/audits/WU-XPY-APPL-FINAL-24-CATEGORY-READINESS-AUDIT-01.matrix.json`.

## Final matrix

| Area | Result | Implementation evidence |
|---|---|---|
| Catalog and runtime | PASS | 24 ACTIVE category registrations; 97 exact members; every category has an active, digest-checked runtime authority. Batch A catalogs have three members and at least two brands. Split AC has three exact indoor/outdoor pairs across two manufacturers. |
| AŞAMA 1 | PASS | Public Turkish labels, information-only X responses, P one-question/typed-choice flow, deterministic Y, budget-filter toggle, public cards, retry, optimistic revision conflict handling, reset, and fragment-based READ recovery are implemented. Internal product/enum IDs are stripped from normal unresolved-set UI. |
| AŞAMA 2 projection | PASS | All 24 categories have category-owned content. Unpaid comparison is locked; entitled comparison is restricted to the supplied authorized exact set; unknown cells remain neutral; Advisor is read-only and cannot change context, rerun Y, or add products. Sales actions remain unavailable. |
| AŞAMA 1 → 2 handoff | **FAIL — IMPLEMENTATION** | The UI links with `?conversation=<uuid>` and AŞAMA 2 calls the ordinary READ action using that UUID. No signed, expiring, AŞAMA-2-scoped handoff is issued or verified. The existing HMAC service is a recovery-token primitive and is not wired to this transition. |
| Public presentation | PASS with copy note inside repair | The landing and selector expose 24 human-readable active categories and no ordinary product IDs. Because AŞAMA 2 exists behind a decision handoff, landing copy that calls it “henüz yayınlanmadı” should be reconciled as part of the handoff repair, not as a second work unit. |
| Safety and authority | PASS | Unknowns fail closed or stay neutral; no score/weight/implicit tie-break; Split AC requires professional exact-pair site verification; manual knowledge is explain-only; commerce/media cannot filter, rank, authorize, or repair technical identity. |
| Manual/media/commerce isolation | PASS | Governed manuals: 10 immutable manuals and 5 L9 entries over 97 members. Governed media: 97-member/24-category release, 0 admitted because rights/identity gates did not pass. Commerce: 97 products, 485 recorded attempts, 0 verified current offers. Missing assets/offers remain explicit fallback/unknown. |
| Cars non-regression | PASS | Cross-runtime structural acceptance and shared XPY presentation/re-entry/propagation tests pass; no Cars authority or catalog mutation was made by this audit. |
| Verification | PASS, with inherited build evidence | Fresh: 64 files / 743 tests passed; `tsc --noEmit` passed; scoped ESLint passed. Existing supported-toolchain evidence records a successful Node 24 webpack production build with 607 pages. The audit host is Node 26.6.0, so that large build was not redundantly rerun on an unsupported runtime. |

## What can honestly be inspected now

- `/appliances`: all 24 active Turkish category cards and AŞAMA 1 entry.
- `/appliances/analysis`: category selection, information questions, guided answer buttons, optional hard budget ceiling, deterministic clarification/decision cards, retry, reset, and persisted recovery.
- `/appliances/stage/2?conversation=<id>`: the bounded product detail, evidence, daily-life explanation, locked comparison offer, and read-only Advisor can be inspected with an existing DECISION_READY conversation, but the URL must be treated as development-only until the signed-handoff repair lands.
- `/appliances/stage/3`: honest unsupported state; no seller, offer, stock, order, lead, or contact action.

Local preview prerequisites: supported Node 24.x; installed dependencies; a reachable PostgreSQL `DATABASE_URL`; appliance migrations 0009–0013 applied to the preview database; active local catalog/manual/media/commerce artifacts present; then `npm run dev` and open `http://localhost:3000/appliances`. No deployment or database mutation was performed by this audit.

## Remaining gaps by authority class

- **Implementation:** signed, expiring, purpose-bound AŞAMA 1 → AŞAMA 2 handoff and verification is missing; public landing copy should be aligned when that boundary is exposed.
- **External / credential / licensing:** 0 licensed product photos; 0 verified current commerce offers; no external payment-entitlement issuer.
- **Data acquisition:** 10/97 governed manuals and 5 L9 entries; the remaining 87 product identities have no admitted manual, and five acquired washing-machine manuals have no promoted L9 entry.
- **Deferred Product scope:** AŞAMA 2 sales actions and all AŞAMA 3 commerce/lead behavior remain intentionally unsupported.

## Execution ledger update

| Gate | Command/evidence | Result |
|---|---|---|
| Focused runtime and contract suite | `npx vitest run features/appliances app/api/appliances ... features/xpy/crossRuntimeAcceptance.test.ts` | PASS — 64 files, 743 tests |
| TypeScript | `npx tsc --noEmit` | PASS |
| Scoped lint | `npx eslint app/appliances app/api/appliances features/appliances ...` | PASS |
| Production build | Existing supported Node 24 webpack evidence | PASS — 607 pages; not rerun under local Node 26.6.0 |
| Production/deploy/database mutation | Prohibited by audit scope | NOT PERFORMED |

## Exactly one next work unit

**WU-XPY-APPL-SIGNED-STAGE2-HANDOFF-01** — issue an HMAC-signed, short-lived, purpose-bound handoff only from a current DECISION_READY AŞAMA 1 state; bind conversation ID, revision, selected exact product ID, category, and authorization fingerprint; verify it server-side before any AŞAMA 2 READ/projection; reject tamper, expiry, replay/stale revision, category/product mismatch, and raw UUID access; keep unpaid/entitled comparison and Advisor boundaries unchanged; update landing copy to describe AŞAMA 2 as decision-handoff-only; add focused route/UI tests and rerun TypeScript, scoped lint, appliance/Cars parity tests, and the supported Node 24 build. Do not add payment, sales, media, commerce acquisition, deployment, or schema changes.

Automation should continue for this one repair. After it passes, the program can be marked `IMPLEMENTED_WITH_EXTERNAL_GAPS` and automation can stop.
