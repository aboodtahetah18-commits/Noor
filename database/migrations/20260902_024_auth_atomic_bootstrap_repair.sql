begin;

-- Better Auth email/password users must own a credential account.
-- A previous neon-http signup could insert auth.user and fail before auth.account.
-- In this single-owner V1, such rows are incomplete bootstrap artifacts and cannot log in.
delete from auth."user" u
where not exists (select 1 from auth.account a where a.user_id = u.id)
  and not exists (select 1 from auth.session s where s.user_id = u.id);

commit;
