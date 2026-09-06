import { requireXpyDomainPack } from "../domainPacks";
import { XPY_RUNTIME_DIGEST, XPY_RUNTIME_VERSION } from "../runtimeContract";
import { XPY_CATALOG_VERSION } from "./contract";

export interface XpyCatalogRegistration {
  readonly catalogContractVersion: typeof XPY_CATALOG_VERSION;
  readonly runtimeVersion: typeof XPY_RUNTIME_VERSION;
  readonly runtimeDigest: typeof XPY_RUNTIME_DIGEST;
  readonly domainPackId: string;
  readonly departmentId: "CARS" | "APPLIANCES";
  readonly categoryId: string;
  readonly offeringKind: "PRODUCT" | "SERVICE";
  readonly authorityAdapterId: string;
}

const cars = requireXpyDomainPack("CARS");
const appliances = requireXpyDomainPack("APPLIANCES");

const create = (departmentId: "CARS" | "APPLIANCES", categoryId: string, authorityAdapterId: string): XpyCatalogRegistration => {
  const pack = departmentId === "CARS" ? cars : appliances;
  if (!pack.categories.includes(categoryId)) throw new TypeError("XPY_CATALOG_CATEGORY_UNREGISTERED");
  return Object.freeze({
    catalogContractVersion: XPY_CATALOG_VERSION,
    runtimeVersion: XPY_RUNTIME_VERSION,
    runtimeDigest: XPY_RUNTIME_DIGEST,
    domainPackId: pack.domainPackId,
    departmentId,
    categoryId,
    offeringKind: "PRODUCT",
    authorityAdapterId,
  });
};

export const XPY_CATALOG_REGISTRATIONS = Object.freeze([
  create("CARS", "NEW_CAR", "cars-active-catalog/v0.55.4"),
  create("APPLIANCES", "WASHING_MACHINE", "appliances-washing-machine-authority/v0.1"),
  create("APPLIANCES", "DRYER", "appliances-domain-pack/dryer/v0.1"),
  create("APPLIANCES", "REFRIGERATOR", "appliances-domain-pack/refrigerator/v0.1"),
  create("APPLIANCES", "DISHWASHER", "appliances-domain-pack/dishwasher/v0.1"),
  create("APPLIANCES", "VACUUM", "appliances-domain-pack/vacuum/v0.1"),
  create("APPLIANCES", "ROBOT_VACUUM", "appliances-domain-pack/robot-vacuum/v0.1"),
]);

export function assertXpyCatalogRegistration(registration: XpyCatalogRegistration): void {
  const pack = requireXpyDomainPack(registration.departmentId);
  if (registration.catalogContractVersion !== XPY_CATALOG_VERSION) throw new TypeError("XPY_CATALOG_VERSION_UNSUPPORTED");
  if (registration.runtimeVersion !== XPY_RUNTIME_VERSION || registration.runtimeDigest !== XPY_RUNTIME_DIGEST) throw new TypeError("XPY_CATALOG_RUNTIME_INCOMPATIBLE");
  if (registration.domainPackId !== pack.domainPackId || !pack.categories.includes(registration.categoryId)) throw new TypeError("XPY_CATALOG_DOMAIN_PACK_INCOMPATIBLE");
}
