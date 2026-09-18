CREATE TABLE IF NOT EXISTS public.central_policy_parameters (
  parameter_id text PRIMARY KEY,
  domain text NOT NULL,
  setting_name text NOT NULL,
  numeric_value numeric,
  unit text,
  min_value numeric,
  max_value numeric,
  registry_file_id text NOT NULL,
  registry_sheet text NOT NULL,
  registry_status text NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.central_policy_parameters(
  parameter_id,domain,setting_name,numeric_value,unit,min_value,max_value,
  registry_file_id,registry_sheet,registry_status,synced_at
) VALUES
  ('SET-RC-001','المطابقة','هامش التاريخ',3,'أيام',0,7,
   '127Q4UTHRFTAWSoSYBeY6lSkq8LYd2s1wVgXldhrL1hQ','إعدادات السياسات','معتمد',now()),
  ('SET-RC-002','المطابقة','حد الثقة للمطابقة الآلية',95,'%',0,100,
   '127Q4UTHRFTAWSoSYBeY6lSkq8LYd2s1wVgXldhrL1hQ','إعدادات السياسات','معتمد',now())
ON CONFLICT (parameter_id) DO UPDATE SET
  domain=excluded.domain,
  setting_name=excluded.setting_name,
  numeric_value=excluded.numeric_value,
  unit=excluded.unit,
  min_value=excluded.min_value,
  max_value=excluded.max_value,
  registry_file_id=excluded.registry_file_id,
  registry_sheet=excluded.registry_sheet,
  registry_status=excluded.registry_status,
  synced_at=excluded.synced_at;
