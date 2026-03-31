"use client";

import { useState, useActionState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { updateProfile } from "@/actions/profile";
import { ESPECIALIDADES } from "@/schemas/auth";
import {
  Loader2,
  ChevronsUpDown,
  Check,
  User,
  Stethoscope,
  Phone,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SignatureField } from "@/components/signature-field";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import Image from "next/image";

interface DoctorProfile {
  name: string;
  email: string;
  dni: string;
  matricula: string;
  phone: string;
  especialidad: string;
  firma_digital: string | null;
}

interface ProfileFormProps {
  doctor: DoctorProfile;
}

type ProfileFormValues = {
  name: string;
  dni: string;
  matricula: string;
  phone: string;
  especialidad: string;
  firmaDigital?: string;
};

export function ProfileForm({ doctor }: ProfileFormProps) {
  const t = useTranslations("profilePage");
  const tSignup = useTranslations("signupForm");
  const v = useTranslations("validation");
  const [especialidadOpen, setEspecialidadOpen] = useState(false);
  const [state, formAction] = useActionState(updateProfile, null);
  const [isPending, startTransition] = useTransition();
  const [signatureChanged, setSignatureChanged] = useState(false);

  const clientSchema = z.object({
    name: z.string().min(2, v("nameMin")),
    dni: z.string().refine(
      (val) => val === "" || /^\d{7,8}$/.test(val),
      { message: v("dniFormat") }
    ),
    matricula: z
      .string()
      .min(1, v("matriculaRequired"))
      .regex(/^\d+$/, v("matriculaFormat")),
    phone: z.string().min(1, v("phoneRequired")),
    especialidad: z
      .string()
      .min(1, v("specialtyRequired"))
      .refine((val) => (ESPECIALIDADES as readonly string[]).includes(val), {
        message: v("specialtyInvalid"),
      }),
    firmaDigital: z.string().optional(),
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(clientSchema) as never,
    defaultValues: {
      name: doctor.name || "",
      dni: doctor.dni || "",
      matricula: doctor.matricula || "",
      phone: doctor.phone || "",
      especialidad: doctor.especialidad || "",
      firmaDigital: undefined,
    },
  });

  function onSubmit(values: ProfileFormValues) {
    const formData = new FormData();
    formData.set("name", values.name);
    formData.set("dni", values.dni || "");
    formData.set("matricula", values.matricula);
    formData.set("phone", values.phone);
    formData.set("especialidad", values.especialidad);
    if (signatureChanged) {
      formData.set("firmaDigital", values.firmaDigital ?? "");
    }
    startTransition(() => {
      formAction(formData);
      toast.success(t("saveSuccess"));
    });
  }

  return (
    <div className="space-y-6">
      {/* Profile header card */}
      <Card>
        <CardContent className="flex items-center gap-4 py-6">
          <div className="flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
            <User className="size-8" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{doctor.name || t("unnamed")}</h2>
            <p className="text-sm text-muted-foreground">{doctor.especialidad}</p>
            <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="size-3" />
                {doctor.email}
              </span>
              {doctor.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3" />
                  {doctor.phone}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("editTitle")}</CardTitle>
          <CardDescription>{t("editDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-6"
              noValidate
            >
              {/* Personal info section */}
              <div>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="size-4" />
                  {t("personalInfo")}
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tSignup("fullName")}</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            placeholder={tSignup("fullNamePlaceholder")}
                            autoComplete="name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dni"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tSignup("dni")}</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder={tSignup("dniPlaceholder")}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {/* Email - disabled */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      {tSignup("email")}
                    </label>
                    <Input
                      type="email"
                      value={doctor.email}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{tSignup("phone")}</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+54 11 1234-5678"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <p className="col-span-1 text-xs text-muted-foreground -mt-2">
                    {t("emailDisabledHint")}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Professional info section */}
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
                                className={cn(
                                  "border-input bg-transparent flex h-9 w-full items-center justify-between rounded-md border px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none",
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

              <Separator />

              {/* Signature section */}
              <div>
                <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                  {t("signatureSection")}
                </h3>
                {doctor.firma_digital && !signatureChanged && (
                  <div className="mb-4 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      {t("currentSignature")}
                    </p>
                    <div className="overflow-hidden rounded-md border border-border bg-white p-2">
                      <Image
                        src={doctor.firma_digital}
                        alt={t("signatureAlt")}
                        width={300}
                        height={100}
                        className="h-auto max-h-24 w-auto"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSignatureChanged(true)}
                    >
                      {t("changeSignature")}
                    </Button>
                  </div>
                )}
                {(!doctor.firma_digital || signatureChanged) && (
                  <FormField
                    control={form.control}
                    name="firmaDigital"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormControl>
                          <SignatureField
                            onChange={(dataUrl) => {
                              field.onChange(dataUrl);
                              setSignatureChanged(true);
                            }}
                            error={fieldState.error?.message}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </div>

              {/* Error display */}
              {state?.error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {state.error}
                </p>
              )}

              {/* Submit */}
              <div className="flex justify-end">
                <Button type="submit" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      {t("saving")}
                    </>
                  ) : (
                    t("save")
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
