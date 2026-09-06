import { requireXpyDomainPack } from "@/features/xpy/domainPacks";
import { bindXpyRuntime } from "@/features/xpy/runtimeContract";
import type { AppliancesProductType } from "./contracts";

export const appliancesRuntimeBinding = (productType: AppliancesProductType) => bindXpyRuntime(requireXpyDomainPack("APPLIANCES"), productType);
