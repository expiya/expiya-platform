import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { validateApplianceMediaRelease } from "./authority";

const root = process.cwd();
const mediaRoot = path.join(root, "data/production/appliances/media");
const read = (file: string) => readFileSync(path.join(mediaRoot, file));

describe("active governed appliance media artifacts", () => {
  it("binds a digest-valid 97-member, 24-category release through its active pointer", () => {
    const pointer = JSON.parse(read("active.json").toString("utf8")) as { releaseFile: string; releaseDigest: string };
    const result = validateApplianceMediaRelease(JSON.parse(read(pointer.releaseFile).toString("utf8")));
    expect(result.status).toBe("READY"); if (result.status !== "READY") return;
    expect(result.release.releaseDigest).toBe(pointer.releaseDigest); expect(result.release.members).toHaveLength(97);
    expect(new Set(result.release.members.map(item => item.categoryId)).size).toBe(24);
    expect(result.release.members.every(item => item.disposition !== "OWNED_REPRESENTATIVE" || item.localAsset?.path.startsWith("/appliances/representative/"))).toBe(true);
  });

  it("verifies every file named by the release manifest", () => {
    const pointer = JSON.parse(read("active.json").toString("utf8")) as { releaseFile: string };
    const directory = path.dirname(pointer.releaseFile); const manifest = JSON.parse(read(path.join(directory, "manifest.json")).toString("utf8")) as { files: { name: string; sha256: string }[] };
    for (const item of manifest.files) expect(createHash("sha256").update(read(path.join(directory, item.name))).digest("hex")).toBe(item.sha256);
  });
});
