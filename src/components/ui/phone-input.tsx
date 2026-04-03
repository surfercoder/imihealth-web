"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

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

type CountryData = {
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

export const COUNTRIES: CountryData[] = [
  {
    code: "AR",
    name: "Argentina",
    dialCode: "+54",
    flag: "🇦🇷",
    placeholder: "9 261 688 6005",
    subscriberRegex: /^9\d{10}$/,
    buildE164: (s) => `+54${s.replace(/\D/g, "")}`,
    formatHint: "9 [área] [7 dígitos] — ej: 9 261 688 6005",
  },
  {
    code: "US",
    name: "United States",
    dialCode: "+1",
    flag: "🇺🇸",
    placeholder: "555 123 4567",
    subscriberRegex: /^\d{10}$/,
    buildE164: (s) => `+1${s.replace(/\D/g, "")}`,
    formatHint: "[area] [7 digits] — e.g. 555 123 4567",
  },
  {
    code: "CA",
    name: "Canada",
    dialCode: "+1",
    flag: "🇨🇦",
    placeholder: "416 123 4567",
    subscriberRegex: /^\d{10}$/,
    buildE164: (s) => `+1${s.replace(/\D/g, "")}`,
    formatHint: "[area] [7 digits] — e.g. 416 123 4567",
  },
  {
    code: "MX",
    name: "México",
    dialCode: "+52",
    flag: "🇲🇽",
    placeholder: "55 1234 5678",
    subscriberRegex: /^\d{10}$/,
    buildE164: (s) => `+52${s.replace(/\D/g, "")}`,
    formatHint: "[lada] [8 dígitos] — ej: 55 1234 5678",
  },
  {
    code: "BR",
    name: "Brasil",
    dialCode: "+55",
    flag: "🇧🇷",
    placeholder: "11 9 1234 5678",
    subscriberRegex: /^\d{2}9\d{8}$/,
    buildE164: (s) => `+55${s.replace(/\D/g, "")}`,
    formatHint: "[DDD] 9 [8 dígitos] — ex: 11 9 1234 5678",
  },
  {
    code: "CL",
    name: "Chile",
    dialCode: "+56",
    flag: "🇨🇱",
    placeholder: "9 1234 5678",
    subscriberRegex: /^9\d{8}$/,
    buildE164: (s) => `+56${s.replace(/\D/g, "")}`,
    formatHint: "9 [8 dígitos] — ej: 9 1234 5678",
  },
  {
    code: "CO",
    name: "Colombia",
    dialCode: "+57",
    flag: "🇨🇴",
    placeholder: "301 234 5678",
    subscriberRegex: /^3\d{9}$/,
    buildE164: (s) => `+57${s.replace(/\D/g, "")}`,
    formatHint: "3xx [7 dígitos] — ej: 301 234 5678",
  },
  {
    code: "PE",
    name: "Perú",
    dialCode: "+51",
    flag: "🇵🇪",
    placeholder: "912 345 678",
    subscriberRegex: /^9\d{8}$/,
    buildE164: (s) => `+51${s.replace(/\D/g, "")}`,
    formatHint: "9xx [6 dígitos] — ej: 912 345 678",
  },
  {
    code: "UY",
    name: "Uruguay",
    dialCode: "+598",
    flag: "🇺🇾",
    placeholder: "9 123 4567",
    subscriberRegex: /^9\d{7}$/,
    buildE164: (s) => `+598${s.replace(/\D/g, "")}`,
    formatHint: "9 [7 dígitos] — ej: 9 123 4567",
  },
  {
    code: "PY",
    name: "Paraguay",
    dialCode: "+595",
    flag: "🇵🇾",
    placeholder: "981 123 456",
    subscriberRegex: /^9\d{8}$/,
    buildE164: (s) => `+595${s.replace(/\D/g, "")}`,
    formatHint: "9xx [6 dígitos] — ej: 981 123 456",
  },
  {
    code: "BO",
    name: "Bolivia",
    dialCode: "+591",
    flag: "🇧🇴",
    placeholder: "71234567",
    subscriberRegex: /^[67]\d{7}$/,
    buildE164: (s) => `+591${s.replace(/\D/g, "")}`,
    formatHint: "[6|7] [7 dígitos] — ej: 71234567",
  },
  {
    code: "VE",
    name: "Venezuela",
    dialCode: "+58",
    flag: "🇻🇪",
    placeholder: "412 123 4567",
    subscriberRegex: /^4\d{9}$/,
    buildE164: (s) => `+58${s.replace(/\D/g, "")}`,
    formatHint: "4xx [7 dígitos] — ej: 412 123 4567",
  },
  {
    code: "EC",
    name: "Ecuador",
    dialCode: "+593",
    flag: "🇪🇨",
    placeholder: "99 123 4567",
    subscriberRegex: /^9\d{8}$/,
    buildE164: (s) => `+593${s.replace(/\D/g, "")}`,
    formatHint: "9x [7 dígitos] — ej: 99 123 4567",
  },
  {
    code: "CR",
    name: "Costa Rica",
    dialCode: "+506",
    flag: "🇨🇷",
    placeholder: "8312 3456",
    subscriberRegex: /^[68]\d{7}$/,
    buildE164: (s) => `+506${s.replace(/\D/g, "")}`,
    formatHint: "[6|8]xxx xxxx — ej: 8312 3456",
  },
  {
    code: "PA",
    name: "Panamá",
    dialCode: "+507",
    flag: "🇵🇦",
    placeholder: "6123 4567",
    subscriberRegex: /^6\d{7}$/,
    buildE164: (s) => `+507${s.replace(/\D/g, "")}`,
    formatHint: "6xxx xxxx — ej: 6123 4567",
  },
  {
    code: "DO",
    name: "Rep. Dominicana",
    dialCode: "+1",
    flag: "🇩🇴",
    placeholder: "809 123 4567",
    subscriberRegex: /^(809|829|849)\d{7}$/,
    buildE164: (s) => `+1${s.replace(/\D/g, "")}`,
    formatHint: "[809|829|849] [7 dígitos]",
  },
  {
    code: "GT",
    name: "Guatemala",
    dialCode: "+502",
    flag: "🇬🇹",
    placeholder: "5123 4567",
    subscriberRegex: /^[45]\d{7}$/,
    buildE164: (s) => `+502${s.replace(/\D/g, "")}`,
    formatHint: "[4|5]xxx xxxx — ej: 5123 4567",
  },
  {
    code: "HN",
    name: "Honduras",
    dialCode: "+504",
    flag: "🇭🇳",
    placeholder: "9123 4567",
    subscriberRegex: /^[39]\d{7}$/,
    buildE164: (s) => `+504${s.replace(/\D/g, "")}`,
    formatHint: "[3|9]xxx xxxx — ej: 9123 4567",
  },
  {
    code: "NI",
    name: "Nicaragua",
    dialCode: "+505",
    flag: "🇳🇮",
    placeholder: "8123 4567",
    subscriberRegex: /^[578]\d{7}$/,
    buildE164: (s) => `+505${s.replace(/\D/g, "")}`,
    formatHint: "[5|7|8]xxx xxxx — ej: 8123 4567",
  },
  {
    code: "SV",
    name: "El Salvador",
    dialCode: "+503",
    flag: "🇸🇻",
    placeholder: "7123 4567",
    subscriberRegex: /^[67]\d{7}$/,
    buildE164: (s) => `+503${s.replace(/\D/g, "")}`,
    formatHint: "[6|7]xxx xxxx — ej: 7123 4567",
  },
  {
    code: "CU",
    name: "Cuba",
    dialCode: "+53",
    flag: "🇨🇺",
    placeholder: "5123 4567",
    subscriberRegex: /^5\d{7}$/,
    buildE164: (s) => `+53${s.replace(/\D/g, "")}`,
    formatHint: "5xxx xxxx — ej: 5123 4567",
  },
  {
    code: "ES",
    name: "España",
    dialCode: "+34",
    flag: "🇪🇸",
    placeholder: "612 345 678",
    subscriberRegex: /^[67]\d{8}$/,
    buildE164: (s) => `+34${s.replace(/\D/g, "")}`,
    formatHint: "[6|7]xx xxx xxx — ej: 612 345 678",
  },
  {
    code: "GB",
    name: "United Kingdom",
    dialCode: "+44",
    flag: "🇬🇧",
    placeholder: "7700 900123",
    subscriberRegex: /^7\d{9}$/,
    buildE164: (s) => `+44${s.replace(/\D/g, "")}`,
    formatHint: "7xxx xxxxxx — e.g. 7700 900123",
  },
  {
    code: "DE",
    name: "Deutschland",
    dialCode: "+49",
    flag: "🇩🇪",
    placeholder: "151 2345 6789",
    subscriberRegex: /^1[5-7]\d{9,10}$/,
    buildE164: (s) => `+49${s.replace(/\D/g, "")}`,
    formatHint: "1[5-7]x xxxxxxxx — z.B. 151 2345 6789",
  },
  {
    code: "FR",
    name: "France",
    dialCode: "+33",
    flag: "🇫🇷",
    placeholder: "6 12 34 56 78",
    subscriberRegex: /^[67]\d{8}$/,
    buildE164: (s) => `+33${s.replace(/\D/g, "")}`,
    formatHint: "[6|7] xx xx xx xx — ex: 6 12 34 56 78",
  },
  {
    code: "IT",
    name: "Italia",
    dialCode: "+39",
    flag: "🇮🇹",
    placeholder: "312 345 6789",
    subscriberRegex: /^3\d{9,10}$/,
    buildE164: (s) => `+39${s.replace(/\D/g, "")}`,
    formatHint: "3xx xxx xxxx — es: 312 345 6789",
  },
  {
    code: "PT",
    name: "Portugal",
    dialCode: "+351",
    flag: "🇵🇹",
    placeholder: "912 345 678",
    subscriberRegex: /^9[1236]\d{7}$/,
    buildE164: (s) => `+351${s.replace(/\D/g, "")}`,
    formatHint: "9[1|2|3|6] xxxxxxx — ex: 912 345 678",
  },
  {
    code: "AU",
    name: "Australia",
    dialCode: "+61",
    flag: "🇦🇺",
    placeholder: "412 345 678",
    subscriberRegex: /^4\d{8}$/,
    buildE164: (s) => `+61${s.replace(/\D/g, "")}`,
    formatHint: "4xx xxx xxx — e.g. 412 345 678",
  },
  {
    code: "JP",
    name: "Japan",
    dialCode: "+81",
    flag: "🇯🇵",
    placeholder: "90 1234 5678",
    subscriberRegex: /^[789]0\d{8}$/,
    buildE164: (s) => `+81${s.replace(/\D/g, "")}`,
    formatHint: "[7|8|9]0 xxxx xxxx — e.g. 90 1234 5678",
  },
  {
    code: "CN",
    name: "China",
    dialCode: "+86",
    flag: "🇨🇳",
    placeholder: "131 2345 6789",
    subscriberRegex: /^1[3-9]\d{9}$/,
    buildE164: (s) => `+86${s.replace(/\D/g, "")}`,
    formatHint: "1[3-9]x xxxx xxxx — e.g. 131 2345 6789",
  },
];

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
  if (typeof navigator === "undefined") {
    return COUNTRIES.find((c) => c.code === "AR")!;
  }
  const languages = navigator.languages?.length
    ? navigator.languages
    : [navigator.language];

  for (const lang of languages) {
    const region = lang.split("-")[1]?.toUpperCase();
    if (region && LOCALE_TO_COUNTRY[region]) {
      const country = COUNTRIES.find(
        (c) => c.code === LOCALE_TO_COUNTRY[region]
      );
      if (country) return country;
    }
    const primary = lang.split("-")[0].toUpperCase();
    if (LOCALE_TO_COUNTRY[primary]) {
      const country = COUNTRIES.find(
        (c) => c.code === LOCALE_TO_COUNTRY[primary]
      );
      if (country) return country;
    }
  }

  return COUNTRIES.find((c) => c.code === "AR")!;
}

export type PhoneInputValue = {
  countryCode: CountryCode;
  subscriber: string;
  /** Full E.164 number, e.g. +5492616886005 */
  e164: string;
};

type PhoneInputProps = {
  value?: PhoneInputValue;
  onChange?: (value: PhoneInputValue) => void;
  onBlur?: () => void;
  disabled?: boolean;
  id?: string;
  searchPlaceholder?: string;
  noCountryFound?: string;
};

export function PhoneInput({
  value,
  onChange,
  onBlur,
  disabled,
  id,
  searchPlaceholder = "Search country…",
  noCountryFound = "No country found.",
}: PhoneInputProps) {
  const [open, setOpen] = React.useState(false);

  const defaultCountry = React.useMemo(() => detectCountryFromLocale(), []);

  const countryCode = value?.countryCode;
  const selectedCountry = React.useMemo(
    () =>
      countryCode
        ? (COUNTRIES.find((c) => c.code === countryCode) ?? defaultCountry)
        : defaultCountry,
    [countryCode, defaultCountry]
  );

  const subscriber = value?.subscriber ?? "";

  function handleCountrySelect(country: CountryData) {
    setOpen(false);
    onChange?.({
      countryCode: country.code,
      subscriber,
      e164: country.buildE164(subscriber),
    });
  }

  function handleSubscriberChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    onChange?.({
      countryCode: selectedCountry.code,
      subscriber: raw,
      e164: selectedCountry.buildE164(raw),
    });
  }

  return (
    <div className="flex gap-0">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-controls="phone-country-listbox"
            aria-expanded={open}
            disabled={disabled}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-r-none border-r-0 px-2.5 font-normal bg-popover text-popover-foreground hover:bg-muted border-border"
          >
            <span className="text-base leading-none">{selectedCountry.flag}</span>
            <span className="text-sm tabular-nums">
              {selectedCountry.dialCode}
            </span>
            <ChevronsUpDown className="size-3.5 shrink-0 opacity-40" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command style={{ overflow: "visible" }}>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList id="phone-country-listbox" style={{ maxHeight: "224px", overflowY: "auto" }}>
              <CommandEmpty>{noCountryFound}</CommandEmpty>
              <CommandGroup>
                {COUNTRIES.map((country) => (
                  <CommandItem
                    key={`${country.code}-${country.dialCode}`}
                    value={`${country.name} ${country.dialCode} ${country.code}`}
                    onSelect={() => handleCountrySelect(country)}
                    className="flex items-center gap-2 px-3 py-2 cursor-pointer aria-selected:bg-muted aria-selected:text-popover-foreground data-[selected=true]:bg-muted data-[selected=true]:text-popover-foreground"
                  >
                    <span className="text-lg leading-none">{country.flag}</span>
                    <span className="flex-1 truncate text-sm text-popover-foreground">{country.name}</span>
                    <span className="ml-auto text-xs font-mono text-muted-foreground tabular-nums">
                      {country.dialCode}
                    </span>
                    <Check
                      className={cn(
                        "ml-1 size-3.5 shrink-0 text-primary",
                        selectedCountry.code === country.code
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Input
        id={id}
        type="tel"
        inputMode="numeric"
        placeholder={selectedCountry.placeholder}
        value={subscriber}
        onChange={handleSubscriberChange}
        onBlur={onBlur}
        disabled={disabled}
        className="rounded-l-none"
      />
    </div>
  );
}

