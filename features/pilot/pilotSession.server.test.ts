import { scryptSync } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authenticatePilotUser, createPilotSessionToken, verifyPilotSessionToken } from "./pilotSession.server";

describe("pilot session authentication", () => {
  beforeEach(() => {
    const salt = Buffer.from("0123456789abcdef"); const hash = scryptSync("strong-pilot-password", salt, 32);
    vi.stubEnv("CARS_PILOT_SESSION_SECRET", "01234567890123456789012345678901");
    vi.stubEnv("CARS_PILOT_USERS_JSON", JSON.stringify([{ username: "pilot.one", displayName: "Pilot One", passwordHash: `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`, active: true }]));
  });
  afterEach(() => vi.unstubAllEnvs());
  it("authenticates an active configured user and signs a tamper-evident session", () => {
    const session = authenticatePilotUser("PILOT.ONE", "strong-pilot-password"); expect(session).toMatchObject({ username: "pilot.one", displayName: "Pilot One" });
    const token = createPilotSessionToken(session!); expect(verifyPilotSessionToken(token)).toMatchObject({ username: "pilot.one" });
    expect(verifyPilotSessionToken(`${token}x`)).toBeNull();
  });
  it("fails closed for invalid credentials or disabled configuration", () => {
    expect(authenticatePilotUser("pilot.one", "wrong-password")).toBeNull();
    vi.stubEnv("CARS_PILOT_USERS_JSON", "invalid"); expect(authenticatePilotUser("pilot.one", "strong-pilot-password")).toBeNull();
  });
});
