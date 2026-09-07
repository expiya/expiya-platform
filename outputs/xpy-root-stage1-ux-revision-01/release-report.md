# Root XPY Stage 1 UX revision candidate

Base: `3d8003149f40da244daf0f9aeb53c3d1f90b0aae` (`dpl_EanVCYfArZXLMHnuXysFyvePRKBk`)

Candidate source: `6288d1a01157e6378f021b495d49a07ecd562255`

Implemented a cancellable three-second Secretary-to-category gate, retained the Domain Pack orientation and first question after binding, emphasized the current question, projected Turkish smart replies without public raw keys, preserved free-text input and idempotent message IDs, added bounded composer auto-grow and keyboard semantics, made category-bound placeholders empty, made budget filtering explicit/removable, and exposed a clear accessible conversation reset button. Tools questions now publish governed presentation choices while retaining the existing authority digest and hard-filter logic.

Validation:

- Release TypeScript check: pass.
- Focused ESLint on all changed source/test files: pass.
- Root registry plus Cars, Appliances, Electronics, Baby, Mobility and Tools focused suites: 33/33 pass.
- Next.js 16.3 production build under Node 24.19.0: pass; 626 static pages generated.
- Local production smoke: 390×844 and 1280 widths both had `scrollWidth === clientWidth`.
- Persisted Appliances Root XPY restored with the current question, Turkish smart replies, category badge, reset control, budget switch and an empty bound-category placeholder.
- Full-repository lint has zero errors but remains red under `--max-warnings=0` because of 12 pre-existing warnings outside this work unit.

No push, Vercel deployment, production promotion, database migration, authority mutation or lineage mutation was performed.
