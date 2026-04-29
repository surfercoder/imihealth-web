-- Fix signup failing with "Database error saving new user" when DNI is omitted.
--
-- The signup form makes DNI optional, but the previous version of
-- handle_new_user() coalesced a missing DNI to '' and inserted it into
-- public.doctors. With a NOT NULL column and a UNIQUE index on dni,
-- the first DNI-less signup grabbed the '' slot and every subsequent
-- DNI-less signup collided on doctors_dni_idx (SQLSTATE 23505),
-- aborting the auth.users insert transaction.
--
-- Make dni nullable, backfill existing '' rows to NULL, and update the
-- trigger to insert NULL (via NULLIF) when DNI is missing. Postgres'
-- unique indexes already ignore NULLs, so no partial index is needed.

ALTER TABLE public.doctors ALTER COLUMN dni DROP NOT NULL;

UPDATE public.doctors SET dni = NULL WHERE dni = '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
AS $$
BEGIN
  INSERT INTO public.doctors (id, name, dni, matricula, phone, especialidad, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NULLIF(NEW.raw_user_meta_data->>'dni', ''),
    COALESCE(NEW.raw_user_meta_data->>'matricula', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'especialidad', ''),
    COALESCE(NEW.email, '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
