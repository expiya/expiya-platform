# Appliances Amazon Creators API configuration

This boundary is disabled by default. Missing credentials are a normal, deterministic state and do not affect the Appliances technical catalog or recommendation runtime.

Configure these values only in the server deployment secret store:

- `APPLIANCES_AMAZON_CREATORS_CREDENTIAL_ID`
- `APPLIANCES_AMAZON_CREATORS_CREDENTIAL_SECRET`
- `APPLIANCES_AMAZON_CREATORS_CREDENTIAL_VERSION=3.2` for the EU/Türkiye token endpoint
- `APPLIANCES_AMAZON_CREATORS_PARTNER_TAG` for the `www.amazon.com.tr` Associates store
- `APPLIANCES_AMAZON_ASSOCIATES_ACCEPTANCE_REFERENCE` as an internal, non-secret approval/audit reference

The older `APPLIANCES_AMAZON_CREATORS_CLIENT_ID` and `APPLIANCES_AMAZON_CREATORS_CLIENT_SECRET` names remain accepted as migration aliases. New deployments should use `CREDENTIAL_ID` and `CREDENTIAL_SECRET`, matching Amazon's current terminology. Never use a `NEXT_PUBLIC_` prefix and never place credential values in this file, client props, URLs, logs, fixtures, or committed `.env` files.

The adapter uses OAuth 2.0 client credentials against the EU v3.2 token endpoint, sends a valid Türkiye Partner Tag on every catalog request, accepts no more than ten ASIN lookups per call, and rejects partial or identity-ambiguous responses. Offer observations expire after one hour. Detail URLs and image URLs expire after one day and image bytes are never copied into the frozen catalog.

Current prerequisites and policy sources (reviewed 2026-09-05):

- A reviewed, finally accepted Amazon Associates account with qualified referred sales is required before Creators API registration: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/onboarding/register-for-creators-api
- Only the primary Associates account owner can register; each store currently allows at most two applications and two credential sets per application.
- Türkiye requires a valid Partner Tag for `www.amazon.com.tr`, with EU credential version 3.2 authentication: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/get-started/using-curl
- PA-API 5 is deprecated; new and migrated integrations must use Creators API: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/paapiv5-deprecation
- Amazon's current cache guidance is one hour for Offers and one day for other catalog resources: https://affiliate-program.amazon.com/creatorsapi/docs/en-us/concepts/best-programming-practices
- Türkiye use is governed by the local Associates Program IP License: https://gelirortakligi.amazon.com.tr/help/operating/policies#Associates%20Program%20IP%20License

Credential creation, production activation, live catalog mutation, purchasing, order placement, payment, and lead submission are intentionally outside this work unit.
