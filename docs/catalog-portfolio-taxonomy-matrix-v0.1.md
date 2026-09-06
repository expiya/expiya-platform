# Catalog portfolio taxonomy matrix v0.1

This is the implementation handoff for `WU-CATALOG-PORTFOLIO-TAXONOMY-MATRIX-01`. The machine-readable authority is `data/governance/catalog-portfolio/releases/CATALOG-PORTFOLIO-TAXONOMY-MATRIX-TR-v0.1/portfolio.json`. It is proposal-only and changes no runtime pointer, department registration, category activation, route, deployment, ranking policy, or XPY chat-box UI.

## Executive decision

| Amazon Türkiye area | Portfolio disposition | Canonical destination | MGC size |
|---|---|---|---:|
| Garden | common-family merge | proposed `HOME_AND_PROJECTS / OUTDOOR_HOME` | 4 |
| Baby Products | existing expansion | `BABY_AND_CHILD / BABY_EQUIPMENT` | 5 |
| Computers | existing reuse | `ELECTRONICS / COMPUTING` | 5 |
| Electronics | existing reuse | `ELECTRONICS` | 5 |
| Home | common-family merge | `HOME_AND_PROJECTS / HOME_LIVING`, with existing-owner aliases | 5 |
| Pet Supplies | new-department candidate | proposed `PET_CARE` | 5 |
| Grocery | poor fit; defer | none | 0 |
| Gift Cards | poor fit; reject | none | 0 |
| Beauty | poor fit; defer | none | 0 |
| Books | poor fit; reject | none | 0 |
| Apparel | poor fit; defer | none | 0 |
| Kitchen | existing reuse | `APPLIANCES / KITCHEN_APPLIANCES` | 5 |
| Musical Instruments | new-department candidate | proposed `CREATIVE_EQUIPMENT` | 5 |
| Office Products | common-family merge | `HOME_AND_PROJECTS / WORKSPACE`, electronic identities owned by Electronics | 5 |
| Automotive | existing expansion | `CARS / VEHICLE_AND_AFTERMARKET` | 5 |
| Toys | existing expansion | `BABY_AND_CHILD / PLAY_AND_LEARNING` | 4 |
| Health & Personal Care | poor fit; defer | none | 0 |
| Sporting Goods | new-department candidate | proposed `SPORT_AND_OUTDOOR`, bicycles owned by Mobility | 5 |
| Video Games | existing expansion | `ELECTRONICS / GAMING_HARDWARE` | 4 |
| Home Improvement | common-family merge | proposed `HOME_AND_PROJECTS / TOOLS_AND_PROJECTS` | 4 |

The exact 3–5 category MGCs, rationales, canonical ownership, aliases, proposed waves and next work units are frozen in the JSON artifact. Amazon's bestseller root confirms the 20 retail areas, while its Computers, Toys and Video Games pages demonstrate that retail subtrees overlap and mix products/accessories. Therefore Amazon is discovery/taxonomy evidence only, never product identity, technical, safety, applicability, ranking or decision authority.

## Waves

1. Wave 0 locks existing ownership and aliases for Computers/Electronics/Kitchen/Home/Automotive/Sporting Goods/Video Games.
2. Wave 1 builds category-specific candidate authorities for Baby, Toys, Home Improvement and Garden.
3. Wave 2 evaluates specialist durable equipment for Musical Instruments, Sporting Goods and Office Products.
4. Wave 3 pilots non-clinical Pet Supplies.
5. Wave 99 explicitly creates no catalog for Grocery, Gift Cards, Beauty, Books, Apparel, or Health & Personal Care.

## Genuine authority conflicts

1. The supplied label “Electronics v1.2 (93 products)” conflicts with the repository-active pointer name `ELECTRONICS-RUNTIME-CATALOG-TR-v1.0`; the 93-product fact is consistent. Runtime naming must follow the active pointer until an owner reconciles the version label.
2. Mobility and stroller bindings retain `owner-review-candidate` / `approval-candidate` suffixes while active state and registry status say `ACTIVE`. This artifact records but does not rename those authorities.
3. Amazon retail taxonomy overlaps canonical objects. The artifact resolves this structurally: Computers and Video Games route to Electronics; Automotive routes to Cars; bicycles remain Mobility-owned; child car seats remain Baby-owned; Home/Garden/Office/Home Improvement share one proposed Home & Projects family.

## Evidence

- Repository baseline: commit `8173fa9`, especially the shared department registry and active Electronics, Mobility, Appliances and Baby authority bindings listed in `source-register.json`.
- Amazon Türkiye bestseller root: <https://www.amazon.com.tr/gp/bestsellers/>
- Computers taxonomy: <https://www.amazon.com.tr/gp/bestsellers/computers>
- Toys taxonomy: <https://www.amazon.com.tr/gp/bestsellers/toys>
- Video Games taxonomy: <https://www.amazon.com.tr/gp/bestsellers/videogames>

All external pages are volatile discovery inputs. A later MGC work unit must independently acquire exact Turkish-market identity and official technical evidence before any candidate can approach activation.
