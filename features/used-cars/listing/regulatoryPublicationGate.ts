import { evaluateIettsBranchGate, type IettsBranchVerification } from "../dealer/iettsVerification";
import { evaluateEidsPublicationGate, type EidsVehicleAuthorization } from "./eidsVehicleAuthorization";
import { validateRegulatoryListingFields, type RegulatoryListingFields } from "./regulatoryFields";

export function evaluateRegulatoryPublicationGate(input: { readonly tenantId: string; readonly branchId: string; readonly listingId: string; readonly inventoryUnitId: string; readonly now: string; readonly ietts: IettsBranchVerification | null; readonly eids: EidsVehicleAuthorization | null; readonly fields: RegulatoryListingFields }) {
  const ietts = evaluateIettsBranchGate({ verification: input.ietts, tenantId: input.tenantId, branchId: input.branchId, now: input.now });
  const eids = evaluateEidsPublicationGate({ authorization: input.eids, listingId: input.listingId, inventoryUnitId: input.inventoryUnitId, tenantId: input.tenantId, branchId: input.branchId, now: input.now });
  const fields = validateRegulatoryListingFields(input.fields, input.eids, input.now);
  const codes = [...ietts.codes, ...eids.codes, ...fields.codes];
  return Object.freeze({ gatePassed: codes.length === 0, codes: Object.freeze(codes), iettsGatePassed: ietts.gatePassed, eidsGatePassed: eids.gatePassed, mandatoryFieldsPassed: fields.publishable, controlledEidsLabel: eids.controlledVerificationLabel, officialEidsLogoUseAuthorized: false as const, productionPublicationAuthorized: false as const, productionMutationAuthorized: false as const });
}
