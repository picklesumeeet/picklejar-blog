-- Atomically sign a petition: insert the signature and increment the count.
-- SECURITY DEFINER so anon can bump `petitions.signature_count` (which the
-- normal RLS policy would refuse — only admins can update petitions directly).
-- The unique (petition_id, email) constraint prevents duplicate signatures;
-- caller sees a `23505` unique_violation error which the client can surface.

create or replace function public.sign_petition(petition_id uuid, signer_email citext)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into petition_signatures (petition_id, email)
  values (petition_id, signer_email);

  update petitions
     set signature_count = signature_count + 1
   where id = petition_id
  returning signature_count into new_count;

  if new_count is null then
    raise exception 'petition % not found', petition_id;
  end if;

  return new_count;
end;
$$;

revoke all on function public.sign_petition(uuid, citext) from public;
grant execute on function public.sign_petition(uuid, citext) to anon, authenticated;
