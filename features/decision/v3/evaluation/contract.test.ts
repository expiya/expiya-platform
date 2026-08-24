import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetV31OffersForTests } from "../offerGovernance.server";
import { resetV31StoreForTests } from "../store.server";
import { V3_SMOKE_JOURNEYS } from "./journeyFixtures";
import { runV3SmokeJourney } from "./runJourney";

const priorDisabled = process.env.CARS_V31_PROVIDER_DISABLED;

describe("V3 shared deterministic evaluation journeys", () => {
  beforeEach(() => { process.env.CARS_V31_PROVIDER_DISABLED = "true"; resetV31StoreForTests(); resetV31OffersForTests(); });
  afterEach(() => { resetV31StoreForTests(); resetV31OffersForTests(); if (priorDisabled === undefined) delete process.env.CARS_V31_PROVIDER_DISABLED; else process.env.CARS_V31_PROVIDER_DISABLED = priorDisabled; });

  it.each(V3_SMOKE_JOURNEYS)("passes $id", async (journey) => {
    const report = await runV3SmokeJourney(journey);
    expect(report.failed).toEqual([]);
  });
});
