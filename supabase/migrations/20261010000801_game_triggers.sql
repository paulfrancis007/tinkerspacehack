begin;

create or replace function public.block_user(p_target_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;
  if v_user_id = p_target_id then raise exception 'Cannot block yourself'; end if;

  insert into public.blocks (blocker_id, blocked_id)
  values (v_user_id, p_target_id)
  on conflict do nothing;

  update public.conversations
  set status = 'revoked', updated_at = now()
  where (user_a = v_user_id and user_b = p_target_id)
     or (user_a = p_target_id and user_b = v_user_id);
     
  -- Abandon active games between the two
  update public.games
  set status = 'abandoned', finished_at = now()
  where status in ('invited', 'active')
    and ((x_id = v_user_id and o_id = p_target_id) or (x_id = p_target_id and o_id = v_user_id));
end;
$$;

create or replace function public.revoke_connection(p_conversation_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  update public.conversations
  set status = 'revoked', updated_at = now()
  where id = p_conversation_id 
    and v_user_id in (user_a, user_b)
    and status in ('pending', 'accepted');

  -- Abandon active games for this conversation
  update public.games
  set status = 'abandoned', finished_at = now()
  where conversation_id = p_conversation_id
    and status in ('invited', 'active');
end;
$$;

create or replace function public.leave_journey(p_journey_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  update public.memberships
  set left_at = now()
  where journey_id = p_journey_id 
    and user_id = v_user_id
    and left_at is null;

  -- Abandon all active games in this journey for this user
  update public.games
  set status = 'abandoned', finished_at = now()
  where journey_id = p_journey_id
    and status in ('invited', 'active')
    and v_user_id in (x_id, o_id);
end;
$$;

commit;
