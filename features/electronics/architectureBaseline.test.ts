import { describe, expect, it } from "vitest";
import { ELECTRONICS_ADMISSION_SEQUENCE, ELECTRONICS_ARCHITECTURE_BASELINE_VERSION, ELECTRONICS_AUTHORITY_BOUNDARIES, ELECTRONICS_CATEGORY_REGISTRY, validateElectronicsArchitectureBaseline } from "./architectureBaseline";
import { resolveDepartment } from "@/features/platform/departmentRegistry";
import { resolveXpyDomainPack } from "@/features/xpy/domainPacks";

describe("Electronics product architecture baseline", () => {
  it("defines a valid bounded four-wave taxonomy", () => {
    expect(ELECTRONICS_ARCHITECTURE_BASELINE_VERSION).toBe("electronics-product-architecture-baseline/v1");
    expect(ELECTRONICS_CATEGORY_REGISTRY).toHaveLength(24);
    expect(validateElectronicsArchitectureBaseline()).toEqual([]);
  });

  it("keeps the immutable baseline policy-bound while the governed runtime registry is active", () => {
    expect(ELECTRONICS_CATEGORY_REGISTRY.every(item => item.readiness === "CATEGORY_POLICY_REQUIRED")).toBe(true);
    expect(resolveDepartment("ELECTRONICS")?.capabilities.SMARTPHONE).toMatchObject({ status: "ACTIVE", authorityBinding: "ELECTRONICS-CATEGORY-POLICY-TR-v1.0" });
    expect(resolveXpyDomainPack("ELECTRONICS", "SMARTPHONE").status).toBe("ACTIVE");
  });

  it("makes Amazon discovery precede the non-Amazon Türkiye pass without decision authority", () => {
    expect(ELECTRONICS_ADMISSION_SEQUENCE[0]).toBe("AMAZON_TR_EXACT_ACTIVE_VARIANT_DISCOVERY");
    expect(ELECTRONICS_ADMISSION_SEQUENCE.at(-1)).toBe("NON_AMAZON_TR_EXACT_PRODUCT_SECOND_PASS");
    expect(ELECTRONICS_AUTHORITY_BOUNDARIES.amazonRole).toBe("PRIMARY_DISCOVERY_NOT_DECISION_AUTHORITY");
    expect(ELECTRONICS_AUTHORITY_BOUNDARIES.commerce).toBe("L10_EXTERNAL_VOLATILE_EXACT_IDENTITY_JOIN_ONLY");
    expect(ELECTRONICS_AUTHORITY_BOUNDARIES.activation).toBe("FORBIDDEN_IN_BASELINE");
  });
});
