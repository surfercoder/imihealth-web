import { z } from "zod";
import {
  informGenerationLogRowSchema,
  informTypeSchema,
} from "@/schemas/inform-generation-log";

export type InformGenerationLog = z.infer<typeof informGenerationLogRowSchema>;
export type InformType = z.infer<typeof informTypeSchema>;
