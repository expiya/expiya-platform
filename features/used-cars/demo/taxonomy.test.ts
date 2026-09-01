import { describe, expect, it } from "vitest";
import { DEMO_TAXONOMY_PATHS } from "./taxonomy";

describe("stock creation demo taxonomy", () => {
  it("uses stable IDs and versioned controlled paths", () => {
    for (const path of DEMO_TAXONOMY_PATHS) {
      expect(path.make.id).toMatch(/^make-/);
      expect(path.model.id).toMatch(/^model-/);
      expect(path.generation.id).toMatch(/^gen-/);
      expect(path.version).toMatch(/^tr-/);
    }
  });
});
