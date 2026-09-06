import { writeHeadphonesOwnerPackage } from "../features/electronics/headphonesOwnerApprovalPackage";

async function main() {
  const result = await writeHeadphonesOwnerPackage(process.cwd());
  console.log(JSON.stringify(result, null, 2));
}

void main();
