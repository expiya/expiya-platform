export const usedCarsExternalActionInvariant = Object.freeze({
  productionDeployment: false,
  productionDatabaseWrite: false,
  realDealerRegistration: false,
  publicListingPublication: false,
  realLeadTransfer: false,
  realEmailDelivery: false,
  realPaymentCollection: false,
  invoiceIssuance: false,
  liveChannelMessaging: false,
  liveVideoSession: false,
  aiSellerAgent: false,
  aiNegotiation: false,
  automatedScraping: false,
});

export function validateUsedCarsExternalActionInvariant(flags: Readonly<Record<keyof typeof usedCarsExternalActionInvariant, boolean>>) {
  const enabled = Object.entries(flags).filter(([, value]) => value).map(([key]) => key);
  return Object.freeze({ intact: enabled.length === 0, unexpectedlyEnabled: Object.freeze(enabled), externalActionAuthorized: false as const });
}
