import { describe, expect, it } from "vitest";
import { createDailyLifeLayerSnapshot, createPersonaLayerSnapshot } from "./adapter";

describe("V2 decision layer runtime adapters", () => {
  it("creates immutable closed-vocabulary snapshots", () => { const layer = createDailyLifeLayerSnapshot({ catalogReleaseVersion: "1", catalogFingerprint: "fingerprint", layerVersion: "1", signals: [{ exactVariantId: "v1", mappingId: "mapping", authority: "policy", mappingClass: "guided", decisionUse: "SOFT_UNTIL_CONFIRMED", rankingEffect: 1 }] }); expect(Object.isFrozen(layer.signals[0])).toBe(true); });
  it("rejects unknown keys and unsafe persona vocabulary", () => { expect(() => createDailyLifeLayerSnapshot({ catalogReleaseVersion: "1", catalogFingerprint: "fingerprint", layerVersion: "1", signals: [], extra: true })).toThrow(); expect(() => createPersonaLayerSnapshot({ catalogReleaseVersion: "1", catalogFingerprint: "fingerprint", layerVersion: "1", signals: [{ exactVariantId: "v1", trait: "DEMOGRAPHIC_STEREOTYPE", authority: "bad", matchStrength: 3 }] })).toThrow(); });
});
