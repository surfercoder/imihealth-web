export const FREE_PLAN_LIMITS = {
  MAX_INFORMES: Number(process.env.FREE_PLAN_MAX_INFORMES ?? 10),
} as const;
