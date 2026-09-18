CREATE OR REPLACE FUNCTION governance.start_monitoring_run(
  p_decision_id uuid,
  p_user_id uuid
) RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  v_decision governance.decisions%ROWTYPE;
  v_case_id uuid;
  v_case_type text;
  v_case_status text;
  v_version integer;
  v_profile uuid;
  v_run uuid;
  v_verified_execution boolean;
BEGIN
  SELECT * INTO v_decision
  FROM governance.decisions
  WHERE id=p_decision_id
    AND user_id=p_user_id
    AND decision_status IN ('APPROVED_LOCKED','ACTIVE','REVALIDATION_REQUIRED');

  IF v_decision.id IS NULL THEN
    RAISE EXCEPTION 'NAMAA_MONITORING_DECISION_NOT_ELIGIBLE';
  END IF;

  SELECT c.id,c.case_type,c.current_status,c.version
    INTO v_case_id,v_case_type,v_case_status,v_version
  FROM governance.cases c
  WHERE c.id=v_decision.case_id AND c.user_id=p_user_id;

  IF v_case_id IS NULL THEN
    RAISE EXCEPTION 'NAMAA_MONITORING_CASE_NOT_FOUND';
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM governance.execution_monitoring em
    WHERE em.decision_id=p_decision_id
      AND em.user_id=p_user_id
      AND em.latest_execution_event_status='VERIFIED_EXECUTION'
      AND em.matched_evidence_count>0
  ) INTO v_verified_execution;

  IF NOT v_verified_execution THEN
    RAISE EXCEPTION 'NAMAA_MONITORING_VERIFIED_EXECUTION_REQUIRED';
  END IF;

  IF v_decision.success_criteria IS NULL
     OR v_decision.success_criteria IN ('{}'::jsonb,'[]'::jsonb) THEN
    RAISE EXCEPTION 'NAMAA_MONITORING_SUCCESS_CRITERIA_REQUIRED';
  END IF;

  IF v_decision.review_date IS NULL THEN
    RAISE EXCEPTION 'NAMAA_MONITORING_REVIEW_DATE_REQUIRED';
  END IF;

  IF v_case_status NOT IN ('MONITORING','EARLY_WARNING','REVIEW_REQUIRED') THEN
    RAISE EXCEPTION 'NAMAA_MONITORING_CASE_STATE_INVALID';
  END IF;

  SELECT id INTO v_profile
  FROM governance.monitoring_profiles
  WHERE is_active=true
    AND (case_type_pattern=v_case_type OR case_type_pattern='*')
  ORDER BY (case_type_pattern=v_case_type) DESC,version DESC
  LIMIT 1;

  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'NAMAA_MONITORING_PROFILE_NOT_FOUND';
  END IF;

  INSERT INTO governance.monitoring_runs(
    decision_id,case_id,user_id,case_version,profile_id
  ) VALUES(
    p_decision_id,v_case_id,p_user_id,v_version,v_profile
  ) RETURNING id INTO v_run;

  RETURN v_run;
END
$function$;

CREATE OR REPLACE FUNCTION governance.record_case_outcome(
  p_case_id uuid,
  p_user_id uuid,
  p_decision_id uuid,
  p_outcome_status text,
  p_expected_result jsonb,
  p_actual_result jsonb,
  p_success_criteria_result jsonb,
  p_failure_criteria_result jsonb,
  p_cause_class text,
  p_confidence numeric,
  p_assessed_by text
) RETURNS uuid
LANGUAGE plpgsql
AS $function$
DECLARE
  v_case governance.cases%ROWTYPE;
  v_dec governance.decisions%ROWTYPE;
  v_expected jsonb;
  v_actual jsonb;
  v_actual_amount numeric;
  v_id uuid;
  v_verified_execution boolean;
BEGIN
  SELECT * INTO v_case
  FROM governance.cases
  WHERE id=p_case_id AND user_id=p_user_id
  FOR UPDATE;

  IF NOT FOUND OR v_case.current_status<>'OUTCOME_ASSESSMENT' THEN
    RAISE EXCEPTION 'NAMAA_OUTCOME_CASE_NOT_READY';
  END IF;

  SELECT * INTO v_dec
  FROM governance.decisions
  WHERE id=p_decision_id
    AND user_id=p_user_id
    AND case_id=p_case_id;

  IF NOT FOUND OR v_dec.decision_status='DRAFT' THEN
    RAISE EXCEPTION 'NAMAA_OUTCOME_DECISION_INVALID';
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM governance.execution_monitoring em
    WHERE em.decision_id=p_decision_id
      AND em.user_id=p_user_id
      AND em.latest_execution_event_status='VERIFIED_EXECUTION'
      AND em.matched_evidence_count>0
  ) INTO v_verified_execution;

  IF NOT v_verified_execution THEN
    RAISE EXCEPTION 'NAMAA_OUTCOME_VERIFIED_EXECUTION_REQUIRED';
  END IF;

  IF v_dec.review_date IS NULL OR now()<v_dec.review_date THEN
    RAISE EXCEPTION 'NAMAA_OUTCOME_MEASUREMENT_WINDOW_NOT_MATURE';
  END IF;

  v_expected:=jsonb_build_object(
    'approved_amount',v_dec.approved_amount,
    'risk_level_after_expected',v_dec.risk_level_after_expected,
    'success_criteria',v_dec.success_criteria,
    'failure_criteria',v_dec.failure_criteria,
    'partial_success_criteria',v_dec.partial_success_criteria,
    'review_date',v_dec.review_date,
    'decision_locked_at',v_dec.locked_at
  );

  v_actual:=COALESCE(p_actual_result,'{}'::jsonb);

  IF jsonb_typeof(v_actual->'actual_amount')='number' THEN
    v_actual_amount:=(v_actual->>'actual_amount')::numeric;
  ELSE
    v_actual_amount:=NULL;
  END IF;

  IF p_outcome_status<>'INCONCLUSIVE'
     AND (v_actual='{}'::jsonb OR COALESCE(p_confidence,0)<=0) THEN
    RAISE EXCEPTION 'NAMAA_OUTCOME_EVIDENCE_REQUIRED';
  END IF;

  INSERT INTO governance.case_outcomes(
    case_id,decision_id,user_id,case_version,outcome_status,
    expected_amount,actual_amount,financial_variance,
    expected_result,actual_result,
    success_criteria_result,failure_criteria_result,
    cause_class,assessment_confidence,assessed_by,
    policy_version,algorithm_version,parameter_version
  ) VALUES(
    p_case_id,p_decision_id,p_user_id,v_case.version,p_outcome_status,
    v_dec.approved_amount,
    v_actual_amount,
    CASE
      WHEN v_actual_amount IS NULL OR v_dec.approved_amount IS NULL THEN NULL
      ELSE v_actual_amount-v_dec.approved_amount
    END,
    v_expected,
    v_actual,
    COALESCE(p_success_criteria_result,'[]'::jsonb),
    COALESCE(p_failure_criteria_result,'[]'::jsonb),
    p_cause_class,p_confidence,p_assessed_by,
    v_dec.policy_version,v_dec.algorithm_version,v_dec.parameter_version
  ) RETURNING id INTO v_id;

  PERFORM governance.emit_case_event(
    p_case_id,p_user_id,'CASE_OUTCOME_RECORDED','OUTCOME_ENGINE',
    jsonb_build_object(
      'outcome_id',v_id,
      'decision_id',p_decision_id,
      'outcome_status',p_outcome_status,
      'case_version',v_case.version
    )
  );

  PERFORM governance.transition_case_v2(
    p_case_id,p_user_id,'SETTLEMENT',
    'Outcome recorded after measurement window',
    'OUTCOME_ENGINE','SYSTEM',NULL
  );

  RETURN v_id;
END
$function$;
