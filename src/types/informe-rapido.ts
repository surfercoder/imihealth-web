import { z } from "zod";
import {
  informeRapidoRowSchema,
  informeRapidoStatusSchema,
} from "@/schemas/informe-rapido";

export type InformeRapido = z.infer<typeof informeRapidoRowSchema>;
export type InformeRapidoStatus = z.infer<typeof informeRapidoStatusSchema>;
