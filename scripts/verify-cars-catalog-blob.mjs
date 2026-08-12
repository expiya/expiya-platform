import { execFileSync } from "node:child_process";

const approvedSnapshot = "6e59417e408e9f69cbd32496bf2b4ed7b4739a34";
const approvedBlob = "bb93a2944ec8924fd349df077e0405b4bc89df01";
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
