import { z } from "zod";
import {
  subscriptionRowSchema,
  planTierSchema,
  proPlanTierSchema,
  subscriptionStatusSchema,
} from "@/schemas/subscription";

export type Subscription = z.infer<typeof subscriptionRowSchema>;
export type PlanTier = z.infer<typeof planTierSchema>;
export type ProPlanTier = z.infer<typeof proPlanTierSchema>;
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;

export interface PlanInfo {
  plan: PlanTier;
  status: SubscriptionStatus;
  isPro: boolean;
  isReadOnly: boolean;
  periodEnd: string | null;
  maxInformes: number;
  currentInformes: number;
  canCreateInforme: boolean;
  maxDoctors: number;
  currentDoctors: number;
  canSignUp: boolean;
}
