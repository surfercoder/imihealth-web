import { z } from "zod";
import {
  enterpriseLeadRowSchema,
  enterpriseLeadCreateSchema,
} from "@/schemas/enterprise-lead";

export type EnterpriseLead = z.infer<typeof enterpriseLeadRowSchema>;
export type EnterpriseLeadInput = z.infer<typeof enterpriseLeadCreateSchema>;
