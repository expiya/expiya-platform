import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { validateCommerceSnapshot, resolveCurrentProductCommerce } from "./authority";
import type { CurrentProductCommerce } from "./types";

export async function loadCurrentProductCommerce(root: string, productId: string, now = new Date()): Promise<CurrentProductCommerce | null> {
  try {
    const directory = path.join(root, "data/production/appliances/commerce");
    const pointer = JSON.parse(await readFile(path.join(directory, "current.json"), "utf8")) as { snapshotFile?: unknown; snapshotDigest?: unknown };
    if (typeof pointer.snapshotFile !== "string" || !/^snapshots\/[A-Za-z0-9._+-]+\.json$/u.test(pointer.snapshotFile)) return null;
    const parsed = validateCommerceSnapshot(JSON.parse(await readFile(path.join(directory, pointer.snapshotFile), "utf8")), now);
    if (parsed.status !== "READY" || pointer.snapshotDigest !== parsed.snapshot.snapshotDigest) return null;
    return resolveCurrentProductCommerce(parsed.snapshot, productId, now);
  } catch { return null; }
}
