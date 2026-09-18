ALTER TABLE public.evidence_cases
  ADD COLUMN IF NOT EXISTS verification_reason text,
  ADD COLUMN IF NOT EXISTS candidate_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS matched_statement_row_id uuid;

CREATE INDEX IF NOT EXISTS evidence_cases_matched_statement_row_idx
  ON public.evidence_cases(matched_statement_row_id)
  WHERE matched_statement_row_id IS NOT NULL;
