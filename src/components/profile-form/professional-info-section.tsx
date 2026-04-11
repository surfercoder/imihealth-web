"use client";

import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { ChevronsUpDown, Check, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type { ProfileFormValues } from "./schema";

interface ProfessionalInfoSectionProps {
  form: UseFormReturn<ProfileFormValues>;
}

export function ProfessionalInfoSection({ form }: ProfessionalInfoSectionProps) {
  const t = useTranslations("profilePage");
  const tSignup = useTranslations("signupForm");
  const [especialidadOpen, setEspecialidadOpen] = useState(false);

  return (
    <div>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Stethoscope className="size-4" />
        {t("professionalInfo")}
      </h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="matricula"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{tSignup("matricula")}</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder={tSignup("matriculaPlaceholder")}
                  disabled
                  className="bg-muted"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="especialidad"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{tSignup("specialty")}</FormLabel>
              <Popover
                open={especialidadOpen}
                onOpenChange={setEspecialidadOpen}
              >
                <PopoverTrigger asChild>
                  <FormControl>
                    <button
                      type="button"
                      role="combobox"
                      aria-controls="especialidad-list"
                      aria-expanded={especialidadOpen}
                      disabled
                      className={cn(
                        "border-input bg-muted flex h-9 w-full cursor-not-allowed items-center justify-between rounded-md border px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none",
                        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                        field.value
                          ? "text-card-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      {field.value || tSignup("specialtyPlaceholder")}
                      <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
                    </button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command className="bg-white text-card-foreground">
                    <CommandInput
                      placeholder={tSignup("searchSpecialty")}
                      className="text-card-foreground placeholder:text-muted-foreground"
                    />
                    <CommandList id="especialidad-list">
                      <CommandEmpty className="text-muted-foreground">
                        {tSignup("specialtyNotFound")}
                      </CommandEmpty>
                      <CommandGroup>
                        {ESPECIALIDADES.map((esp) => (
                          <CommandItem
                            key={esp}
                            value={esp}
                            className="text-card-foreground data-[selected=true]:bg-muted data-[selected=true]:text-card-foreground"
                            /* v8 ignore next 4 */
                            onSelect={(val) => {
                              field.onChange(val);
                              setEspecialidadOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-4",
                                field.value === esp
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {esp}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
