BEGIN;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS reversal_reason text;

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_reversal_reason_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_reversal_reason_check
  CHECK (
    (status <> 'REVERSED')
    OR (reversed_at IS NOT NULL AND reversal_reason IS NOT NULL AND length(trim(reversal_reason)) >= 3)
  );

CREATE INDEX IF NOT EXISTS idx_transactions_user_status_date
  ON public.transactions(user_id, status, transaction_date DESC, created_at DESC);

COMMIT;
