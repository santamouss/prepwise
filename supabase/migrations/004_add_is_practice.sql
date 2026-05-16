-- Candidate B2C practice interviews (no proctoring checklist by default)
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS "isPractice" boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_interviews_is_practice
  ON interviews ("isPractice")
  WHERE "isPractice" = true;
