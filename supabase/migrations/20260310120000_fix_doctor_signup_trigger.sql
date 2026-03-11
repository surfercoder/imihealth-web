-- Fix the doctor signup trigger to use the correct function
-- The on_auth_user_created trigger was calling handle_new_doctor() which only
-- populated email/phone fields, but didn't create the doctor record.
-- It should call handle_new_user() which creates the doctor record with all metadata.

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_doctor_created ON public.doctors;
DROP FUNCTION IF EXISTS public.handle_new_doctor();

-- Recreate the trigger with the correct function
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
