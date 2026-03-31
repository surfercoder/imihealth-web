/**
 * MVP plan limits.
 *
 * When moving to production with real subscription plans,
 * replace these constants with values fetched from the
 * plan/subscription system.
 */

export const MVP_LIMITS = {
  MAX_DOCTORS: 15,
  MAX_INFORMES_PER_DOCTOR: 10,
} as const;
