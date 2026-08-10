import { execFileSync } from "node:child_process";

const approvedSnapshot = "b59169f29f974369a51ca607cb7dbd201683578b";
const approvedBlob = "32edbf2ed189b2936cf468d5489c97e07a094d42";
const catalogPath = "data/car.ts";

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

const snapshotBlob = git("rev-parse", `${approvedSnapshot}:${catalogPath}`);
const workingTreeBlob = git("hash-object", catalogPath);

if (snapshotBlob !== approvedBlob) {
  throw new Error(
    `Approved snapshot catalog blob mismatch: expected ${approvedBlob}, received ${snapshotBlob}.`,
  );
}

if (workingTreeBlob !== approvedBlob) {
  throw new Error(
    `Current catalog blob mismatch: expected ${approvedBlob}, received ${workingTreeBlob}.`,
  );
}

console.log(
  `Verified ${catalogPath} at ${approvedSnapshot} and in the working tree as ${approvedBlob}.`,
);
