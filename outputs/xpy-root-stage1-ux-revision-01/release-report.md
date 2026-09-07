# Root XPY Stage 1 UX revision candidate

Base: `3d8003149f40da244daf0f9aeb53c3d1f90b0aae` (`dpl_EanVCYfArZXLMHnuXysFyvePRKBk`)

Candidate source: `23fe2843a895f0909104c67f49b02e093ed23205`

Implemented a cancellable three-second Secretary-to-category gate, retained the Domain Pack orientation and first question after binding, emphasized the current question, projected Turkish smart replies without public raw keys, preserved free-text input and idempotent message IDs, added bounded composer auto-grow and keyboard semantics, made category-bound placeholders empty, made budget filtering explicit/removable, and exposed a clear accessible conversation reset button. Tools questions now publish governed presentation choices while retaining the existing authority digest and hard-filter logic.

Validation:

- Release TypeScript check: pass.
- Focused ESLint on all changed source/test files: pass.
- Root registry plus Cars, Appliances, Electronics, Baby, Mobility and Tools focused suites: 33/33 pass.
- Next.js 16.3 production build under Node 24.19.0: pass; 626 static pages generated.
- Local production smoke: 390×844 and 1280 widths both had `scrollWidth === clientWidth`.
- Persisted Appliances Root XPY restored with the current question, Turkish smart replies, category badge, reset control, budget switch and an empty bound-category placeholder.
- A real-browser pass exposed and fixed the Appliances bootstrap projection gap: durable adapters now recover the committed public opening through `READ` after `CREATE`, so orientation and the first question are retained.
- Countdown cancellation was exercised before category commit; the UI remained in Secretary mode.
- Candidate-delta lint is clean with zero warnings/errors. Full-repository lint passes normally with zero errors and reports 12 pre-existing warnings; `--max-warnings=0` remains red. See `lint-ledger.md`.
- Desktop/mobile capture inventory and DOM audit are recorded in `browser-evidence.md`; captures are attached inline to the task history because the browser evidence API does not provide filesystem export paths.

No push, Vercel deployment, production promotion, database migration, authority mutation or lineage mutation was performed.
