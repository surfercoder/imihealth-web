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
import type { CountryCode, CountryData, PhoneInputValue } from "./phone-input/types";
import { COUNTRIES } from "./phone-input/countries";
import { detectCountryFromLocale } from "./phone-input/locale";

export type { CountryCode, PhoneInputValue };
export { COUNTRIES, detectCountryFromLocale };

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
