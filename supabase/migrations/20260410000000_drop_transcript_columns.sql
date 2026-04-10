-- Remove transcript columns from informes (no longer displayed or needed after report generation)
ALTER TABLE informes
  DROP COLUMN IF EXISTS transcript,
  DROP COLUMN IF EXISTS transcript_dialog,
  DROP COLUMN IF EXISTS transcript_type;

-- Remove transcript column from informes_rapidos
ALTER TABLE informes_rapidos
  DROP COLUMN IF EXISTS transcript;
