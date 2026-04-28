-- Add tagline column to doctors table.
-- Optional short professional tagline (1-2 sentences) shown under the
-- doctor's name on signed outputs (informes, certificados, pedidos).
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT NULL;
