import { z } from "zod";

export const pendingSignupRowSchema = z.object({
  id: z.string().uuid(),
  email: z.string(),
  encrypted_password: z.string(),
  signup_data: z.record(z.string(), z.unknown()),
  mp_preapproval_id: z.string().nullable(),
  created_at: z.string(),
});
