CREATE TABLE IF NOT EXISTS public.user_foundation_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  fact_key text NOT NULL,
  category text NOT NULL,
  value_json jsonb NOT NULL,
  source text NOT NULL DEFAULT 'USER_STATEMENT',
  confidence numeric NOT NULL DEFAULT 1 CHECK (confidence >= 0 AND confidence <= 1),
  verified_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  uses text[] NOT NULL DEFAULT '{}',
  requires_confirmation boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,fact_key)
);

CREATE INDEX IF NOT EXISTS user_foundation_facts_user_category_idx
  ON public.user_foundation_facts(user_id,category);

CREATE TABLE IF NOT EXISTS public.user_onboarding_state (
  user_id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'GATHERING',
  current_step text NOT NULL DEFAULT 'marital_status',
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_onboarding_state_status_chk
    CHECK (status IN ('GATHERING','READY','COMPLETED'))
);
