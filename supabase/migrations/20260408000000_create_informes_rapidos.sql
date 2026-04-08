-- Create informes_rapidos table for persisting quick reports.
-- Quick reports are not tied to a patient and only contain the doctor's
-- generated report (no patient-facing version). We persist them in their own
-- table to keep clean accounting between classic vs quick reports.

CREATE TABLE public.informes_rapidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'processing'
    CHECK (status = ANY (ARRAY['processing'::text, 'completed'::text, 'error'::text])),
  transcript text,
  informe_doctor text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX informes_rapidos_doctor_id_created_at_idx
  ON public.informes_rapidos (doctor_id, created_at DESC);

ALTER TABLE public.informes_rapidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY doctors_own_informes_rapidos ON public.informes_rapidos
  FOR ALL
  USING (doctor_id = (SELECT auth.uid()))
  WITH CHECK (doctor_id = (SELECT auth.uid()));

-- Enable Realtime so doctors get cross-device notifications when a quick
-- report finishes processing, mirroring the existing informes flow.
ALTER PUBLICATION supabase_realtime ADD TABLE public.informes_rapidos;
