/**
 * MVP plan limits.
 *
 * Read from environment variables so they can be changed at runtime
 * without redeploying. Falls back to the original defaults.
 *
 * When moving to production with real subscription plans,
 * replace these with values fetched from the plan/subscription system.
 */

export const MVP_LIMITS = {
  MAX_DOCTORS: Number(process.env.MVP_MAX_DOCTORS ?? 20),
  MAX_INFORMES_PER_DOCTOR: Number(process.env.MVP_MAX_INFORMES_PER_DOCTOR ?? 10),
} as const;
