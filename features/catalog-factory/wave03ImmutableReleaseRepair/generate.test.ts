import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { canonicalSerialize } from "./generate";

const sha = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");

describe("Wave-03 immutable release repair", () => {
  it("locks canonical object ordering while preserving array ordering", () => {
    const fixture = { z: 2, a: { y: 1, b: [3, { d: 4, c: 5 }] } };
    const bytes = canonicalSerialize(fixture);
    expect(bytes).toBe('{"a":{"b":[3,{"c":5,"d":4}],"y":1},"z":2}');
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("6bd844f8a7fc09dcce49ed3a92b71b3ceebd5abda02f6fa2c096ae348fb1d6e6");
  });
  it("re-reads and verifies the terminal release payload, file bytes, and exact membership", async () => {
    const bytes = await readFile("outputs/catalog-factory-wave03-immutable-release-repair-01/IMMUTABLE_RELEASE.json"), release = JSON.parse(bytes.toString()), core = { ...release };
    delete core.payloadDigest;
    expect(sha(bytes)).toBe("ba94cb38b62c344aa9d4d356755c7169895e0b1182fa884b857841bd08bb9b1b");
    expect(sha(canonicalSerialize(core))).toBe("2b5d399da628930da66c0a6e7c78c8c62f2c52003f3b2198606fb928cff7bc0f");
    expect(release.products).toHaveLength(3);
    expect(new Set(release.products.map((row: { exactProductId: string }) => row.exactProductId)).size).toBe(3);
  });

  it("keeps the superseded broken digest terminal and verifies the preflight independently", async () => {
    const bytes = await readFile("outputs/catalog-factory-wave03-immutable-release-repair-01/PREFLIGHT.json"), preflight = JSON.parse(bytes.toString()), core = { ...preflight };
    delete core.payloadDigest;
    expect(sha(bytes)).toBe("75e08ae6e2a89f09ede588fac532ee5bfaa98273b141e06510b133c53d13d4d6");
    expect(sha(canonicalSerialize(core))).toBe("7baa2ee735a987f7dad934b67101cb3576f245926c0faa2f60942a880e01e582");
    expect(preflight.gates).toMatchObject({ materializedReleaseReread: true, payloadDigestVerified: true, fileDigestVerified: true, exactRecordMembershipVerified: true });
  });
});
