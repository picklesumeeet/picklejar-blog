-- Anon-callable unsubscribe. Deletes the subscriber row whose token matches.
-- SECURITY DEFINER because RLS lets only admins delete from subscribers.
-- Returns TRUE if a row was deleted, FALSE if the token didn't match anything.

create or replace function public.unsubscribe_by_token(token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  if token is null or length(token) = 0 then
    return false;
  end if;

  delete from subscribers where unsubscribe_token = token;
  get diagnostics deleted_count = row_count;
  return deleted_count > 0;
end;
$$;

revoke all on function public.unsubscribe_by_token(text) from public;
grant execute on function public.unsubscribe_by_token(text) to anon, authenticated;
