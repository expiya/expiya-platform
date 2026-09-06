export const MAJOR_APPLIANCE_DECISION_ADOPTION_WORK_UNIT = "WU-APPL-AMAZON-P1-MAJOR-APPLIANCE-DECISION-ADOPTION-01" as const;
export const MAJOR_APPLIANCE_SOURCE_BATCH_DIGEST = "sha256:b3cb67e1dd00dc6c529ae750679e8276c13f9723d4e1d77737a7f39aee441ea2" as const;
export const MAJOR_APPLIANCE_SOURCE_PACKAGE_SHA256 = "2e76d621ce5569d7005ea29ab10e70f1807199038d1d973a681baee829210732" as const;
export const MAJOR_APPLIANCE_CATALOG_ACTIVATION_ID = "APPLIANCES-MAJOR-CATALOG-ACT-B3CB67E1DD00-2E76D621CE55" as const;

export const MAJOR_APPLIANCE_DECISION_CATEGORIES = ["WASHING_MACHINE", "DRYER", "DISHWASHER", "REFRIGERATOR"] as const;
export type MajorApplianceDecisionCategory = typeof MAJOR_APPLIANCE_DECISION_CATEGORIES[number];

export const MAJOR_APPLIANCE_DECISION_ADDITIONS = Object.freeze({
  WASHING_MACHINE: [
    "appliances:wm:tr:samsung:ww90ta046ah-ah",
    "appliances:wm:tr:vestel:cmi-97402-wifi",
    "appliances:wm:tr:arcelik:10120-imp",
    "appliances:wm:tr:altus:al-cm-101254-d",
    "appliances:wm:tr:samsung:ww11dg6b25leah",
  ],
  DRYER: [
    "appliances:dryer:tr:hoover:hre-h11a2tbe-17",
    "appliances:dryer:tr:hoover:nr-eh11n2tbex-17",
    "appliances:dryer:tr:arcelik:1201-kmx",
    "appliances:dryer:tr:samsung:dv10dg54a0abah",
  ],
  DISHWASHER: [
    "appliances:dishwasher:tr:arcelik:a-710-i",
    "appliances:dishwasher:tr:arcelik:a-811-i",
    "appliances:dishwasher:tr:samsung:dw60m5062fs-tr",
  ],
  REFRIGERATOR: [
    "appliances:refrigerator:tr:teka:rmf-77920-ss-eu-113430009",
    "appliances:refrigerator:tr:arcelik:270475-mb",
    "appliances:refrigerator:tr:samsung:rb58ds75esa-tr",
    "appliances:refrigerator:tr:samsung:rf57c510esr-tr",
  ],
} satisfies Readonly<Record<MajorApplianceDecisionCategory, readonly string[]>>);

export const BLOCKED_TEKA_DISHWASHER_ID = "appliances:dishwasher:tr:teka:dfi-46700-ttm" as const;

export const MAJOR_APPLIANCE_DECISION_RELEASES = Object.freeze({
  WASHING_MACHINE: { parent: "APPLIANCES-WM-TR-v0.1", successor: "APPLIANCES-WM-TR-v0.2", expectedCount: 29, parentArtifactSha256: "35a8132910a7b565dea94ec14b43625b0a46e0d8153723e25fcd39a063090c2b" },
  DRYER: { parent: "APPLIANCES-DRYER-TR-v0.1", successor: "APPLIANCES-DRYER-TR-v0.2", expectedCount: 7, parentArtifactSha256: "3ef3ce69874ced7d210c97545d35e82a9a2fae2933a7d7d715ae411224943f48" },
  DISHWASHER: { parent: "APPLIANCES-DISHWASHER-TR-v0.1", successor: "APPLIANCES-DISHWASHER-TR-v0.2", expectedCount: 7, parentArtifactSha256: "66973c59f1b752f2598b4c6b30d6dc0d2b272948a342b33a08f4cd8f68f9124e" },
  REFRIGERATOR: { parent: "APPLIANCES-REFRIGERATOR-TR-v0.1", successor: "APPLIANCES-REFRIGERATOR-TR-v0.2", expectedCount: 8, parentArtifactSha256: "4b9c4aef891c46c023c67a1564d87652e1d63fe25ef9482c7ff830548cf9e825" },
} satisfies Readonly<Record<MajorApplianceDecisionCategory, { readonly parent: string; readonly successor: string; readonly expectedCount: number; readonly parentArtifactSha256: string }>>);

export interface MajorApplianceDecisionAdoptionBinding {
  readonly workUnitId: typeof MAJOR_APPLIANCE_DECISION_ADOPTION_WORK_UNIT;
  readonly sourceBatchDigest: typeof MAJOR_APPLIANCE_SOURCE_BATCH_DIGEST;
  readonly sourcePackageSha256: typeof MAJOR_APPLIANCE_SOURCE_PACKAGE_SHA256;
  readonly catalogActivationId: typeof MAJOR_APPLIANCE_CATALOG_ACTIVATION_ID;
  readonly parentReleaseVersion: string;
  readonly parentArtifactSha256: string;
  readonly decisionAuthorityApproval: "EXPLICIT_PRODUCT_OWNER_APPROVAL";
  readonly commerceBoundary: "L10_NO_DECISION_EFFECT";
  readonly admittedOfferingIds: readonly string[];
  readonly excludedOfferingIds: readonly [typeof BLOCKED_TEKA_DISHWASHER_ID];
}

export function decisionAdoptionBinding(category: MajorApplianceDecisionCategory): MajorApplianceDecisionAdoptionBinding {
  return {
    workUnitId: MAJOR_APPLIANCE_DECISION_ADOPTION_WORK_UNIT,
    sourceBatchDigest: MAJOR_APPLIANCE_SOURCE_BATCH_DIGEST,
    sourcePackageSha256: MAJOR_APPLIANCE_SOURCE_PACKAGE_SHA256,
    catalogActivationId: MAJOR_APPLIANCE_CATALOG_ACTIVATION_ID,
    parentReleaseVersion: MAJOR_APPLIANCE_DECISION_RELEASES[category].parent,
    parentArtifactSha256: MAJOR_APPLIANCE_DECISION_RELEASES[category].parentArtifactSha256,
    decisionAuthorityApproval: "EXPLICIT_PRODUCT_OWNER_APPROVAL",
    commerceBoundary: "L10_NO_DECISION_EFFECT",
    admittedOfferingIds: MAJOR_APPLIANCE_DECISION_ADDITIONS[category],
    excludedOfferingIds: [BLOCKED_TEKA_DISHWASHER_ID],
  };
}

export function isExpectedDecisionAdoptionBinding(category: MajorApplianceDecisionCategory, value: unknown): value is MajorApplianceDecisionAdoptionBinding {
  if (!value || typeof value !== "object") return false;
  const binding = value as Partial<MajorApplianceDecisionAdoptionBinding>;
  return binding.workUnitId === MAJOR_APPLIANCE_DECISION_ADOPTION_WORK_UNIT
    && binding.sourceBatchDigest === MAJOR_APPLIANCE_SOURCE_BATCH_DIGEST
    && binding.sourcePackageSha256 === MAJOR_APPLIANCE_SOURCE_PACKAGE_SHA256
    && binding.catalogActivationId === MAJOR_APPLIANCE_CATALOG_ACTIVATION_ID
    && binding.parentReleaseVersion === MAJOR_APPLIANCE_DECISION_RELEASES[category].parent
    && binding.parentArtifactSha256 === MAJOR_APPLIANCE_DECISION_RELEASES[category].parentArtifactSha256
    && binding.decisionAuthorityApproval === "EXPLICIT_PRODUCT_OWNER_APPROVAL"
    && binding.commerceBoundary === "L10_NO_DECISION_EFFECT"
    && JSON.stringify(binding.admittedOfferingIds) === JSON.stringify(MAJOR_APPLIANCE_DECISION_ADDITIONS[category])
    && JSON.stringify(binding.excludedOfferingIds) === JSON.stringify([BLOCKED_TEKA_DISHWASHER_ID]);
}
