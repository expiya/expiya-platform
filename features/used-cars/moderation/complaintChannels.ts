export const usedCarsComplaintChannels = Object.freeze({
  internet: Object.freeze({ route: "/ikinciel/destek/ilan-sikayeti", productionIntakeEnabled: false as const }),
  phone: Object.freeze({ number: null, placeholder: "PRODUCTION_DESTEK_TELEFONU_BELİRLENECEK", productionIntakeEnabled: false as const }),
  realEmailSmsPhoneNotificationAuthorized: false as const,
});

export function assessComplaintChannelReadiness() {
  const missing = [!usedCarsComplaintChannels.internet.route ? "INTERNET_CHANNEL_REQUIRED" : null, !usedCarsComplaintChannels.phone.number ? "PHONE_NUMBER_REQUIRED" : null].filter((code): code is string => Boolean(code));
  return Object.freeze({ ready: missing.length === 0, missing: Object.freeze(missing), productionIntakeAuthorized: false as const, realNotificationAuthorized: false as const });
}
