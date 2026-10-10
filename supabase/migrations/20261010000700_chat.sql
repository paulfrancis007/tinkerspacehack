begin;

create function public.send_message(
  p_journey_id uuid,
  p_conversation_id uuid,
  p_body text,
  p_nonce uuid
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_message_id uuid;
  v_trimmed_body text;
  v_membership record;
  v_existing record;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  v_trimmed_body := trim(p_body);
  if char_length(v_trimmed_body) < 1 or char_length(v_trimmed_body) > 2000 then
    raise exception 'Message must be between 1 and 2000 characters';
  end if;

  -- Enforce quota (20 per minute)
  if not private.consume_rate('send_message_min', 20, 60) then
    raise exception 'Rate limit exceeded (20 per min)';
  end if;
  -- Enforce quota (200 per hour)
  if not private.consume_rate('send_message_hr', 200, 3600) then
    raise exception 'Rate limit exceeded (200 per hour)';
  end if;

  if p_conversation_id is null then
    -- Lounge message
    select * into v_membership from public.memberships 
    where journey_id = p_journey_id and user_id = v_user_id and left_at is null;
    
    if not found then raise exception 'Not in journey'; end if;
    if not v_membership.lounge_consent then
      raise exception 'Must consent to lounge chat before posting';
    end if;
  else
    -- DM message
    if not private.can_dm(p_conversation_id, v_user_id) then
      raise exception 'Cannot send direct message to this conversation';
    end if;
  end if;

  -- Idempotency check using stable nonce
  insert into public.messages (journey_id, conversation_id, sender_id, client_nonce, body)
  values (p_journey_id, p_conversation_id, v_user_id, p_nonce, v_trimmed_body)
  on conflict (sender_id, client_nonce) do update set body = excluded.body
  returning id into v_message_id;

  return v_message_id;
end;
$$;

create function public.set_reaction(
  p_message_id uuid,
  p_emoji text,
  p_active boolean
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  if p_emoji not in ('👍','💚','😂','✨','🚀') then
    raise exception 'Invalid emoji';
  end if;

  if not private.consume_rate('reaction', 30, 60) then
    raise exception 'Rate limit exceeded for reactions';
  end if;

  if not private.can_read_message(p_message_id, v_user_id) then
    raise exception 'Cannot read or react to this message';
  end if;

  insert into public.reactions (message_id, user_id, emoji, active, updated_at)
  values (p_message_id, v_user_id, p_emoji, p_active, now())
  on conflict (message_id, user_id, emoji)
  do update set active = excluded.active, updated_at = now();
end;
$$;

create function public.delete_own_message(p_message_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := auth.uid();
  if v_user_id is null then raise exception 'Not authenticated'; end if;

  update public.messages
  set deleted_at = now(), body = '' -- Clear body on delete
  where id = p_message_id and sender_id = v_user_id and deleted_at is null;
end;
$$;

revoke all on function public.send_message from public, anon;
grant execute on function public.send_message to authenticated;

revoke all on function public.set_reaction from public, anon;
grant execute on function public.set_reaction to authenticated;

revoke all on function public.delete_own_message from public, anon;
grant execute on function public.delete_own_message to authenticated;

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.reactions;

commit;
