import { getRequestConfig } from "next-intl/server";
import { getUserLocale } from "@/lib/locale-server";

export default getRequestConfig(async () => {
  const locale = await getUserLocale();

  const common = (await import(`@/locales/${locale}/common.json`)).default;
  const auth = (await import(`@/locales/${locale}/auth.json`)).default;
  const dashboard = (await import(`@/locales/${locale}/dashboard.json`)).default;
  const patients = (await import(`@/locales/${locale}/patients.json`)).default;
  const appointments = (await import(`@/locales/${locale}/appointments.json`)).default;
  const billing = (await import(`@/locales/${locale}/billing.json`)).default;
  const users = (await import(`@/locales/${locale}/users.json`)).default;
  const pharmacy = (await import(`@/locales/${locale}/pharmacy.json`)).default;
  const profile = (await import(`@/locales/${locale}/profile.json`)).default;
  const validation = (await import(`@/locales/${locale}/validation.json`)).default;
  const errors = (await import(`@/locales/${locale}/errors.json`)).default;

  return {
    locale,
    messages: {
      common,
      auth,
      dashboard,
      patients,
      appointments,
      billing,
      users,
      pharmacy,
      profile,
      validation,
      errors,
    },
  };
});
