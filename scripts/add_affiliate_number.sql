-- Migration: Add affiliate_number column to patients table
-- Run this in the Supabase SQL Editor.

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS affiliate_number TEXT DEFAULT NULL;
