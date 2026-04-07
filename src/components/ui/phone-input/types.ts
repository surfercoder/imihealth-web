export type CountryCode =
  | "AR"
  | "US"
  | "MX"
  | "BR"
  | "CL"
  | "CO"
  | "PE"
  | "UY"
  | "PY"
  | "BO"
  | "VE"
  | "EC"
  | "CR"
  | "PA"
  | "DO"
  | "GT"
  | "HN"
  | "NI"
  | "SV"
  | "CU"
  | "ES"
  | "GB"
  | "DE"
  | "FR"
  | "IT"
  | "PT"
  | "CA"
  | "AU"
  | "JP"
  | "CN";

export type CountryData = {
  code: CountryCode;
  name: string;
  dialCode: string;
  flag: string;
  placeholder: string;
  /** Regex that validates only the subscriber part (after dial code + optional mobile prefix) */
  subscriberRegex: RegExp;
  /** Full E.164 builder: takes the raw subscriber input and returns the full number */
  buildE164: (subscriber: string) => string;
  /** Human-readable format hint */
  formatHint: string;
};

export type PhoneInputValue = {
  countryCode: CountryCode;
  subscriber: string;
  /** Full E.164 number, e.g. +5492616886005 */
  e164: string;
};
