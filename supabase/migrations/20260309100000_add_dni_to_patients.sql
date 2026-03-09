-- Add dni column to patients table
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS dni TEXT DEFAULT NULL;
