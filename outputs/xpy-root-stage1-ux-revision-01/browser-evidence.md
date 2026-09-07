# Browser evidence index

Browser: Codex in-app Chromium against the Node 24 production build. Captures are attached inline to the closure task history because the browser evidence API exposes immutable capture content but no filesystem export path.

| Capture | Viewport/state | Result |
|---|---|---|
| `desktop-secretary-start` | 1280×720, fresh origin | Welcome and Secretary-only animated placeholder visible; no chat panel |
| `desktop-routing-countdown` | 1280×720, fresh origin | Filling progress bar and accessible “Durdur ve burada kal” control visible |
| `desktop-routing-cancelled` | 1280×720 AX snapshot | Cancelled before commit; Secretary remained active and no category badge/session appeared |
| `desktop-xpy-question` | 1280×720, persisted Appliances | One latest bold question, Turkish quick replies below it, blank connected placeholder |
| `desktop-budget-off` | 1280×720 | Switch defaults off; no budget input |
| `desktop-budget-on` | 1280×720 | Switch on, `50.000 TL`, apply button, no overflow |
| `desktop-composer-grown` | 1280×720 | Three-line controlled textarea within max-height composer |
| `desktop-card-before` | 1280×720, persisted Tools | Decision disclosure prompt before card reveal |
| `desktop-card-after` | 1280×720, persisted Tools | Aşama 1 tied-set decision card; no authority digest/hash exposed |
| `mobile-question-budget-composer` | 390×844 | Bold question, quick replies, `50.000 TL`, three-line composer; `scrollWidth=clientWidth=390` |

Automated DOM audits additionally recorded:

- Connected placeholder is empty.
- Exactly one response paragraph is visible in the latest-only response region.
- No `sha256`, `authorityDigest`, or raw enum pattern is visible.
- Desktop and mobile horizontal overflow checks pass.
- Quick replies are real buttons in an `aria-label="Hızlı yanıtlar"` group.
- Reduced-motion behavior is explicit: typewriter resolves immediately under `prefers-reduced-motion`, and countdown width transition uses `motion-reduce:transition-none`; timer cleanup remains active.

The “Görüşmeyi sil” control is visually and semantically verified as a real button. Its destructive browser click was not executed in this closure run because local persisted-state deletion requires an action-time confirmation; the underlying handler remains covered by source inspection and reset-state invariants.
