import { z } from "zod";
import {
  informeRowSchema,
  informeStatusSchema,
  certificadoOptionsSchema,
} from "@/schemas/informe";

export type Informe = z.infer<typeof informeRowSchema>;
export type InformeStatus = z.infer<typeof informeStatusSchema>;
export type CertificadoOptions = z.infer<typeof certificadoOptionsSchema>;
