-- Drop affiliate_number column from patients table (not part of MVP)
ALTER TABLE public.patients
  DROP COLUMN IF EXISTS affiliate_number;
