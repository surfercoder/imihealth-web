-- Add email and phone columns to doctors table
ALTER TABLE public.doctors
  ADD COLUMN IF NOT EXISTS email TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT NULL;

-- Update email from auth.users metadata
UPDATE public.doctors
SET email = auth.users.email
FROM auth.users
WHERE doctors.id = auth.users.id;

-- Update phone from auth.users raw_user_meta_data
UPDATE public.doctors
SET phone = (auth.users.raw_user_meta_data->>'phone')::TEXT
FROM auth.users
WHERE doctors.id = auth.users.id
  AND auth.users.raw_user_meta_data->>'phone' IS NOT NULL;
