import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const routePath = path.join(root, ".next/server/app/api/platform/p-materiality/route.js");
const route = await readFile(routePath, "utf8");
if (!route.includes("SDP-V2-ALL-ACTIVE-CATALOGS-TR-v4.0") || !route.includes("sha256:c0d861a81bd0eb309fe307add866f6ec5026b6394b007db723b87689c3a8b6ab")) {
  throw new Error("P_MATERIALITY_RELEASE_NOT_PRESENT_IN_SERVER_ROUTE");
}
console.log(JSON.stringify({ status: "PASS", serverRoute: ".next/server/app/api/platform/p-materiality/route.js", releaseId: "SDP-V2-ALL-ACTIVE-CATALOGS-TR-v4.0", sourceReleaseSha256: "sha256:c0d861a81bd0eb309fe307add866f6ec5026b6394b007db723b87689c3a8b6ab", bundleTraceable: true }));
