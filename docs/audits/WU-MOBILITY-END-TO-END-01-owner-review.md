# WU-MOBILITY-END-TO-END-01 — owner review candidate

- Baseline: `78e120a32733a00fc80b82253c3a38c2b04adf74`
- Scope: `MOBILITY` → `ELECTRIC_SCOOTER`, `ELECTRIC_BICYCLE`, `BICYCLE`
- Candidate release: `MOBILITY-TR-v0.1-owner-review-candidate`
- Authority digest: `sha256:886a2bac6180b1766f921d4cb8700e764263a130ba2fdab3d59c292ea66e75ee`
- Discovery: Amazon Türkiye first; Amazon observations remain commerce-only because exact identity and primary technical evidence could not be closed lawfully in this pass. Non-Amazon Türkiye discovery uses manufacturer and Decathlon Türkiye sources.
- Terminal reconciliation: 24 observations; 10 admitted, 3 duplicate, 5 ambiguous, 4 insufficient Türkiye applicability, 2 retired/unsupported, 0 silent drops.
- Admission boundary: technical facts require manufacturer/manual evidence; retailer facts are not technical authority unless the retailer is also the product owner/manufacturer channel. Missing facts are `UNKNOWN`.
- Persona: every admitted product has Brand → Product class → Family → Model → Variant scope. Current evidence class is only `INTENDED_POSITIONING`; it has no hard-filter or membership effect. Universal Persona evidence work is not merged because its branch is not an accepted authority artifact.
- Decision: hard compatibility → evidence-aware Pareto → bounded soft ranking; UNKNOWN neutral; shared Persona cap 0.75; price only with a fresh exact offer; no catalog-order or popularity tie-break.
- Safety: helmet, visibility, variable braking/wet weather, battery charging/fire and local-use boundaries are explicit. No range, hill or terrain guarantee.
- Unsupported: motorcycles/mopeds with a different regime, hoverboards, children’s ride-on toys, parts, helmets, locks, batteries, chargers and accessories.

## Approval gate

This candidate is not self-approved. Product-owner approval must name the release above and its generated SHA-256 authority digest before production activation or deployment.
