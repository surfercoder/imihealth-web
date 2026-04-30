import { z } from "zod";
import {
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/schemas/auth";

export type LoginFormValues = z.infer<typeof loginSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export type ActionResult =
  | { error: string; success?: never; initPoint?: never }
  | { success: true; error?: never; initPoint?: string };
