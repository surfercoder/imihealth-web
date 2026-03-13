/**
 * MVP plan limits.
 *
 * When moving to production with real subscription plans,
 * replace these constants with values fetched from the
 * plan/subscription system.
 */

export const MVP_LIMITS = {
  MAX_DOCTORS: 2,
  MAX_INFORMES_PER_DOCTOR: 7,
} as const;
