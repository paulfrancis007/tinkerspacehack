begin;

create or replace function public.get_my_friends() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
  v_result jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select jsonb_agg(
    jsonb_build_object(
      'conversation_id', c.id,
      'journey_id', c.journey_id,
      'friend_id', case when c.user_a = v_user_id then c.user_b else c.user_a end,
      'alias', m.alias,
      'avatar_seed', m.avatar_seed,
      'connected_at', c.updated_at
    )
  )
  into v_result
  from public.conversations c
  join public.memberships m on m.journey_id = c.journey_id and m.user_id = case when c.user_a = v_user_id then c.user_b else c.user_a end
  where (c.user_a = v_user_id or c.user_b = v_user_id)
    and c.status = 'accepted';

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

revoke all on function public.get_my_friends() from public, anon;
grant execute on function public.get_my_friends() to authenticated;

commit;
