begin;

alter table public.bank_statement_imports drop constraint if exists bank_statement_imports_file_type_chk;
alter table public.bank_statement_imports add constraint bank_statement_imports_file_type_chk check(file_type in ('CSV','XLSX','PDF','MESSAGE'));

commit;
