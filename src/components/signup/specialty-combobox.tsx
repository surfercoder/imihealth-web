"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { ChevronsUpDown, Check } from "lucide-react";
import { FormControl } from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ESPECIALIDADES } from "@/schemas/auth";
import { cn } from "@/lib/utils";

interface SpecialtyComboboxProps {
  field: { value: string; onChange: (value: string) => void };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SpecialtyCombobox({ field, open, onOpenChange }: SpecialtyComboboxProps) {
  const t = useTranslations("signupForm");

  const sortedSpecialties = useMemo(() =>
    [...ESPECIALIDADES]
      .map((key) => ({ key, label: t(`specialties.${key}`) }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [t]
  );

  const selectedLabel = field.value ? t(`specialties.${field.value}`) : "";

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <FormControl>
          <button
            type="button"
            role="combobox"
            aria-controls="especialidad-listbox"
            aria-expanded={open}
            className={cn(
              "border-input bg-transparent flex h-9 w-full items-center justify-between rounded-md border px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none",
              "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
              field.value ? "text-card-foreground" : "text-muted-foreground"
            )}
          >
            {selectedLabel || t("specialtyPlaceholder")}
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </button>
        </FormControl>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command className="bg-white text-card-foreground">
          <CommandInput placeholder={t("searchSpecialty")} className="text-card-foreground placeholder:text-muted-foreground" />
          <CommandList id="especialidad-listbox">
            <CommandEmpty className="text-muted-foreground">
              {t("specialtyNotFound")}
            </CommandEmpty>
            <CommandGroup>
              {sortedSpecialties.map(({ key, label }) => (
                <CommandItem
                  key={key}
                  value={label}
                  className="text-card-foreground data-[selected=true]:bg-muted data-[selected=true]:text-card-foreground"
                  onSelect={() => {
                    field.onChange(key);
                    onOpenChange(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      field.value === key ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
