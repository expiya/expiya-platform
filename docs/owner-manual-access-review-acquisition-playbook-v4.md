# Owner Manual V4 — Access Review Acquisition Playbook

This playbook governs the 151 catalog families whose official owner-document surface is known but whose public artifact access or reuse conditions are not yet sufficiently clear. `ACCESS_REVIEW_REQUIRED` is not evidence of absence.

## Lawful acquisition routes

1. **Consenting-owner VIN session** — Audi, BMW, MINI, Porsche, Rolls-Royce and Volkswagen documents that are exposed only after a real VIN lookup. Obtain the VIN from a consenting owner, use the official portal interactively for that single vehicle, record the consent and publication identity, and retain only checksums, locators and normalized facts.
2. **Bounded public-selector review** — Alfa Romeo, DS Automobiles and Jeep. A reviewer checks one model/year at a time, records the portal terms and the final artifact URL. Automation starts only if the terms and robots policy clearly permit it.
3. **Türkiye distributor technical-publication request** — Chery, JAECOO, OMODA, Isuzu, DFSK, Hongqi, KGM, Leapmotor and Suzuki. Request the current Turkey owner manual plus the model-year equipment/option matrix and ask whether normalized fact extraction with locator/checksum retention is permitted.
4. **Manufacturer customer-service escalation** — Aston Martin, Bentley, Ferrari, Lamborghini, Maserati and other low-volume brands. Ask for the publication number, market/model-year applicability and a public download or written permission; a dealer-supplied file is accepted only after manufacturer identity is verified.
5. **Owner-supplied artifact intake** — fallback only. Accept a document from a consenting owner without credentials or account exports, hash it locally, verify manufacturer marks/publication number, record the acquisition decision, and do not republish the artifact.

## Request package

Every request identifies brand, model family, catalog model years and exact-variant IDs and asks for:

- owner manual or official in-vehicle guide;
- Turkey equipment/option matrix;
- publication/effective date and market applicability;
- stable URL or manufacturer publication number;
- permission to retain normalized facts, locators, provenance and SHA-256 without republishing source text or images.

## Completion gate

An entry leaves `ACCESS_REVIEW_REQUIRED` only when it has an official/authorized artifact, SHA-256, market and model-year applicability, page/section locator and a recorded access/reuse decision. Authentication, CAPTCHA, robots, rate limits and access controls are never bypassed; VINs are never invented or enumerated.
