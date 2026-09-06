# SCALE_BATCH_03 — MVP Vehicle Universe Coverage Gate

Decision: **PASS WITH NON-BLOCKING WARNINGS**

The 55-model universe is the minimum sufficient diverse baseline for the majority of MVP purchase-decision journeys in Türkiye. The batch adds 17 model families and stops at 55 because the next evidence-credible candidates predominantly duplicate already represented roles.

## Gate rationale

- Core body/use paths now have multiple credible alternatives: city hatch, C-hatch, sedan/fastback, wagon, B-SUV, family SUV, large/7-seat SUV, passenger carrying, commercial van, pickup and real 4x4.
- Propulsion coverage now includes PETROL, DIESEL, LPG, MHEV, HEV, PHEV and BEV. XC60 T8 closes exact current PHEV+AWD family/towing applicability.
- Discovery is no longer concentrated only in EV/AWD: BMW 320i provides premium non-EV; Chery Tiggo 7 Pro and KGM Torres provide alternative family/utility paths; Leapmotor T03 provides compact entry EV.
- Hyundai remains the largest brand but falls from 21.1% of models at baseline to 14.5%; Batch 03 adds no Hyundai.
- Exact-identity discipline is preserved: unresolved configurations remain PROVISIONAL and are retained in the P0 queue.

## Non-blocking warnings

- Ten sources are explicitly `SNAPSHOT_UNAVAILABLE`; seven are inherited baseline sources and three are new Batch 03 sources. URLs, observed dates and honest snapshot status remain preserved.
- Twenty configurations are PROVISIONAL. They are not promoted without verified generation, powertrain and exact Türkiye applicability.
- Diesel passenger-car choice remains narrower than petrol/electrified choice, but current coverage is sufficient for the MVP baseline because Egea, Berlingo, Ranger and Land Cruiser span affordability, high-mileage practicality and utility roles.
- Coupe/convertible remains absent and is LOW priority for the majority-MVP gate.
- `07_SAFETY` remains empty by contract and is deferred to a bounded P1 safety work unit.

## Scope control

No price history, TCO, reliability scoring, service-network scoring, owner experience, recall history or deep charging curves were added.
