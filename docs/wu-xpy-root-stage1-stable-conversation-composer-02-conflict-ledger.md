# WU-XPY-ROOT-STAGE1-STABLE-CONVERSATION-COMPOSER-02 conflict ledger

- Production source: `8db93b6ff0333a2cb54d703221fed9608d97a7ec`
- Scope: Root Stage 1 composer and its readiness tests only.
- Pointer, database, migration and Stage 2 mutations: none.

| Ongoing branch | Overlap with this unit | Integration rule |
| --- | --- | --- |
| `codex/xpy-stage2-current-catalog-expansion-01` | No touched-file overlap | Keep its Stage 2 routes/renderers and semantic authority changes out of this candidate. Rebase or merge this composer commit after its authority activation is independently approved. |
| `codex/xpy-stage2-electronics-signed-handoff-authority-01` | No touched-file overlap | Preserve signed handoff implementation; do not move its authority or pointer changes into Root Stage 1. |
| `codex/xpy-stage2-unified-current-production-integration-activation-01` | No touched-file overlap | Treat the active authority lineage as an external integration prerequisite; this unit remains UI/state-machine only. |

Potential semantic seam: Root keeps the existing `stageTwoHref` and consent/card activation contracts unchanged. Any future Stage 2 integration must consume those contracts without changing Root session privacy, quick-reply staging, or composer persistence semantics.
