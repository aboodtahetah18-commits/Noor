ALTER TABLE public.decision_requests
  ADD COLUMN IF NOT EXISTS decision_reference text;

ALTER TABLE public.execution_tasks
  ADD COLUMN IF NOT EXISTS decision_reference text;

ALTER TABLE public.execution_events
  ADD COLUMN IF NOT EXISTS decision_reference text;

ALTER TABLE public.evidence_cases
  ADD COLUMN IF NOT EXISTS decision_reference text;

UPDATE public.decision_requests
SET decision_reference = 'DEC-' || id::text
WHERE decision_reference IS NULL;

UPDATE public.execution_tasks t
SET decision_reference = r.decision_reference
FROM public.decision_requests r
WHERE t.decision_request_id = r.id
  AND t.user_id = r.user_id
  AND t.decision_reference IS NULL;

UPDATE public.execution_events e
SET decision_reference = t.decision_reference
FROM public.execution_tasks t
WHERE e.execution_task_id = t.id
  AND e.user_id = t.user_id
  AND e.decision_reference IS NULL;

UPDATE public.evidence_cases ec
SET decision_reference = e.decision_reference
FROM public.execution_events e
WHERE ec.execution_event_id = e.id
  AND ec.user_id = e.user_id
  AND ec.decision_reference IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS decision_requests_user_reference_uidx
  ON public.decision_requests(user_id, decision_reference)
  WHERE decision_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS execution_tasks_user_reference_idx
  ON public.execution_tasks(user_id, decision_reference);

CREATE INDEX IF NOT EXISTS execution_events_user_reference_idx
  ON public.execution_events(user_id, decision_reference);

CREATE INDEX IF NOT EXISTS evidence_cases_user_reference_idx
  ON public.evidence_cases(user_id, decision_reference);
