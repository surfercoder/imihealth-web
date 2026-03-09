-- Add affiliate_number column to patients table
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS affiliate_number TEXT DEFAULT NULL;
