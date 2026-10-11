begin;

create function public.get_pending_requests(p_journey_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
  v_result jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'requested_by', c.requested_by,
      'alias', m.alias,
      'avatar_seed', m.avatar_seed
    )
  )
  into v_result
  from public.conversations c
  join public.memberships m on m.journey_id = c.journey_id and m.user_id = c.requested_by
  where c.journey_id = p_journey_id
    and c.status = 'pending'
    and c.requested_by != v_user_id
    and v_user_id in (c.user_a, c.user_b);

  return coalesce(v_result, '[]'::jsonb);
end;
$$;

revoke all on function public.get_pending_requests(uuid) from public, anon;
grant execute on function public.get_pending_requests(uuid) to authenticated;

commit;
