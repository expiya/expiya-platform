import { ACCEPTED_DRILLS } from "@/features/catalog-factory/cordlessDrillWave";
export const CORDLESS_DRILL_RELEASE="CORDLESS-DRILL-TR-v1.0-2026-09-07" as const;
export const CORDLESS_DRILL_FACTORY_DIGEST="sha256:ad45e85b33597d9050fad5c9df2cc571279dc0697f0a758c5980a34474adeca4" as const;
export const CORDLESS_DRILL_PACKAGE_DIGEST="sha256:04fa39c1130d598bc9b0ed1cac2a24d22180aebce976b21aa428764d1d18b658" as const;
export const CORDLESS_DRILL_PRODUCTS=Object.freeze(ACCEPTED_DRILLS.map(row=>Object.freeze({exactProductId:`durable:cordless-drill:${row.id}`,brand:row.brand,model:row.model,sku:row.sku,configuration:row.kit,technical:{platform:row.platform,voltage:row.voltage,torque:row.torque,impact:row.impact,chuck:row.chuck,rpm:row.rpm,weight:row.weight,compatibility:row.compatibility},sourceUrl:row.manufacturerUrl})));
export const CORDLESS_DRILL_UNKNOWN_COUNT=4 as const;
export const CORDLESS_DRILL_SECRETARY_IDENTITIES=Object.freeze(CORDLESS_DRILL_PRODUCTS.map(row=>({departmentId:"TOOLS",categoryId:"CORDLESS_DRILL" as const,brand:row.brand,model:row.model,exactIdentifiers:[row.sku,row.exactProductId]})));
