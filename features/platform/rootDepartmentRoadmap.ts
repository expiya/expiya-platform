import {
  APPLIANCES_LANDING_PACK,
  CARS_LANDING_PACK,
  ELECTRONICS_LANDING_PACK,
} from "@/features/xpy/departmentLandingPacks";

interface ActiveRootDepartment {
  readonly id: string;
  readonly label: string;
  readonly state: "ACTIVE";
  readonly href: string;
}

interface FutureRootDepartment {
  readonly id: string;
  readonly label: string;
  readonly state: "FUTURE";
  readonly authority: {
    readonly source: string;
    readonly decision: string;
  };
}

export type RootDepartment = ActiveRootDepartment | FutureRootDepartment;

export const ROOT_DEPARTMENTS = [
  { id: APPLIANCES_LANDING_PACK.departmentId, label: "Ev ürünleri", state: "ACTIVE", href: APPLIANCES_LANDING_PACK.canonicalPath },
  { id: CARS_LANDING_PACK.departmentId, label: "Otomobil", state: "ACTIVE", href: CARS_LANDING_PACK.canonicalPath },
  { id: ELECTRONICS_LANDING_PACK.departmentId, label: "Elektronik", state: "ACTIVE", href: ELECTRONICS_LANDING_PACK.canonicalPath },
  {
    id: "HOTELS", label: "Oteller", state: "FUTURE",
    authority: {
      source: "docs/audits/WU-PLATFORM-ROOT-FUTURE-DEPARTMENTS-UX-CORRECTION-01.md",
      decision: "User-approved future top-level Expiya department; presentation only, without route or runtime authority.",
    },
  },
  {
    id: "EVENTS", label: "Etkinlikler", state: "FUTURE",
    authority: {
      source: "docs/audits/WU-PLATFORM-ROOT-FUTURE-DEPARTMENTS-UX-CORRECTION-01.md",
      decision: "User-approved future top-level Expiya department; presentation only, without route or runtime authority.",
    },
  },
] as const satisfies readonly RootDepartment[];
