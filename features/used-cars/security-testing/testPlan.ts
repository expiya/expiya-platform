export type SecurityTestSurface = "TENANCY_RLS" | "RBAC" | "AUTH_SESSION" | "API" | "FILE_UPLOAD" | "WEBHOOK_FEED" | "PUBLIC_PROJECTION" | "EXPORT" | "AI_CHANNEL" | "BUSINESS_LOGIC";
export interface SecurityTestScenario { readonly scenarioId: string; readonly surface: SecurityTestSurface; readonly objective: string; readonly expected: "DENY" | "SANITIZE" | "RATE_LIMIT" | "QUARANTINE" | "REQUIRE_HUMAN" | "NO_DATA"; readonly independentTesterRequired: boolean; readonly productionSafe: boolean }
export const usedCarsSecurityTestPlan: readonly SecurityTestScenario[] = Object.freeze([
  { scenarioId: "SEC-001", surface: "TENANCY_RLS", objective: "Cross-tenant object ID read/write", expected: "NO_DATA", independentTesterRequired: true, productionSafe: false },
  { scenarioId: "SEC-002", surface: "RBAC", objective: "Branch manager privilege escalation", expected: "DENY", independentTesterRequired: true, productionSafe: false },
  { scenarioId: "SEC-003", surface: "AUTH_SESSION", objective: "Session fixation and token replay", expected: "DENY", independentTesterRequired: true, productionSafe: false },
  { scenarioId: "SEC-004", surface: "AUTH_SESSION", objective: "MFA and recovery bypass", expected: "DENY", independentTesterRequired: true, productionSafe: false },
  { scenarioId: "SEC-005", surface: "API", objective: "Mass assignment and tenant override", expected: "DENY", independentTesterRequired: true, productionSafe: false },
  { scenarioId: "SEC-006", surface: "API", objective: "Injection and unsafe error disclosure", expected: "SANITIZE", independentTesterRequired: true, productionSafe: false },
  { scenarioId: "SEC-007", surface: "API", objective: "Enumeration and rate-limit bypass", expected: "RATE_LIMIT", independentTesterRequired: true, productionSafe: false },
  { scenarioId: "SEC-008", surface: "FILE_UPLOAD", objective: "MIME spoof, polyglot and malware", expected: "QUARANTINE", independentTesterRequired: true, productionSafe: false },
  { scenarioId: "SEC-009", surface: "FILE_UPLOAD", objective: "Image parser bomb and metadata PII", expected: "SANITIZE", independentTesterRequired: true, productionSafe: false },
  { scenarioId: "SEC-010", surface: "WEBHOOK_FEED", objective: "Signature bypass and replay", expected: "DENY", independentTesterRequired: true, productionSafe: false },
  { scenarioId: "SEC-011", surface: "WEBHOOK_FEED", objective: "SSRF through feed/media URL", expected: "DENY", independentTesterRequired: true, productionSafe: false },
  { scenarioId: "SEC-012", surface: "PUBLIC_PROJECTION", objective: "VIN, plate, document and tenant leakage", expected: "NO_DATA", independentTesterRequired: true, productionSafe: false },
  { scenarioId: "SEC-013", surface: "EXPORT", objective: "Bulk lead export and CSV injection", expected: "SANITIZE", independentTesterRequired: true, productionSafe: false },
  { scenarioId: "SEC-014", surface: "AI_CHANNEL", objective: "Prompt injection and mandate escape", expected: "REQUIRE_HUMAN", independentTesterRequired: true, productionSafe: false },
  { scenarioId: "SEC-015", surface: "AI_CHANNEL", objective: "Cross-conversation data leakage", expected: "NO_DATA", independentTesterRequired: true, productionSafe: false },
  { scenarioId: "SEC-016", surface: "BUSINESS_LOGIC", objective: "Publish without contract/payment/moderation", expected: "DENY", independentTesterRequired: true, productionSafe: false },
  { scenarioId: "SEC-017", surface: "BUSINESS_LOGIC", objective: "Organic rank purchase or sponsorship mixing", expected: "DENY", independentTesterRequired: true, productionSafe: false },
  { scenarioId: "SEC-018", surface: "BUSINESS_LOGIC", objective: "Dealer closure leaves listings or grants active", expected: "NO_DATA", independentTesterRequired: true, productionSafe: false },
]);
export function validateSecurityTestPlan(plan: readonly SecurityTestScenario[]) { const codes: string[] = []; if (new Set(plan.map((item) => item.scenarioId)).size !== plan.length) codes.push("DUPLICATE_SCENARIO"); if (new Set(plan.map((item) => item.surface)).size !== 10) codes.push("SURFACE_COVERAGE_REQUIRED"); if (plan.some((item) => !item.independentTesterRequired)) codes.push("INDEPENDENT_TESTER_REQUIRED"); if (plan.some((item) => item.productionSafe)) codes.push("PRODUCTION_TEST_EXECUTION_FORBIDDEN"); return Object.freeze(codes); }
