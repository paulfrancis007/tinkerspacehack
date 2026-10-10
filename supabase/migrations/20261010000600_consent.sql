begin;

-- Connection Request
create function public.request_connection(p_recipient_id uuid) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid;
  v_journey_id uuid;
  v_recipient_membership record;
  v_user_a uuid;
  v_user_b uuid;
  v_existing record;
  v_conversation_id uuid;
begin
  v_sender_id := auth.uid();
  if v_sender_id is null then raise exception 'Not authenticated'; end if;
  if v_sender_id = p_recipient_id then raise exception 'Cannot request yourself'; end if;

  if not private.consume_rate('request_connection', 5, 600) then
    raise exception 'Rate limit exceeded for connection requests';
  end if;

  -- 1. Active same-journey membership
  select journey_id into v_journey_id from public.memberships 
    where user_id = v_sender_id and left_at is null;
  if v_journey_id is null then raise exception 'You are not in an active journey'; end if;

  -- 2. Quiet-mode / discovery checks
  select * into v_recipient_membership from public.memberships
    where user_id = p_recipient_id and journey_id = v_journey_id and left_at is null;
  if not found then raise exception 'Recipient is not in this journey'; end if;
  if not v_recipient_membership.discoverable or v_recipient_membership.social_mode = 'quiet' then
    raise exception 'Recipient is not accepting requests';
  end if;

  -- 3. Bilateral block check
  if private.blocked(v_sender_id, p_recipient_id) then
    raise exception 'Cannot interact with this user';
  end if;

  -- Canonical pair ordering
  v_user_a := least(v_sender_id, p_recipient_id);
  v_user_b := greatest(v_sender_id, p_recipient_id);

  -- 4. Cooldown and idempotency
  select * into v_existing from public.conversations 
    where journey_id = v_journey_id and user_a = v_user_a and user_b = v_user_b
    for update;

  if found then
    if v_existing.status = 'accepted' then
      return v_existing.id; -- Idempotent success if already connected
    end if;

    if v_existing.status = 'pending' then
      if v_existing.requested_by = v_sender_id then
        return v_existing.id; -- Idempotent pending
      else
        raise exception 'You already have a pending request from this user';
      end if;
    end if;

    if v_existing.status in ('declined', 'revoked') then
      if v_existing.updated_at > now() - interval '10 minutes' then
        raise exception 'Cooldown active. Please wait before requesting again.';
      end if;
    end if;

    update public.conversations 
    set status = 'pending', requested_by = v_sender_id, updated_at = now()
    where id = v_existing.id
    returning id into v_conversation_id;
  else
    insert into public.conversations (journey_id, user_a, user_b, requested_by, status)
    values (v_journey_id, v_user_a, v_user_b, v_sender_id, 'pending')
    returning id into v_conversation_id;
  end if;

  return v_conversation_id;
end;
$$;

-- Respond Connection
create function public.respond_connection(p_conversation_id uuid, p_accept boolean) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_conv record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  select * into v_conv from public.conversations where id = p_conversation_id for update;
  if not found then raise exception 'Conversation not found'; end if;

  -- Recipient-only acceptance
  if v_user_id not in (v_conv.user_a, v_conv.user_b) or v_conv.requested_by = v_user_id then
    raise exception 'Unauthorized to respond to this request';
  end if;

  if v_conv.status != 'pending' then
    return; -- Idempotent return
  end if;

  if private.blocked(v_conv.user_a, v_conv.user_b) then
    raise exception 'Cannot interact with this user';
  end if;

  update public.conversations 
  set status = case when p_accept then 'accepted' else 'declined' end,
      updated_at = now()
  where id = p_conversation_id;
end;
$$;

-- Revoke Connection
create function public.revoke_connection(p_conversation_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
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
end;
$$;

-- Block User
create function public.block_user(p_target_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;
  if v_user_id = p_target_id then raise exception 'Cannot block yourself'; end if;

  insert into public.blocks (blocker_id, blocked_id)
  values (v_user_id, p_target_id)
  on conflict do nothing;

  -- Blocking revokes existing conversations now
  update public.conversations
  set status = 'revoked', updated_at = now()
  where (user_a = v_user_id and user_b = p_target_id)
     or (user_a = p_target_id and user_b = v_user_id);
     
  -- (Future: cancel active calls/games here)
end;
$$;

-- Unblock User
create function public.unblock_user(p_target_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  delete from public.blocks 
  where blocker_id = v_user_id and blocked_id = p_target_id;
  
  -- Unblocking does not reaccept consent; conversation stays revoked.
end;
$$;

-- Report Target
create function public.report_target(p_target_type text, p_target_id uuid, p_reason text) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_journey_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  if not private.consume_rate('report', 5, 3600) then
    raise exception 'Rate limit exceeded for reports';
  end if;

  -- Validate target exists based on type, extract journey context if available
  if p_target_type = 'user' then
    if not exists(select 1 from public.profiles where id = p_target_id) then
      raise exception 'User not found';
    end if;
  elsif p_target_type = 'message' then
    select journey_id into v_journey_id from public.messages where id = p_target_id;
    if v_journey_id is null then raise exception 'Message not found'; end if;
  -- (Future: drop, call)
  end if;

  insert into public.reports (reporter_id, target_type, target_id, reason, journey_id)
  values (v_user_id, p_target_type, p_target_id, p_reason, v_journey_id);
end;
$$;

revoke all on function public.request_connection from public, anon;
grant execute on function public.request_connection to authenticated;

revoke all on function public.respond_connection from public, anon;
grant execute on function public.respond_connection to authenticated;

revoke all on function public.revoke_connection from public, anon;
grant execute on function public.revoke_connection to authenticated;

revoke all on function public.block_user from public, anon;
grant execute on function public.block_user to authenticated;

revoke all on function public.unblock_user from public, anon;
grant execute on function public.unblock_user to authenticated;

revoke all on function public.report_target from public, anon;
grant execute on function public.report_target to authenticated;

-- Publish conversations for participant-only updates
alter publication supabase_realtime add table public.conversations;

commit;
