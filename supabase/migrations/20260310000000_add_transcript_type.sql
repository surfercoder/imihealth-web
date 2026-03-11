-- Add transcript_type column to informes table
ALTER TABLE informes ADD COLUMN IF NOT EXISTS transcript_type TEXT CHECK (transcript_type IN ('dialog', 'monologue'));

-- Set default to 'dialog' for existing records with transcript_dialog
UPDATE informes SET transcript_type = 'dialog' WHERE transcript_dialog IS NOT NULL AND transcript_type IS NULL;
