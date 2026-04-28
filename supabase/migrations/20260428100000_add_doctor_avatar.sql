-- Add avatar column to doctors table.
-- Stores a base64 data URL (image/jpeg) of the doctor's profile photo,
-- mirroring how firma_digital is persisted.
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT NULL;
