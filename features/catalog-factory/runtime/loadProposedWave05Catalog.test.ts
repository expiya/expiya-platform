import { describe, expect, it } from "vitest";
import { loadEffectiveCatalogFactoryView } from "./effectiveCatalog.server";
import { loadProposedWave05CatalogFactoryView } from "./loadProposedWave05Catalog.server";

describe("Wave-05 shared runtime-loader candidate", () => {
  it("keeps live authority at 108 while exposing an unbound 111 candidate", () => {
    const active = loadEffectiveCatalogFactoryView();
    const proposed = loadProposedWave05CatalogFactoryView();
    expect(active.totals.active).toBe(108);
    expect(proposed.state).toBe("CANDIDATE_ONLY_NOT_RUNTIME_BOUND");
    expect(proposed.totals).toEqual({ before: 80, additions: 31, active: 111 });
    expect(proposed.products).toHaveLength(31);
    expect(proposed.readiness).toEqual({ P_READY: false, Y_READY: false });
  });
});
