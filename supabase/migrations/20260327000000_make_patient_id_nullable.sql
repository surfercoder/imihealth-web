-- Make patient_id nullable to support quick reports without patient data
ALTER TABLE informes ALTER COLUMN patient_id DROP NOT NULL;
