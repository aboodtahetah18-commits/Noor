BEGIN;
CREATE INDEX IF NOT EXISTS transactions_user_date_created_idx ON public.transactions(user_id, transaction_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS transactions_user_type_date_idx ON public.transactions(user_id, transaction_type, transaction_date DESC);
CREATE INDEX IF NOT EXISTS transactions_user_account_date_idx ON public.transactions(user_id, account_id, transaction_date DESC) WHERE account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS transactions_user_category_date_idx ON public.transactions(user_id, category_id, transaction_date DESC) WHERE category_id IS NOT NULL;
COMMIT;
