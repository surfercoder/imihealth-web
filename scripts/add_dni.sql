-- Migration: Add dni column to patients table
-- Run this in the Supabase SQL Editor.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS dni TEXT DEFAULT NULL;
