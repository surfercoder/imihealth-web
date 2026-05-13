import type { CountryCode, CountryData } from "./types";
import { COUNTRIES } from "./countries";

const COUNTRIES_BY_CODE: Map<CountryCode, CountryData> = new Map(
  COUNTRIES.map((c) => [c.code, c]),
);

/** Maps navigator.language / Intl country codes to our CountryCode */
const LOCALE_TO_COUNTRY: Record<string, CountryCode> = {
  AR: "AR",
  US: "US",
  CA: "CA",
  MX: "MX",
  BR: "BR",
  CL: "CL",
  CO: "CO",
  PE: "PE",
  UY: "UY",
  PY: "PY",
  BO: "BO",
  VE: "VE",
  EC: "EC",
  CR: "CR",
  PA: "PA",
  DO: "DO",
  GT: "GT",
  HN: "HN",
  NI: "NI",
  SV: "SV",
  CU: "CU",
  ES: "ES",
  GB: "GB",
  DE: "DE",
  FR: "FR",
  IT: "IT",
  PT: "PT",
  AU: "AU",
  JP: "JP",
  CN: "CN",
};

export function detectCountryFromLocale(): CountryData {
  const fallback = COUNTRIES_BY_CODE.get("AR")!;
  if (typeof navigator === "undefined") return fallback;

  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const lang of languages) {
    const region = lang.split("-")[1]?.toUpperCase();
    if (region && LOCALE_TO_COUNTRY[region]) {
      const country = COUNTRIES_BY_CODE.get(LOCALE_TO_COUNTRY[region]);
      if (country) return country;
    }
    const primary = lang.split("-")[0].toUpperCase();
    if (LOCALE_TO_COUNTRY[primary]) {
      const country = COUNTRIES_BY_CODE.get(LOCALE_TO_COUNTRY[primary]);
      if (country) return country;
    }
  }

  return fallback;
}
