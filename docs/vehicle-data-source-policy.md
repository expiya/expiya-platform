# Expiya Cars production data policy

Reviewed: 2026-08-13. This document is an engineering policy, not legal advice.

## Publication gates

Production facts must identify a Turkish-market variant and carry source URL, access time,
document date/version where available, extraction method, confidence, and limitations. A source
review expires after 180 days. `CONTRACT_REQUIRED`, `PERMISSION_REQUIRED`, and `PROHIBITED`
sources cannot publish data until their status is changed after documented approval. Conflicting
values remain separate observations linked by a conflict group; absence is never imputed.

New and used prices are separate observations. List, campaign, asking, transaction, and valuation
prices are never interchangeable. Campaign validity and stock limitations are preserved. User
opinions are signals, not facts: sentiment is positive/negative/uncertain, ownership verification
and sample size are explicit, and raw complaint counts cannot affect quality scores without an
exposure denominator.

## Source register and integration decision

| Source | Best use | Authority / freshness | Permission finding | Integration decision |
|---|---|---|---|---|
| Turkish distributor/OEM pages and dated PDFs | TR variants, equipment, WLTP, list/campaign price, service schedule, dealers | Primary; page/PDF dependent, often monthly | Public facts may be manually/document-imported with citation; images/text remain copyrighted; recheck terms and robots per brand | Pilot source; no broad crawler; hash and archive permitted documents only |
| Euro NCAP | European safety test results and rating validity | Independent official; protocol/test-year bound | Commercial reproduction is not authorised without prior permission | Link/reference internally; production display or copied scores requires written permission |
| NHTSA APIs | US recalls, complaints and safety investigations | US government, regularly updated | Public API; US-market identity mismatch remains material | Recall/experience corroboration only; never a TR quality score |
| EU Safety Gate | EU vehicle safety alerts/recalls | European Commission, frequent | EU-owned content is CC BY 4.0 unless otherwise marked; third-party rights excluded | Pilot alert metadata with attribution and model/type-approval matching |
| TÜİK Motorlu Kara Taşıtları | Registrations/transfers and denominators | Official monthly administrative statistics | TÜİK permits reuse without permission when attributed | Market denominator and trend layer, not variant specs |
| EPDK | Province-level fuel prices and market reports | Official, frequently updated | Public query/report; automated reuse terms/API not established | Manual scheduled import initially; seek feed permission before automation |
| GİB / Resmî Gazete | MTV and tax rules | Authoritative annual/rule-change based | Public legislation | Versioned tax-rule engine input |
| ODMD | New-market totals; Indicata-backed used-market reports | Industry association, monthly | Reports are copyrighted; raw/model-level feed rights not stated | Aggregate research only unless licensed |
| TSB kasko list | Reference values and vehicle taxonomy | Industry body; values may update multiple times monthly | Public lookup, but service credentials are described for member insurers | Manual validation only; request licence/API rights for production use |
| Indicata / Autovista | Used values, specifications, TCO/SMR | Commercial feeds; daily/current claims | Contract and territory/use-case licence required | Preferred RFP candidates; no integration before approval |
| Sahibinden / Arabam and other listing sites | Asking-price inventory | Marketplace, continuous | No production scraping: Sahibinden blocked automated access in review; Arabam disallows search/filter paths and GPTBot; contractual feed required | Excluded until written feed agreement |
| Forums, video, social content | Ownership themes and UX hypotheses | Community, irregular and biased | Copyright, platform terms, creator permission and KVKK concerns | Opt-in/licensed excerpts or derived aggregate signals only; moderation required |
| Expiya first-party feedback | Turkish ownership/use signals | First party, continuous | Consent, privacy notice, retention/deletion and moderation required | Build as the long-term UX source; no public raw personal data |

Robots rules are not a copyright licence and permission does not override access restrictions.
Both must pass independently.

## Pilot catalogue (identity collection queue, not production data)

Start with 25 high-volume/diverse current nameplates and expand to exact TR trims only after their
dated distributor documents are captured: Toyota Corolla, Yaris Hybrid, Yaris Cross, Corolla
Cross; Renault Clio, Captur, Megane Sedan; Dacia Sandero Stepway, Duster; Fiat Egea Sedan,
Egea Cross; Hyundai i10, i20, Bayon, Tucson, INSTER; Volkswagen Polo, Golf, T-Roc, Taigo;
Peugeot 208, 2008, 3008; Citroen C3; BYD Atto 3. This list is a collection backlog, not a claim
that every trim is presently orderable.

Each model passes: distributor availability -> exact trim/powertrain identity -> dated price ->
technical PDF -> safety applicability -> second-source QA. Records with unresolved licensing or
market mapping stay quarantined.

## Update and quality controls

- Daily: licensed feed/API deltas, recall alerts, broken-source monitoring.
- Weekly: distributor price/availability check; manual until permission or feed exists.
- Monthly: specifications, campaigns, fuel, TSB/ODMD/TÜİK updates and reconciliation.
- Quarterly: sample-based source-to-record audit and decision-weight review.
- Every 180 days: source terms, robots, licence and owner review.
- Every import: schema/unit/range checks, duplicate detection, lineage completeness, model-year and
  trim matching, new/used separation, temporal overlap warnings, immutable raw document hash.

Recommended storage is PostgreSQL for canonical entities and observations, object storage for
permitted raw documents, and a job queue for fetch/parse/review/publish. Staging is quarantined;
only approved observations flow to read models used by the decision engine. The SQL migration in
`database/migrations/0001_vehicle_data_foundation.sql` is the first deployable foundation.

## Decision-engine transition

The present 20-record array remains a fixture. The production engine should consume a repository
read model containing only in-market, non-expired observations. Ranking must declare required
facts per use case, lower confidence for missing/stale/conflicting evidence, expose price date and
type, and abstain when evidence is insufficient. No user-experience signal affects ranking until
moderated and normalized or explicitly labelled qualitative.

## Database deployment runbook

Keep `DATABASE_URL` server-only; never expose it with a `NEXT_PUBLIC_` prefix or commit it to an
environment file. Apply schema migrations before importing data:

```sh
npm run db:migrate:vehicles
npm run db:import:vehicles -- --at=2026-08-14T00:00:00.000Z
npm run db:import:vehicles -- --apply --at=2026-08-14T00:00:00.000Z
```

The first import command is a local quality dry-run and does not require a database connection.
`--apply` requires the latest migration, reruns the same quality gate, and then writes each vehicle
in a pinned transaction. Migration checksums are immutable: editing an already applied SQL file
fails deployment instead of silently changing history. After import verification, set
`EXPIYA_CARS_CATALOG_MODE=production`; an unavailable database fails closed and never falls back
to the test fixture.
