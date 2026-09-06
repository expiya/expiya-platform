# Owner Manual Evidence V4 authority boundary

Owner manuals prove that a capability is documented for a model family or a stated model-year/trim scope. They do not prove that every Turkish exact variant contains it. Positive `MODEL_FAMILY_CAPABILITY` and `MODEL_YEAR_TRIM_APPLICABILITY` evidence may participate in provisional candidate filtering, similarly to estimated-price filtering, but remains `UNVERIFIED` and must produce a user-facing “doğrulanması gerekir” warning. Only `EXACT_VARIANT_VERIFIED`, backed by a Turkish equipment matrix, configurator, price/option list, VIN-specific document, or equally explicit exact-trim link, is verified hard-filter authority.

Conditional phrases such as “if fitted”, “depending on version”, “varsa”, “modele göre” and “ülkeye göre” block exact projection. A missing manual mention is never converted to `NOT_AVAILABLE`; negative evidence requires an explicit official non-offer statement at exact authority. Conflicts remain separate records and unresolved until reviewed. Every assertion retains raw and derived SHA-256 values, a physical-page/section/table locator, applicability, polarity, confidence, extraction policy and reviewer decision. Copyrighted manual text and images are not product artifacts; stored evidence is limited to normalized facts, locators, provenance and checksums.

Discovery must remain bounded and respectful of robots, authentication, CAPTCHA and rate limits. VINs are never invented. A portal with unclear terms, authentication, or unsafe bulk behavior is recorded as `ACCESS_REVIEW_REQUIRED`, not crawled.

## Foreign-language and foreign-market manuals

- Language and market are independent applicability dimensions. A Turkish-language document is not automatically a Turkey-market document; a foreign-language document may still be useful when its issuing market is retained.
- Positive foreign-market manual facts may contribute provisional candidate filtering, vocabulary aliases, question planning and soft ranking. Every selected card affected by such evidence must say that the equipment requires verification for the Turkish variant.
- `EXACT_VARIANT_VERIFIED` requires `market: "TR"` plus an exact Turkey variant bridge. A GB, EU, US, GLOBAL or unknown-market manual fails closed even if model-year and trim labels appear to match.
- Conditional-language detection covers the supported extraction languages. Ambiguous phrasing stays conditional and requires review; lack of a detector match never promotes authority.
- Translation must not strengthen polarity, applicability or confidence. Locators point to the original-language artifact, and normalized facts do not republish copyrighted prose.
