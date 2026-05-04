import { z } from "zod";
import { pendingSignupRowSchema } from "@/schemas/pending-signup";

export type PendingSignup = z.infer<typeof pendingSignupRowSchema>;
