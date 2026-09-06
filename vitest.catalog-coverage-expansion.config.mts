import { defineConfig } from "vitest/config";

export default defineConfig({
  cacheDir: "/private/tmp/expiya-electronics-coverage-vite-cache",
  test: {
    environment: "node",
    include: [
      "features/electronics/catalogCoverageExpansion.test.ts",
      "features/electronics/headphonesEvidenceReconciliation.test.ts",
      "features/electronics/headphonesOwnerApprovalPackage.test.ts",
      "features/electronics/headphonesCatalogActivation.test.ts",
    ],
  },
});
