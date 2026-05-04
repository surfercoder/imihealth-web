import { z } from "zod";

export const planTierSchema = z.enum(["free", "pro_monthly", "pro_yearly"]);
export const proPlanTierSchema = z.enum(["pro_monthly", "pro_yearly"]);
export const subscriptionStatusSchema = z.enum([
  "active",
  "cancelled",
  "past_due",
  "pending",
]);

export const subscriptionRowSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  plan: planTierSchema,
  status: subscriptionStatusSchema,
  mp_preapproval_id: z.string().nullable(),
  mp_payer_id: z.string().nullable(),
  current_period_start: z.string().nullable(),
  current_period_end: z.string().nullable(),
  cancelled_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
