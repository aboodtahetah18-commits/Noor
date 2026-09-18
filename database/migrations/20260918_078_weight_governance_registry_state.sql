ALTER TABLE public.central_policy_parameters
  ADD COLUMN IF NOT EXISTS text_value text;

INSERT INTO public.central_policy_parameters(
  parameter_id,domain,setting_name,text_value,unit,
  registry_file_id,registry_sheet,registry_status,synced_at
) VALUES (
  'إعداد-معايرة-١',
  'الأوزان',
  'حالة الأوزان قبل التحقق التاريخي',
  'خط أساس للمحاكاة وغير حاكم',
  'حالة',
  '127Q4UTHRFTAWSoSYBeY6lSkq8LYd2s1wVgXldhrL1hQ',
  'إعدادات السياسات',
  'معتمد',
  now()
)
ON CONFLICT (parameter_id) DO UPDATE SET
  domain=excluded.domain,
  setting_name=excluded.setting_name,
  text_value=excluded.text_value,
  unit=excluded.unit,
  registry_file_id=excluded.registry_file_id,
  registry_sheet=excluded.registry_sheet,
  registry_status=excluded.registry_status,
  synced_at=excluded.synced_at;
