begin;

alter table public.calls add column client_nonce uuid;
alter table public.calls add constraint calls_nonce_unique unique(caller_id, client_nonce);

create function public.request_call(
  p_conversation_id uuid,
  p_kind text,
  p_nonce uuid
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
  v_conv record;
  v_callee_id uuid;
  v_callee_membership record;
  v_call_id uuid;
  v_user_a uuid;
  v_user_b uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  if p_kind not in ('audio', 'video') then
    raise exception 'Invalid call kind';
  end if;

  if not private.consume_rate('call_invite', 3, 300) then
    raise exception 'Rate limit exceeded for calls';
  end if;

  select * into v_conv from public.conversations where id = p_conversation_id;
  if not found or v_conv.status != 'accepted' then
    raise exception 'Must have an active conversation to call';
  end if;

  if v_user_id not in (v_conv.user_a, v_conv.user_b) then
    raise exception 'Unauthorized';
  end if;

  if private.blocked(v_conv.user_a, v_conv.user_b) then
    raise exception 'Cannot interact with this user';
  end if;

  v_callee_id := case when v_conv.user_a = v_user_id then v_conv.user_b else v_conv.user_a end;

  -- Check quiet mode
  select * into v_callee_membership from public.memberships
    where user_id = v_callee_id and journey_id = v_conv.journey_id and left_at is null;
  
  if not found or v_callee_membership.social_mode = 'quiet' then
    raise exception 'Recipient is not accepting calls (Quiet Mode)';
  end if;

  -- Enforce sorted order for reservations to prevent deadlocks
  v_user_a := least(v_user_id, v_callee_id);
  v_user_b := greatest(v_user_id, v_callee_id);

  -- Clean up stale reservations before trying
  delete from private.call_reservations where lease_until < now();

  -- Attempt to reserve A
  begin
    insert into private.call_reservations(user_id, call_id, lease_until)
    values (v_user_a, '00000000-0000-0000-0000-000000000000', now() + interval '30 seconds');
  exception when unique_violation then
    -- Check if it's the exact same nonce being retried
    select id into v_call_id from public.calls where caller_id = v_user_id and client_nonce = p_nonce;
    if found then return v_call_id; end if;
    raise exception 'User is already in a call';
  end;

  -- Attempt to reserve B
  begin
    insert into private.call_reservations(user_id, call_id, lease_until)
    values (v_user_b, '00000000-0000-0000-0000-000000000000', now() + interval '30 seconds');
  exception when unique_violation then
    delete from private.call_reservations where user_id = v_user_a and call_id = '00000000-0000-0000-0000-000000000000';
    select id into v_call_id from public.calls where caller_id = v_user_id and client_nonce = p_nonce;
    if found then return v_call_id; end if;
    raise exception 'User is already in a call';
  end;

  -- Insert call
  insert into public.calls (conversation_id, caller_id, callee_id, kind, room_name, expires_at, client_nonce)
  values (p_conversation_id, v_user_id, v_callee_id, p_kind, 'room_' || gen_random_uuid(), now() + interval '30 seconds', p_nonce)
  returning id into v_call_id;

  -- Update reservations with actual call ID
  update private.call_reservations set call_id = v_call_id where user_id in (v_user_a, v_user_b) and call_id = '00000000-0000-0000-0000-000000000000';

  return v_call_id;
end;
$$;

create function public.respond_call(p_call_id uuid, p_decision text, p_expected_version integer) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
  v_call record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select * into v_call from public.calls where id = p_call_id for update;
  if not found then raise exception 'Call not found'; end if;

  if v_call.callee_id != v_user_id then
    raise exception 'Only recipient can respond';
  end if;

  if v_call.version != p_expected_version then
    raise exception 'Version mismatch';
  end if;

  if v_call.status != 'ringing' then
    if v_call.status = p_decision then return; end if;
    raise exception 'Call is no longer ringing';
  end if;

  if v_call.expires_at < now() then
    update public.calls set status = 'missed', ended_at = now(), version = version + 1 where id = p_call_id;
    delete from private.call_reservations where call_id = p_call_id;
    raise exception 'Call expired';
  end if;

  if p_decision = 'accepted' then
    update public.calls 
    set status = 'active', accepted_at = now(), version = version + 1, expires_at = now() + interval '1 hour'
    where id = p_call_id;
    update private.call_reservations set lease_until = now() + interval '1 hour' where call_id = p_call_id;
  elsif p_decision = 'rejected' then
    update public.calls 
    set status = 'rejected', ended_at = now(), version = version + 1 
    where id = p_call_id;
    delete from private.call_reservations where call_id = p_call_id;
  else
    raise exception 'Invalid decision';
  end if;
end;
$$;

create function public.cancel_call(p_call_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
  v_call record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select * into v_call from public.calls where id = p_call_id for update;
  if not found then return; end if;

  if v_call.caller_id != v_user_id then
    raise exception 'Only caller can cancel';
  end if;

  if v_call.status = 'ringing' then
    update public.calls 
    set status = 'cancelled', ended_at = now(), version = version + 1 
    where id = p_call_id;
    delete from private.call_reservations where call_id = p_call_id;
  end if;
end;
$$;

create function public.end_call(p_call_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user_id uuid;
  v_call record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select * into v_call from public.calls where id = p_call_id for update;
  if not found then return; end if;

  if v_user_id not in (v_call.caller_id, v_call.callee_id) then
    raise exception 'Unauthorized';
  end if;

  if v_call.status = 'active' then
    update public.calls 
    set status = 'ended', ended_at = now(), end_reason = p_reason, version = version + 1 
    where id = p_call_id;
    delete from private.call_reservations where call_id = p_call_id;

    -- Add to outbox for cleanup
    insert into private.media_cleanup(call_id) values (p_call_id) on conflict do nothing;
  end if;
end;
$$;

revoke all on function public.request_call from public, anon;
grant execute on function public.request_call to authenticated;
revoke all on function public.respond_call from public, anon;
grant execute on function public.respond_call to authenticated;
revoke all on function public.cancel_call from public, anon;
grant execute on function public.cancel_call to authenticated;
revoke all on function public.end_call from public, anon;
grant execute on function public.end_call to authenticated;

alter publication supabase_realtime add table public.calls;

-- Update the game triggers to also end calls on block/leave/revoke
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
     
  update public.games
  set status = 'abandoned', finished_at = now()
  where status in ('invited', 'active')
    and ((x_id = v_user_id and o_id = p_target_id) or (x_id = p_target_id and o_id = v_user_id));

  with active_calls as (
    update public.calls set status = 'ended', ended_at = now(), end_reason = 'blocked', version = version + 1
    where status in ('ringing', 'accepted', 'active')
      and ((caller_id = v_user_id and callee_id = p_target_id) or (caller_id = p_target_id and callee_id = v_user_id))
    returning id
  )
  insert into private.media_cleanup (call_id) select id from active_calls on conflict do nothing;
  
  delete from private.call_reservations 
  where call_id in (select id from public.calls where status = 'ended');
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

  update public.games
  set status = 'abandoned', finished_at = now()
  where conversation_id = p_conversation_id
    and status in ('invited', 'active');

  with active_calls as (
    update public.calls set status = 'ended', ended_at = now(), end_reason = 'revoked', version = version + 1
    where status in ('ringing', 'accepted', 'active') and conversation_id = p_conversation_id
    returning id
  )
  insert into private.media_cleanup (call_id) select id from active_calls on conflict do nothing;

  delete from private.call_reservations 
  where call_id in (select id from public.calls where status = 'ended');
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

  update public.games
  set status = 'abandoned', finished_at = now()
  where journey_id = p_journey_id
    and status in ('invited', 'active')
    and v_user_id in (x_id, o_id);

  with active_calls as (
    update public.calls c set status = 'ended', ended_at = now(), end_reason = 'left_journey', version = version + 1
    from public.conversations v
    where c.conversation_id = v.id and v.journey_id = p_journey_id
      and c.status in ('ringing', 'accepted', 'active')
      and v_user_id in (c.caller_id, c.callee_id)
    returning c.id
  )
  insert into private.media_cleanup (call_id) select id from active_calls on conflict do nothing;

  delete from private.call_reservations 
  where call_id in (select id from public.calls where status = 'ended');
end;
$$;

commit;
