-- ============================================================
-- IMI Full Cleanup Script
-- Deletes ALL app-generated data: storage files, informes,
-- patients, doctors, subscriptions, enterprise leads,
-- auth sessions, and auth users.
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- 1. Delete storage objects (bypass the protect_delete trigger)
SET LOCAL storage.allow_delete_query = 'true';
DELETE FROM storage.objects WHERE bucket_id = 'audio-recordings';

-- 2. Delete app data (order matters due to FK constraints)
DELETE FROM public.informes;
DELETE FROM public.informes_rapidos;
DELETE FROM public.inform_generation_log;
DELETE FROM public.patients;
DELETE FROM public.subscriptions;
DELETE FROM public.enterprise_leads;
DELETE FROM public.doctors;

-- 3. Delete auth sessions, flow state, and related tokens
DELETE FROM auth.refresh_tokens;
DELETE FROM auth.sessions;
DELETE FROM auth.mfa_amr_claims;
DELETE FROM auth.mfa_challenges;
DELETE FROM auth.mfa_factors;
DELETE FROM auth.one_time_tokens;
DELETE FROM auth.flow_state;
DELETE FROM auth.audit_log_entries;
DELETE FROM auth.identities;

-- 4. Delete auth users (doctors)
DELETE FROM auth.users;

-- Verify everything is clean
SELECT 'storage.objects (audio-recordings)' AS table_name, COUNT(*) AS remaining FROM storage.objects WHERE bucket_id = 'audio-recordings'
UNION ALL
SELECT 'public.informes',                    COUNT(*) FROM public.informes
UNION ALL
SELECT 'public.informes_rapidos',            COUNT(*) FROM public.informes_rapidos
UNION ALL
SELECT 'public.inform_generation_log',       COUNT(*) FROM public.inform_generation_log
UNION ALL
SELECT 'public.patients',                    COUNT(*) FROM public.patients
UNION ALL
SELECT 'public.subscriptions',               COUNT(*) FROM public.subscriptions
UNION ALL
SELECT 'public.enterprise_leads',            COUNT(*) FROM public.enterprise_leads
UNION ALL
SELECT 'public.doctors',                     COUNT(*) FROM public.doctors
UNION ALL
SELECT 'auth.flow_state',                    COUNT(*) FROM auth.flow_state
UNION ALL
SELECT 'auth.audit_log_entries',             COUNT(*) FROM auth.audit_log_entries
UNION ALL
SELECT 'auth.users',                         COUNT(*) FROM auth.users;
