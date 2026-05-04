import { z } from "zod";

export const informTypeSchema = z.enum(["classic", "quick"]);

export const informGenerationLogRowSchema = z.object({
  id: z.string().uuid(),
  doctor_id: z.string().uuid(),
  inform_id: z.string().uuid(),
  inform_type: informTypeSchema,
  created_at: z.string(),
});
