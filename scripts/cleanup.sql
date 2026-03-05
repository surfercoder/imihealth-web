-- ============================================================
-- IMI Full Cleanup Script
-- Deletes ALL app-generated data: storage files, informes,
-- patients, auth sessions, and auth users (doctors).
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- 1. Delete storage objects (bypass the protect_delete trigger)
SET LOCAL storage.allow_delete_query = 'true';
DELETE FROM storage.objects WHERE bucket_id = 'audio-recordings';
DELETE FROM storage.objects WHERE bucket_id = 'informes-pdf';

-- 2. Delete app data (order matters due to FK constraints)
DELETE FROM public.informes;
DELETE FROM public.patients;

-- 3. Delete auth sessions and related tokens
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.sessions;
DELETE FROM auth.mfa_amr_claims;
DELETE FROM auth.mfa_challenges;
DELETE FROM auth.mfa_factors;
DELETE FROM auth.one_time_tokens;
DELETE FROM auth.identities;

-- 4. Delete auth users (doctors)
DELETE FROM auth.users;

-- Verify everything is clean
SELECT 'storage.objects (audio-recordings)' AS table_name, COUNT(*) AS remaining FROM storage.objects WHERE bucket_id = 'audio-recordings'
UNION ALL
SELECT 'storage.objects (informes-pdf)',     COUNT(*) FROM storage.objects WHERE bucket_id = 'informes-pdf'
UNION ALL
SELECT 'public.informes',                    COUNT(*) FROM public.informes
UNION ALL
SELECT 'public.patients',                    COUNT(*) FROM public.patients
UNION ALL
SELECT 'auth.users',                         COUNT(*) FROM auth.users;
