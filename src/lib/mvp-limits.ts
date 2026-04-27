// MAX_INFORMES_PER_DOCTOR is the Free plan informe quota. Pro is unlimited.
// MAX_DOCTORS is a global signup cap left over from MVP testing — will be
// removed when paid plans go live.

export const MVP_LIMITS = {
  MAX_DOCTORS: Number(process.env.MVP_MAX_DOCTORS ?? 20),
  MAX_INFORMES_PER_DOCTOR: Number(process.env.MVP_MAX_INFORMES_PER_DOCTOR ?? 10),
} as const;
