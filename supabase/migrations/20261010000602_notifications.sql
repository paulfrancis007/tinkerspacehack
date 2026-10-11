begin;

create or replace function public.get_notifications(p_journey_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
  v_conn jsonb;
  v_games jsonb;
  v_result jsonb := '[]'::jsonb;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select jsonb_agg(
    jsonb_build_object(
      'type', 'connection',
      'id', c.id,
      'sender_id', c.requested_by,
      'alias', m.alias,
      'avatar_seed', m.avatar_seed
    )
  )
  into v_conn
  from public.conversations c
  join public.memberships m on m.journey_id = c.journey_id and m.user_id = c.requested_by
  where c.journey_id = p_journey_id
    and c.status = 'pending'
    and c.requested_by != v_user_id
    and v_user_id in (c.user_a, c.user_b);

  select jsonb_agg(
    jsonb_build_object(
      'type', 'game',
      'id', g.id,
      'conversation_id', g.conversation_id,
      'sender_id', g.x_id,
      'alias', m.alias,
      'avatar_seed', m.avatar_seed
    )
  )
  into v_games
  from public.games g
  join public.conversations c on c.id = g.conversation_id
  join public.memberships m on m.journey_id = c.journey_id and m.user_id = g.x_id
  where c.journey_id = p_journey_id
    and g.status = 'invited'
    and g.o_id = v_user_id
    and g.expires_at > now();

  v_result := coalesce(v_conn, '[]'::jsonb) || coalesce(v_games, '[]'::jsonb);
  return v_result;
end;
$$;

revoke all on function public.get_notifications(uuid) from public, anon;
grant execute on function public.get_notifications(uuid) to authenticated;

commit;
