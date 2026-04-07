import {
  COUNTRIES,
  type CountryCode,
  type PhoneInputValue,
} from "@/components/ui/phone-input";

export type PatientFormValues = {
  name: string;
  dni: string;
  dob?: string;
  phone?: PhoneInputValue;
  email?: string;
};

export const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [
  CountryCode,
  ...CountryCode[],
];

export interface NuevoInformeDialogProps {
  fullWidth?: boolean;
  variant?: "default" | "outline";
}
