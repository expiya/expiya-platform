# Governed catalog ingestion factory v1

This factory prepares non-production catalog candidates for any department. It does not activate a catalog, change an active pointer, grant production eligibility, or bind candidates into a recommendation runtime.

## Authority flow

1. Every discovery input is captured as a versioned snapshot with an HTTPS source, retrieval instant, locator, market, raw content, and matching SHA-256 digest.
2. Candidate identities are normalized into a deterministic department/category/manufacturer/model/variant key. Duplicate observations merge without depending on input order.
3. A candidate starts at `DISCOVERY_ONLY`. Exact manufacturer product-page or manufacturer-document evidence is required for `IDENTITY_VERIFIED`. Every decision-material claim must be supported by manufacturer evidence for `DECISION_READY`.
4. Missing manufacturer evidence creates a deterministic open queue item. Invalid digests, dangling references, conflicting duplicate claims, unsupported source classes, and authority misuse fail closed.
5. The output manifest binds inputs, candidates, and the evidence queue by digest and permanently declares `activePointersChanged: false` and `productionEligibilityGranted: false`.

Amazon bestseller and other marketplace content is discovery-only. It cannot establish technical truth, price authority, popularity-based recommendation, affiliate status, identity verification, decision readiness, or production eligibility.

The factory intentionally has no imports from Electronics, Appliances, Baby, Cars, Mobility, or XPY presentation code. Department adapters may translate a `DECISION_READY` candidate into a separate department approval workflow, but must retain that department's existing approval, release, and activation gates.
