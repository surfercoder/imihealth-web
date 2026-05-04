import { z } from "zod";
import {
  doctorRowSchema,
  doctorProfileUpdateSchema,
} from "@/schemas/doctor";

export type Doctor = z.infer<typeof doctorRowSchema>;
export type DoctorProfileUpdateInput = z.infer<typeof doctorProfileUpdateSchema>;
